"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth";
import {
  LibraryBorrowSchema,
  libraryBorrowSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { canManageLibraryCatalog } from "./utils";
import { writeServerAuditLog } from "./audit-server";

type ActionState = {
  success: boolean;
  error: boolean;
  message: string;
};

const defaultActionState: ActionState = {
  success: false,
  error: false,
  message: "",
};

function getValidationMessage(error: { issues?: { message?: string }[] }): string {
  return error.issues?.[0]?.message || "Invalid form data.";
}

export async function createLibraryBorrow(
  currentState: ActionState = defaultActionState,
  data: LibraryBorrowSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can borrow/lend books.",
    };
  }

  const parsed = libraryBorrowSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  try {
    // 1. Fetch catalog item
    const item = await prisma.libraryCatalogItem.findUnique({
      where: { id: parsed.data.itemId },
      include: {
        borrows: {
          where: { status: "BORROWED" }
        }
      }
    });

    if (!item) {
      return {
        success: false,
        error: true,
        message: "Library catalog item not found.",
      };
    }

    if (item.itemType !== "BOOK") {
      return {
        success: false,
        error: true,
        message: "Only physical books can be checked out/borrowed.",
      };
    }

    // 2. Check if copies are available
    const activeCheckouts = item.borrows.length;
    if (activeCheckouts >= item.copies) {
      return {
        success: false,
        error: true,
        message: `No copies available! All ${item.copies} copies are currently checked out.`,
      };
    }

    // 3. Create checkout record
    await prisma.libraryBorrow.create({
      data: {
        itemId: parsed.data.itemId,
        studentId: parsed.data.studentId,
        dueDate: parsed.data.dueDate,
        notes: parsed.data.notes?.trim() || null,
        status: "BORROWED",
      },
    });

    revalidatePath("/dashboard/lessons/library");
    await writeServerAuditLog({
      action: "library_borrow.create",
      category: "academics",
      summary: `Checked out "${item.title}" to student ID: ${parsed.data.studentId}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_borrow",
        label: item.title,
      },
      metadata: {
        itemId: parsed.data.itemId,
        studentId: parsed.data.studentId,
        dueDate: parsed.data.dueDate,
      },
    });

    return {
      success: true,
      error: false,
      message: `Checked out "${item.title}" successfully.`,
    };
  } catch (error) {
    console.error("Failed to create library borrow checkout:", error);
    return {
      success: false,
      error: true,
      message: "Failed to create book checkout record.",
    };
  }
}

export async function returnLibraryBorrow(
  id: number
): Promise<ActionState> {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can process returns.",
    };
  }

  try {
    const borrow = await prisma.libraryBorrow.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!borrow) {
      return {
        success: false,
        error: true,
        message: "Checkout record not found.",
      };
    }

    await prisma.libraryBorrow.update({
      where: { id },
      data: {
        status: "RETURNED",
        returnDate: new Date(),
      },
    });

    revalidatePath("/dashboard/lessons/library");
    await writeServerAuditLog({
      action: "library_borrow.return",
      category: "academics",
      summary: `Returned "${borrow.item.title}" from student ID: ${borrow.studentId}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_borrow",
        label: borrow.item.title,
      },
      metadata: {
        id,
        itemId: borrow.itemId,
        studentId: borrow.studentId,
      },
    });

    return {
      success: true,
      error: false,
      message: `"${borrow.item.title}" returned successfully.`,
    };
  } catch (error) {
    console.error("Failed to return book:", error);
    return {
      success: false,
      error: true,
      message: "Failed to log book return.",
    };
  }
}

export async function renewLibraryBorrow(
  id: number,
  newDueDate: Date
): Promise<ActionState> {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can renew checkouts.",
    };
  }

  try {
    const borrow = await prisma.libraryBorrow.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!borrow) {
      return {
        success: false,
        error: true,
        message: "Checkout record not found.",
      };
    }

    await prisma.libraryBorrow.update({
      where: { id },
      data: {
        dueDate: newDueDate,
        status: newDueDate > new Date() ? "BORROWED" : "OVERDUE",
      },
    });

    revalidatePath("/dashboard/lessons/library");
    await writeServerAuditLog({
      action: "library_borrow.renew",
      category: "academics",
      summary: `Renewed "${borrow.item.title}" for student ID: ${borrow.studentId} until ${newDueDate.toLocaleDateString()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_borrow",
        label: borrow.item.title,
      },
      metadata: {
        id,
        itemId: borrow.itemId,
        studentId: borrow.studentId,
        newDueDate,
      },
    });

    return {
      success: true,
      error: false,
      message: `Renewed "${borrow.item.title}" successfully.`,
    };
  } catch (error) {
    console.error("Failed to renew book:", error);
    return {
      success: false,
      error: true,
      message: "Failed to renew book checkout.",
    };
  }
}

export async function deleteLibraryBorrow(
  id: number
): Promise<ActionState> {
  const startedAt = Date.now();
  const session = await getServerSession(authOptions);

  if (!session?.user || session.user.role !== "admin") {
    return {
      success: false,
      error: true,
      message: "Only administrators can delete borrow history records.",
    };
  }

  try {
    const borrow = await prisma.libraryBorrow.findUnique({
      where: { id },
      include: { item: true },
    });

    if (!borrow) {
      return {
        success: false,
        error: true,
        message: "Checkout record not found.",
      };
    }

    await prisma.libraryBorrow.delete({
      where: { id },
    });

    revalidatePath("/dashboard/lessons/library");
    await writeServerAuditLog({
      action: "library_borrow.delete",
      category: "academics",
      summary: `Deleted checkout record of "${borrow.item.title}" (student ID: ${borrow.studentId})`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_borrow",
        label: borrow.item.title,
      },
      metadata: {
        id,
        itemId: borrow.itemId,
        studentId: borrow.studentId,
      },
    });

    return {
      success: true,
      error: false,
      message: "Checkout record deleted successfully.",
    };
  } catch (error) {
    console.error("Failed to delete checkout record:", error);
    return {
      success: false,
      error: true,
      message: "Failed to delete checkout record.",
    };
  }
}
