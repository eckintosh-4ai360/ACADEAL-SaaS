import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import prisma from "@/lib/prisma";
import {
  getLatestRevertibleSnapshot,
  executeMigrationRollback,
} from "@/lib/class-migration-rollback";
import { writeServerAuditLog } from "@/lib/audit-server";

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const state = await getLatestRevertibleSnapshot(prisma);

    return NextResponse.json({
      success: true,
      hasSnapshot: state.hasSnapshot,
      snapshot: state.snapshot,
    });
  } catch (error: any) {
    console.error("[Rollback API] Error getting snapshot status:", error);
    return NextResponse.json(
      { error: "Failed to retrieve rollback status" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.role !== "admin" || session.user.adminRole !== "SUPER_ADMIN") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const userIdentifier = session.user.name || session.user.email || "SUPER_ADMIN";

    const result = await executeMigrationRollback(prisma, {
      snapshotId: body.snapshotId,
      revertedBy: userIdentifier,
    });

    await writeServerAuditLog({
      action: "MIGRATION_REVERTED",
      summary: `Reverted class migration (${result.totalRestored} students restored by ${userIdentifier})`,
      category: "SYSTEM",
      status: "SUCCESS",
      metadata: {
        totalRestored: result.totalRestored,
        restoredCount: result.restoredCount,
        ungraduatedCount: result.ungraduatedCount,
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error("[Rollback API] Error executing rollback:", error);
    return NextResponse.json(
      { error: error.message || "Failed to execute migration rollback" },
      { status: 500 }
    );
  }
}
