import type { Prisma } from "@prisma/client";
import prisma from "@/lib/prisma";

/**
 * Returns the filter for students who are currently enrolled.
 *
 * A dropout is normally removed from the Student table when their dropout
 * record is created. The explicit exclusion also protects reporting from
 * legacy or partially completed moves that left a matching Student record.
 */
export async function getActiveStudentWhere(): Promise<Prisma.StudentWhereInput> {
  const dropouts = await prisma.dropoutStudent.findMany({
    select: { studentId: true },
  });

  if (dropouts.length === 0) {
    return {};
  }

  return {
    studentId: {
      notIn: dropouts.map((dropout) => dropout.studentId),
    },
  };
}
