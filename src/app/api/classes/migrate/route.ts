import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { sendBulkRepeatStudentSMS } from "@/lib/sms";
import { getSystemSettings } from "@/lib/settings";
import { recordMigrationSnapshot, SnapshotStudentItem } from "@/lib/class-migration-rollback";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sourceClassId, targetClassId, studentIds, isGraduation } = await request.json();

    if (!sourceClassId || (!targetClassId && !isGraduation)) {
      return NextResponse.json({ error: "Source and target class IDs or graduation flag are required" }, { status: 400 });
    }

    if (!isGraduation && sourceClassId === targetClassId) {
      return NextResponse.json({ error: "Source and target classes cannot be the same" }, { status: 400 });
    }

    let result;

    if (isGraduation) {
      //* Fetch students to be graduated
      const studentsToGraduate = await prisma.student.findMany({
        where: {
          classId: sourceClassId,
          ...(studentIds && studentIds.length > 0 ? { id: { in: studentIds } } : {}),
        },
        include: {
          class: true,
          grade: true,
        },
      });

      if (studentsToGraduate.length === 0) {
        return NextResponse.json({ error: "No students found to graduate" }, { status: 404 });
      }

      //* Move students to OldStudent table
      await prisma.$transaction(async (tx) => {
        const studentIdsToProcess = studentsToGraduate.map((s) => s.id);

        // Pre-record snapshot for one-click rollback
        const snapshotStudents: SnapshotStudentItem[] = studentsToGraduate.map((s) => ({
          id: s.id,
          studentId: s.studentId,
          name: s.name,
          surname: s.surname,
          previousClassId: s.classId,
          previousGradeId: s.gradeId,
          targetClassId: null,
          isGraduation: true,
          graduatedRecord: {
            username: s.username,
            studentId: s.studentId,
            name: s.name,
            surname: s.surname,
            otherNames: s.otherNames,
            email: s.email,
            phone: s.phone,
            address: s.address,
            img: s.img,
            bloodType: s.bloodType,
            sex: s.sex,
            birthday: s.birthday,
            residencyStatus: s.residencyStatus,
            house: s.house,
            guardianName: s.guardianName,
            contactNumber: s.contactNumber,
            occupation: s.occupation,
            nhisNumber: s.nhisNumber,
            admissionDate: s.admissionDate,
            parentId: s.parentId,
          },
        }));

        if (snapshotStudents.length > 0) {
          await recordMigrationSnapshot(tx, {
            migrationType: "INDIVIDUAL",
            description: `Graduation of ${snapshotStudents.length} student(s)`,
            students: snapshotStudents,
          });
        }

        // Calculate total outstanding arrears for each graduating student before deleting fee records
        const studentFees = await tx.fee.findMany({
          where: { studentId: { in: studentIdsToProcess } },
          select: { studentId: true, amount: true, paidAmount: true },
        });

        const studentArrearsMap = new Map<string, number>();
        for (const fee of studentFees) {
          const balance = Math.max(fee.amount - fee.paidAmount, 0);
          if (balance > 0) {
            studentArrearsMap.set(
              fee.studentId,
              (studentArrearsMap.get(fee.studentId) || 0) + balance
            );
          }
        }

        for (const student of studentsToGraduate) {
          const arrears = studentArrearsMap.get(student.id) || 0;
          await tx.oldStudent.create({
            data: {
              username: student.username,
              studentId: student.studentId,
              name: student.name,
              surname: student.surname,
              otherNames: student.otherNames,
              email: student.email,
              phone: student.phone,
              address: student.address,
              img: student.img,
              bloodType: student.bloodType,
              sex: student.sex,
              birthday: student.birthday,
              residencyStatus: student.residencyStatus,
              house: student.house,
              guardianName: student.guardianName,
              contactNumber: student.contactNumber,
              occupation: student.occupation,
              nhisNumber: student.nhisNumber,
              admissionDate: student.admissionDate,
              graduationDate: new Date(),
              originalClass: student.class.name,
              originalGrade: student.grade.level.toString(),
              completionYear: new Date().getFullYear(),
              outstandingArrears: arrears,
            },
          });
        }

        //* Delete dependent records first to avoid FK violations
        await tx.attendance.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.result.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.fee.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.behavior.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.medicalInfo.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.document.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.comment.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });
        await tx.studentAnswer.deleteMany({ where: { studentId: { in: studentIdsToProcess } } });

        //* Delete from active Student table
        await tx.student.deleteMany({
          where: {
            id: { in: studentIdsToProcess },
          },
        });
      });

      result = { count: studentsToGraduate.length };

      return NextResponse.json({
        success: true,
        message: `Successfully graduated ${result.count} students`,
        count: result.count,
        repeatedCount: 0,
        smsSentCount: 0,
        smsFailedCount: 0,
      });
    } else {
      //* ── Non-graduation: migrate selected students and identify repeaters ──

      //* 1. Fetch ALL students currently in the source class (before the move)
      const allSourceStudents = await prisma.student.findMany({
        where: { classId: sourceClassId },
        select: {
          id: true,
          name: true,
          surname: true,
          contactNumber: true,
          parent: {
            select: { phone: true },
          },
        },
      });

      //* 2. Determine which students are being LEFT BEHIND (repeating)
      const migratedIdSet = new Set<string>(
        Array.isArray(studentIds) ? studentIds : []
      );
      const repeatingStudents = allSourceStudents.filter(
        (s) => !migratedIdSet.has(s.id)
      );

      //* 3. Fetch the source class name for the SMS message
      const sourceClass = await prisma.class.findUnique({
        where: { id: sourceClassId },
        select: { name: true },
      });
      const className = sourceClass?.name ?? "their current class";

      //* 3b. Fetch target class to ensure gradeId stays in sync
      const targetClass = await prisma.class.findUnique({
        where: { id: targetClassId },
        select: { gradeId: true },
      });

      //* 3c. Pre-record snapshot of students moving for one-click rollback
      const studentsToMigrate = await prisma.student.findMany({
        where: {
          classId: sourceClassId,
          ...(studentIds && studentIds.length > 0 ? { id: { in: studentIds } } : {}),
        },
        select: {
          id: true,
          studentId: true,
          name: true,
          surname: true,
          classId: true,
          gradeId: true,
        },
      });

      if (studentsToMigrate.length > 0) {
        await recordMigrationSnapshot(prisma, {
          migrationType: "INDIVIDUAL",
          description: `Migration of ${studentsToMigrate.length} student(s) to ${className}`,
          students: studentsToMigrate.map((s) => ({
            id: s.id,
            studentId: s.studentId,
            name: s.name,
            surname: s.surname,
            previousClassId: s.classId,
            previousGradeId: s.gradeId,
            targetClassId,
            targetGradeId: targetClass?.gradeId,
            isGraduation: false,
          })),
        });
      }

      //* 4. Migrate the selected students to the target class
      result = await prisma.student.updateMany({
        where: {
          classId: sourceClassId,
          ...(studentIds && studentIds.length > 0 ? { id: { in: studentIds } } : {}),
        },
        data: {
          classId: targetClassId,
          ...(targetClass?.gradeId ? { gradeId: targetClass.gradeId } : {}),
        },
      });

      //* 5. Fire-and-forget: send SMS to parents of repeating students
      let smsSentCount = 0;
      let smsFailedCount = 0;

      if (repeatingStudents.length > 0) {
        try {
          const settings = await getSystemSettings();
          const schoolName = settings.schoolName ?? "the school";

          const smsPayload = repeatingStudents.map((s) => ({
            fullName: `${s.name} ${s.surname}`.trim(),
            className,
            parentPhone: s.parent?.phone ?? null,
            contactNumber: s.contactNumber ?? null,
          }));

          const smsResult = await sendBulkRepeatStudentSMS(smsPayload, schoolName);
          smsSentCount = smsResult.sent;
          smsFailedCount = smsResult.failed;
        } catch (smsError) {
          //* SMS errors must NOT block the migration response
          console.error("[SMS] Repeat-student bulk SMS failed unexpectedly:", smsError);
          smsFailedCount = repeatingStudents.length;
        }
      }

      return NextResponse.json({
        success: true,
        message: `Successfully migrated ${result.count} students`,
        count: result.count,
        repeatedCount: repeatingStudents.length,
        smsSentCount,
        smsFailedCount,
      });
    }
  } catch (error) {
    console.error("Class migration/graduation error:", error);
    return NextResponse.json({ error: "Failed to process students" }, { status: 500 });
  }
}
