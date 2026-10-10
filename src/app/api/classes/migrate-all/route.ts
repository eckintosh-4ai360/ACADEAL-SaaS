import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import { recordMigrationSnapshot, SnapshotStudentItem } from "@/lib/class-migration-rollback";

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { migrations } = await request.json();

    if (!Array.isArray(migrations) || migrations.length === 0) {
      return NextResponse.json({ error: "No migrations provided" }, { status: 400 });
    }

    let totalMigrated = 0;
    let totalGraduated = 0;

    await prisma.$transaction(async (tx) => {
      // Step 1: Pre-snapshot student IDs for each migration source class so sequential updates NEVER cascade!
      const plannedMigrations: Array<{
        sourceClassId: number;
        targetClassId: number | null;
        isGraduation: boolean;
        students: any[];
        targetClass?: any;
      }> = [];

      for (const migration of migrations) {
        const { sourceClassId, targetClassId, isGraduation } = migration;
        const students = await tx.student.findMany({
          where: { classId: sourceClassId },
          include: {
            class: true,
            grade: true,
          },
        });

        let targetClass = null;
        if (!isGraduation && targetClassId) {
          targetClass = await tx.class.findUnique({
            where: { id: targetClassId },
          });
        }

        plannedMigrations.push({
          sourceClassId,
          targetClassId,
          isGraduation,
          students,
          targetClass,
        });
      }

      // Step 1b: Record snapshot for one-click rollback
      const snapshotStudents: SnapshotStudentItem[] = [];
      for (const plan of plannedMigrations) {
        for (const s of plan.students) {
          snapshotStudents.push({
            id: s.id,
            studentId: s.studentId,
            name: s.name,
            surname: s.surname,
            previousClassId: s.classId,
            previousGradeId: s.gradeId,
            targetClassId: plan.isGraduation ? null : plan.targetClassId,
            isGraduation: plan.isGraduation,
            graduatedRecord: plan.isGraduation
              ? {
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
                }
              : undefined,
          });
        }
      }

      if (snapshotStudents.length > 0) {
        await recordMigrationSnapshot(tx, {
          migrationType: "TOTAL",
          description: `Total Class Migration of ${snapshotStudents.length} student(s)`,
          students: snapshotStudents,
        });
      }

      // Step 2: Execute graduations and class migrations using the pre-snapshot student IDs
      for (const plan of plannedMigrations) {
        const { isGraduation, students, targetClass, targetClassId } = plan;

        if (isGraduation && students.length > 0) {
          const studentIdsToProcess = students.map((s) => s.id);

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

          for (const student of students) {
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

          totalGraduated += students.length;
        } else if (targetClass && students.length > 0) {
          const studentIds = students.map((s) => s.id);
          const updateResult = await tx.student.updateMany({
            where: {
              id: { in: studentIds },
            },
            data: {
              classId: targetClassId!,
              gradeId: targetClass.gradeId,
            },
          });
          totalMigrated += updateResult.count;
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: `Successfully migrated ${totalMigrated} students and graduated ${totalGraduated} students.`,
      migratedCount: totalMigrated,
      graduatedCount: totalGraduated,
    });
  } catch (error) {
    console.error("Total class migration error:", error);
    return NextResponse.json({ error: "Failed to process total migration" }, { status: 500 });
  }
}
