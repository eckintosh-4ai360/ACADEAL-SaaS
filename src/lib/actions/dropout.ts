"use server";

import prisma from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/security/guard";
import { assignBilledFeesToNewStudents } from "@/lib/fee-assignment";

export async function markStudentAsDropout(studentId: string, reason: string) {
  try {
    await requireAdmin();
    const student = await prisma.$transaction(async (tx) => {
      const activeStudent = await tx.student.findUnique({
        where: { id: studentId },
        include: {
          class: true,
          grade: true,
        },
      });

      if (!activeStudent) {
        return null;
      }

      // Moving and deleting occur together, preventing a partial move from
      // leaving a dropout in the active student population.
      await tx.dropoutStudent.create({
        data: {
          username: activeStudent.username,
          studentId: activeStudent.studentId,
          name: activeStudent.name,
          surname: activeStudent.surname,
          otherNames: activeStudent.otherNames,
          email: activeStudent.email,
          phone: activeStudent.phone,
          address: activeStudent.address,
          img: activeStudent.img,
          bloodType: activeStudent.bloodType,
          sex: activeStudent.sex,
          birthday: activeStudent.birthday,
          residencyStatus: activeStudent.residencyStatus,
          house: activeStudent.house,
          guardianName: activeStudent.guardianName,
          contactNumber: activeStudent.contactNumber,
          occupation: activeStudent.occupation,
          nhisNumber: activeStudent.nhisNumber,
          admissionDate: activeStudent.admissionDate,
          emergencyContact: activeStudent.emergencyContact,
          nationality: activeStudent.nationality,
          firstLanguage: activeStudent.firstLanguage,
          dropoutReason: reason,
          originalClass: activeStudent.class.name,
          originalGrade: activeStudent.grade.level.toString(),
        },
      });

      await tx.student.delete({
        where: { id: studentId },
      });

      return activeStudent;
    });

    if (!student) {
      return { success: false, error: "Student not found" };
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/utilities/dropout-students");

    return { success: true };
  } catch (error) {
    console.error("Error marking student as dropout:", error);
    return { success: false, error: "Failed to process dropout" };
  }
}

export async function deleteDropoutStudent(id: string) {
  try {
    await requireAdmin();
    await prisma.dropoutStudent.delete({
      where: { id },
    });
    revalidatePath("/dashboard/utilities/dropout-students");
    return { success: true };
  } catch (error) {
    console.error("Error deleting dropout student:", error);
    return { success: false, error: "Failed to delete record" };
  }
}

export async function updateDropoutStudent(id: string, data: { dropoutDate: Date; dropoutReason: string }) {
  try {
    await requireAdmin();
    await prisma.dropoutStudent.update({
      where: { id },
      data: {
        dropoutDate: data.dropoutDate,
        dropoutReason: data.dropoutReason,
      },
    });
    revalidatePath("/dashboard/utilities/dropout-students");
    return { success: true };
  } catch (error) {
    console.error("Error updating dropout student:", error);
    return { success: false, error: "Failed to update record" };
  }
}

export async function revertDropoutStudent(id: string) {
  try {
    await requireAdmin();
    const dropout = await prisma.dropoutStudent.findUnique({
      where: { id },
    });

    if (!dropout) {
      return { success: false, error: "Dropout record not found" };
    }

    if (!dropout.originalClass) {
      return { success: false, error: "Original class is missing, cannot revert automatically" };
    }

    // Try to find the original class
    const studentClass = await prisma.class.findUnique({
      where: { name: dropout.originalClass },
      include: { grade: { select: { level: true } } },
    });

    if (!studentClass) {
      return { success: false, error: `Original class '${dropout.originalClass}' no longer exists` };
    }

    const bcrypt = await import("bcryptjs");
    const hashedPassword = await bcrypt.hash("password123", 10);

    // Recreate the student and remove the dropout record together. This keeps
    // the active population correct even if the operation fails midway.
    const student = await prisma.$transaction(async (tx) => {
      const recreatedStudent = await tx.student.create({
        data: {
          username: dropout.username,
          studentId: dropout.studentId,
          password: hashedPassword,
          name: dropout.name,
          surname: dropout.surname,
          otherNames: dropout.otherNames,
          email: dropout.email,
          phone: dropout.phone,
          address: dropout.address,
          img: dropout.img,
          bloodType: dropout.bloodType,
          sex: dropout.sex,
          birthday: dropout.birthday,
          residencyStatus: dropout.residencyStatus,
          house: dropout.house,
          guardianName: dropout.guardianName,
          contactNumber: dropout.contactNumber,
          occupation: dropout.occupation,
          nhisNumber: dropout.nhisNumber,
          admissionDate: dropout.admissionDate,
          emergencyContact: dropout.emergencyContact,
          nationality: dropout.nationality,
          firstLanguage: dropout.firstLanguage,
          classId: studentClass.id,
          gradeId: studentClass.gradeId,
        },
      });

      await tx.dropoutStudent.delete({
        where: { id },
      });

      return recreatedStudent;
    });

    //* Reverting rebuilds the student under a fresh id, so the fees they used
    //* to carry no longer point at them and the Fees table would not list them
    //* at all. Bill them the way any other admission is billed.
    try {
      await assignBilledFeesToNewStudents([
        {
          id: student.id,
          classId: studentClass.id,
          gradeLevel: studentClass.grade.level,
        },
      ]);
    } catch (billingErr) {
      console.error("[DROPOUT REVERT] Failed to bill reverted student:", billingErr);
    }

    revalidatePath("/dashboard");
    revalidatePath("/dashboard/students");
    revalidatePath("/dashboard/utilities/dropout-students");
    revalidatePath("/dashboard/fees");

    return { success: true };
  } catch (error) {
    console.error("Error reverting dropout student:", error);
    return { success: false, error: "Failed to revert student" };
  }
}
