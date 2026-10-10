import { PrismaClient } from "@prisma/client";
import { randomUUID } from "crypto";

export interface SnapshotStudentItem {
  id: string;
  studentId: string;
  name: string;
  surname: string;
  previousClassId: number;
  previousGradeId: number;
  targetClassId: number | null;
  targetGradeId?: number | null;
  isGraduation: boolean;
  graduatedRecord?: {
    username: string;
    studentId: string;
    name: string;
    surname: string;
    otherNames?: string | null;
    email?: string | null;
    phone?: string | null;
    address?: string | null;
    img?: string | null;
    bloodType?: string | null;
    sex: any;
    birthday: string | Date;
    residencyStatus: string;
    house?: string | null;
    guardianName?: string | null;
    contactNumber?: string | null;
    occupation?: string | null;
    nhisNumber?: string | null;
    admissionDate?: string | Date | null;
    parentId?: string | null;
  };
}

export interface MigrationSnapshotPayload {
  students: SnapshotStudentItem[];
  metadata?: Record<string, any>;
}

/**
 * Ensures the ClassMigrationSnapshot table exists in the current tenant database.
 */
export async function ensureClassMigrationSnapshotTable(prisma: PrismaClient | any) {
  try {
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ClassMigrationSnapshot" (
        "id" TEXT NOT NULL,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "migrationType" TEXT NOT NULL,
        "description" TEXT NOT NULL,
        "studentCount" INTEGER NOT NULL DEFAULT 0,
        "graduatedCount" INTEGER NOT NULL DEFAULT 0,
        "revertedAt" TIMESTAMP(3),
        "revertedBy" TEXT,
        "snapshotData" JSONB NOT NULL,
        CONSTRAINT "ClassMigrationSnapshot_pkey" PRIMARY KEY ("id")
      );
      CREATE INDEX IF NOT EXISTS "ClassMigrationSnapshot_createdAt_idx" ON "ClassMigrationSnapshot"("createdAt" DESC);
      CREATE INDEX IF NOT EXISTS "ClassMigrationSnapshot_revertedAt_idx" ON "ClassMigrationSnapshot"("revertedAt");
    `);
  } catch (err) {
    console.error("[MigrationRollback] Error ensuring snapshot table:", err);
  }
}

/**
 * Creates a persistent snapshot of all students before migration execution.
 */
export async function recordMigrationSnapshot(
  tx: any,
  params: {
    migrationType: "TOTAL" | "INDIVIDUAL";
    description: string;
    students: SnapshotStudentItem[];
  }
): Promise<string> {
  await ensureClassMigrationSnapshotTable(tx);

  const snapshotId = randomUUID();
  const graduatedCount = params.students.filter((s) => s.isGraduation).length;
  const migratedCount = params.students.filter((s) => !s.isGraduation).length;

  const payload: MigrationSnapshotPayload = {
    students: params.students,
    metadata: {
      migratedCount,
      graduatedCount,
      recordedAt: new Date().toISOString(),
    },
  };

  await tx.$executeRawUnsafe(
    `
    INSERT INTO "ClassMigrationSnapshot" (
      "id", "createdAt", "migrationType", "description",
      "studentCount", "graduatedCount", "snapshotData"
    ) VALUES ($1, NOW(), $2, $3, $4, $5, $6::jsonb)
  `,
    snapshotId,
    params.migrationType,
    params.description,
    migratedCount,
    graduatedCount,
    JSON.stringify(payload)
  );

  return snapshotId;
}

/**
 * Gets the latest unreverted migration snapshot, synthesizing one if a recent migration occurred before snapshots were introduced.
 */
export async function getLatestRevertibleSnapshot(prisma: PrismaClient | any) {
  await ensureClassMigrationSnapshotTable(prisma);

  // 1. Try to find the latest active (unreverted) snapshot
  try {
    const snapshots = await prisma.$queryRawUnsafe(`
      SELECT "id", "createdAt", "migrationType", "description", "studentCount", "graduatedCount", "revertedAt"
      FROM "ClassMigrationSnapshot"
      WHERE "revertedAt" IS NULL
      ORDER BY "createdAt" DESC
      LIMIT 1
    `);

    if (Array.isArray(snapshots) && snapshots.length > 0) {
      return {
        hasSnapshot: true,
        snapshot: snapshots[0],
      };
    }
  } catch (err) {
    console.warn("[MigrationRollback] Could not query snapshot table directly:", err);
  }

  // 2. Check if a recent migration occurred that can be synthesized for one-click recall
  const synthesized = await synthesizeRecentMigrationSnapshot(prisma);
  if (synthesized) {
    return {
      hasSnapshot: true,
      snapshot: synthesized,
    };
  }

  return {
    hasSnapshot: false,
    snapshot: null,
  };
}

/**
 * Synthesizes a migration snapshot if students were recently migrated today before the rollback system was active.
 */
async function synthesizeRecentMigrationSnapshot(prisma: PrismaClient | any) {
  try {
    // Check if students were updated today in bulk (migration)
    const recentStudents = await prisma.student.findMany({
      where: {
        updatedAt: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // within last 24 hours
        },
      },
      include: {
        class: true,
        grade: true,
      },
    });

    // Check graduated students from today
    const recentOldStudents = await prisma.oldStudent.findMany({
      where: {
        graduationDate: {
          gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
        },
      },
    });

    // If fewer than 10 students updated, this was not a full class migration
    if (recentStudents.length < 5 && recentOldStudents.length === 0) {
      return null;
    }

    // Load all classes to deduce previous classes
    const classes = await prisma.class.findMany({
      include: { grade: true },
      orderBy: [{ grade: { level: "asc" } }, { name: "asc" }],
    });

    const snapshotStudents: SnapshotStudentItem[] = [];

    // Map each student currently in a class back to their preceding grade/class
    for (const student of recentStudents) {
      const currentLevel = student.grade?.level ?? 0;
      const prevLevel = currentLevel - 1;

      // Find the class in the preceding level
      const prevGradeClasses = classes.filter((c: any) => c.grade?.level === prevLevel);
      if (prevGradeClasses.length > 0) {
        // Stream match if available
        const currentStream = student.class.name.trim().match(/(?:[\s\-_])([A-Za-z0-9])$/);
        let prevClass = prevGradeClasses[0];
        if (currentStream) {
          const matchingPrev = prevGradeClasses.find((c: any) =>
            c.name.trim().endsWith(currentStream[0])
          );
          if (matchingPrev) prevClass = matchingPrev;
        }

        snapshotStudents.push({
          id: student.id,
          studentId: student.studentId,
          name: student.name,
          surname: student.surname,
          previousClassId: prevClass.id,
          previousGradeId: prevClass.gradeId,
          targetClassId: student.classId,
          isGraduation: false,
        });
      }
    }

    // For graduated students from JHS 3
    const jhs3Class = classes.find(
      (c: any) =>
        c.grade?.level === 14 ||
        c.name.toUpperCase().includes("JHS 3") ||
        c.name.toUpperCase().includes("JHS3")
    );

    for (const oldStudent of recentOldStudents) {
      snapshotStudents.push({
        id: oldStudent.id,
        studentId: oldStudent.studentId,
        name: oldStudent.name,
        surname: oldStudent.surname,
        previousClassId: jhs3Class ? jhs3Class.id : 24,
        previousGradeId: jhs3Class ? jhs3Class.gradeId : 14,
        targetClassId: null,
        isGraduation: true,
        graduatedRecord: {
          username: oldStudent.username,
          studentId: oldStudent.studentId,
          name: oldStudent.name,
          surname: oldStudent.surname,
          otherNames: oldStudent.otherNames,
          email: oldStudent.email,
          phone: oldStudent.phone,
          address: oldStudent.address,
          img: oldStudent.img,
          bloodType: oldStudent.bloodType,
          sex: oldStudent.sex,
          birthday: oldStudent.birthday,
          residencyStatus: oldStudent.residencyStatus,
          house: oldStudent.house,
          guardianName: oldStudent.guardianName,
          contactNumber: oldStudent.contactNumber,
          occupation: oldStudent.occupation,
          nhisNumber: oldStudent.nhisNumber,
          admissionDate: oldStudent.admissionDate,
        },
      });
    }

    if (snapshotStudents.length === 0) {
      return null;
    }

    const snapshotId = randomUUID();
    const migratedCount = snapshotStudents.filter((s) => !s.isGraduation).length;
    const graduatedCount = snapshotStudents.filter((s) => s.isGraduation).length;

    const payload: MigrationSnapshotPayload = {
      students: snapshotStudents,
      metadata: {
        isSynthesized: true,
        migratedCount,
        graduatedCount,
        recordedAt: new Date().toISOString(),
      },
    };

    await prisma.$executeRawUnsafe(
      `
      INSERT INTO "ClassMigrationSnapshot" (
        "id", "createdAt", "migrationType", "description",
        "studentCount", "graduatedCount", "snapshotData"
      ) VALUES ($1, NOW(), $2, $3, $4, $5, $6::jsonb)
      ON CONFLICT ("id") DO NOTHING
    `,
      snapshotId,
      "TOTAL",
      `Recent Class Migration (${migratedCount} promoted, ${graduatedCount} graduated)`,
      migratedCount,
      graduatedCount,
      JSON.stringify(payload)
    );

    return {
      id: snapshotId,
      createdAt: new Date(),
      migrationType: "TOTAL",
      description: `Recent Class Migration (${migratedCount} promoted, ${graduatedCount} graduated)`,
      studentCount: migratedCount,
      graduatedCount: graduatedCount,
      revertedAt: null,
    };
  } catch (err) {
    console.error("[MigrationRollback] Error synthesizing snapshot:", err);
    return null;
  }
}

/**
 * Rolls back a migration snapshot, restoring students to their previous classes and reinstating graduated students.
 */
export async function executeMigrationRollback(
  prisma: PrismaClient | any,
  params: {
    snapshotId?: string;
    revertedBy: string;
  }
) {
  await ensureClassMigrationSnapshotTable(prisma);

  // 1. Fetch snapshot
  let query = `
    SELECT "id", "description", "studentCount", "graduatedCount", "snapshotData"
    FROM "ClassMigrationSnapshot"
    WHERE "revertedAt" IS NULL
  `;
  const queryParams: any[] = [];

  if (params.snapshotId) {
    query += ` AND "id" = $1`;
    queryParams.push(params.snapshotId);
  }

  query += ` ORDER BY "createdAt" DESC LIMIT 1`;

  const rows: any = await prisma.$queryRawUnsafe(query, ...queryParams);
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new Error("No active migration snapshot found to rollback.");
  }

  const snapshot = rows[0];
  const payload: MigrationSnapshotPayload =
    typeof snapshot.snapshotData === "string"
      ? JSON.parse(snapshot.snapshotData)
      : snapshot.snapshotData;

  const students = payload.students || [];
  let restoredCount = 0;
  let ungraduatedCount = 0;

  // 2. Execute rollback inside a transaction
  await prisma.$transaction(async (tx: any) => {
    for (const student of students) {
      if (student.isGraduation && student.graduatedRecord) {
        const rec = student.graduatedRecord;
        // Reinstate graduated student in Student table
        await tx.$executeRawUnsafe(
          `
          INSERT INTO "Student" (
            "id", "username", "studentId", "name", "surname", "otherNames",
            "email", "phone", "address", "img", "bloodType", "sex",
            "birthday", "residencyStatus", "house", "guardianName", "contactNumber",
            "occupation", "nhisNumber", "admissionDate", "classId", "gradeId", "parentId",
            "createdAt", "updatedAt"
          ) VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12::"UserSex",
            $13::timestamp, $14, $15, $16, $17,
            $18, $19, $20::timestamp, $21, $22, $23,
            NOW(), NOW()
          )
          ON CONFLICT ("id") DO UPDATE SET
            "classId" = EXCLUDED."classId",
            "gradeId" = EXCLUDED."gradeId",
            "updatedAt" = NOW()
        `,
          student.id || randomUUID(),
          rec.username,
          rec.studentId,
          rec.name,
          rec.surname,
          rec.otherNames || null,
          rec.email || null,
          rec.phone || null,
          rec.address || null,
          rec.img || null,
          rec.bloodType || null,
          rec.sex || "MALE",
          rec.birthday ? new Date(rec.birthday) : new Date(),
          rec.residencyStatus || "DAY",
          rec.house || null,
          rec.guardianName || null,
          rec.contactNumber || null,
          rec.occupation || null,
          rec.nhisNumber || null,
          rec.admissionDate ? new Date(rec.admissionDate) : null,
          student.previousClassId,
          student.previousGradeId,
          rec.parentId || null
        );

        // Delete from OldStudent table
        await tx.oldStudent.deleteMany({
          where: {
            OR: [
              { studentId: student.studentId },
              { username: rec.username },
            ],
          },
        });

        ungraduatedCount++;
      } else if (!student.isGraduation) {
        // Revert active student to previous class and grade
        await tx.student.updateMany({
          where: { id: student.id },
          data: {
            classId: student.previousClassId,
            gradeId: student.previousGradeId,
          },
        });

        restoredCount++;
      }
    }

    // 3. Mark snapshot as reverted
    await tx.$executeRawUnsafe(
      `
      UPDATE "ClassMigrationSnapshot"
      SET "revertedAt" = NOW(), "revertedBy" = $1
      WHERE "id" = $2
    `,
      params.revertedBy,
      snapshot.id
    );
  });

  return {
    success: true,
    snapshotId: snapshot.id,
    restoredCount,
    ungraduatedCount,
    totalRestored: restoredCount + ungraduatedCount,
    message: `Successfully recalled migration. ${restoredCount} student(s) returned to their previous classes${
      ungraduatedCount > 0 ? ` and ${ungraduatedCount} graduated student(s) restored.` : "."
    }`,
  };
}
