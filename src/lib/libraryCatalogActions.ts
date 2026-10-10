"use server";

import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";

import { authOptions } from "./auth";
import {
  LibraryCatalogItemSchema,
  libraryCatalogItemSchema,
} from "./formValidationSchemas";
import prisma from "./prisma";
import { canManageLibraryCatalog } from "./utils";
import { writeServerAuditLog } from "./audit-server";

type ActionState = {
  success: boolean;
  error: boolean;
  message: string;
};

type LibraryCatalogDelegate = {
  create: (args: {
    data: {
      itemType: "BOOK" | "DIGITAL_RESOURCE";
      title: string;
      author: string | null;
      isbn: string | null;
      category: string;
      gradeRange: string | null;
      availability: "AVAILABLE" | "LIMITED" | "UNAVAILABLE";
      copies: number;
      description: string;
      externalUrl: string | null;
      uploadedById: string;
      uploadedByName: string;
      uploaderRole: string;
    };
  }) => Promise<unknown>;
};

const defaultActionState: ActionState = {
  success: false,
  error: false,
  message: "",
};

function getValidationMessage(error: { issues?: { message?: string }[] }): string {
  return error.issues?.[0]?.message || "Invalid form data.";
}

function getLibraryCatalogDelegate(): LibraryCatalogDelegate | null {
  const client = prisma as unknown as {
    libraryCatalogItem?: LibraryCatalogDelegate;
  };

  return client.libraryCatalogItem || null;
}

function isMissingLibraryCatalogTable(error: unknown): boolean {
  const prismaError = error as {
    code?: string;
    meta?: { modelName?: string };
    message?: string;
  };

  if (prismaError?.code === "P2021") {
    return true;
  }

  const modelName = prismaError?.meta?.modelName || "";
  const message = prismaError?.message || "";

  return modelName.includes("LibraryCatalogItem") || message.includes("LibraryCatalogItem");
}

export async function createLibraryCatalogItem(
  currentState: ActionState = defaultActionState,
  data: LibraryCatalogItemSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can create library catalog entries.",
    };
  }

  const parsed = libraryCatalogItemSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  const delegate = getLibraryCatalogDelegate();
  if (!delegate) {
    return {
      success: false,
      error: true,
      message:
        "Library catalog is not ready yet. Sync the Prisma schema and restart the app.",
    };
  }

  try {
    await delegate.create({
      data: {
        itemType: parsed.data.itemType,
        title: parsed.data.title.trim(),
        author: parsed.data.author?.trim() || null,
        isbn: parsed.data.isbn?.trim() || null,
        category: parsed.data.category.trim(),
        gradeRange: parsed.data.gradeRange?.trim() || null,
        availability: parsed.data.availability,
        copies: parsed.data.copies,
        description: parsed.data.description.trim(),
        externalUrl: parsed.data.externalUrl?.trim() || null,
        uploadedById: session.user.id,
        uploadedByName: session.user.name?.trim() || session.user.username,
        uploaderRole: session.user.role,
      },
    });

    revalidatePath("/dashboard/lessons/library");
    revalidatePath("/dashboard/lessons");
    revalidatePath("/dashboard/academics");
    await writeServerAuditLog({
      action: "library_catalog_item.create",
      category: "academics",
      summary: `Created library catalog item ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_catalog_item",
        label: parsed.data.title.trim(),
      },
      metadata: {
        itemType: parsed.data.itemType,
        category: parsed.data.category.trim(),
        availability: parsed.data.availability,
        copies: parsed.data.copies,
      },
    });

    return {
      success: true,
      error: false,
      message: "Library catalog entry created successfully.",
    };
  } catch (error) {
    if (isMissingLibraryCatalogTable(error)) {
      return {
        success: false,
        error: true,
        message:
          "Library catalog table is missing. Sync the Prisma schema and restart the app.",
      };
    }

    console.error("Failed to create library catalog item:", error);
    return {
      success: false,
      error: true,
      message: "Failed to create library catalog entry.",
    };
  }
}

export async function updateLibraryCatalogItem(
  currentState: ActionState = defaultActionState,
  data: LibraryCatalogItemSchema
): Promise<ActionState> {
  void currentState;
  const startedAt = Date.now();

  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can edit library catalog entries.",
    };
  }

  if (!data.id) {
    return {
      success: false,
      error: true,
      message: "Catalog item ID is required for editing.",
    };
  }

  const parsed = libraryCatalogItemSchema.safeParse(data);
  if (!parsed.success) {
    return {
      success: false,
      error: true,
      message: getValidationMessage(parsed.error),
    };
  }

  try {
    await prisma.libraryCatalogItem.update({
      where: { id: data.id },
      data: {
        itemType: parsed.data.itemType,
        title: parsed.data.title.trim(),
        author: parsed.data.author?.trim() || null,
        isbn: parsed.data.isbn?.trim() || null,
        category: parsed.data.category.trim(),
        gradeRange: parsed.data.gradeRange?.trim() || null,
        availability: parsed.data.availability,
        copies: parsed.data.copies,
        description: parsed.data.description.trim(),
        externalUrl: parsed.data.externalUrl?.trim() || null,
      },
    });

    revalidatePath("/dashboard/lessons/library");
    revalidatePath("/dashboard/lessons");
    revalidatePath("/dashboard/academics");
    await writeServerAuditLog({
      action: "library_catalog_item.update",
      category: "academics",
      summary: `Updated library catalog item ${parsed.data.title.trim()}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_catalog_item",
        label: parsed.data.title.trim(),
      },
      metadata: {
        id: data.id,
        itemType: parsed.data.itemType,
        category: parsed.data.category.trim(),
        availability: parsed.data.availability,
        copies: parsed.data.copies,
      },
    });

    return {
      success: true,
      error: false,
      message: "Library catalog entry updated successfully.",
    };
  } catch (error) {
    console.error("Failed to update library catalog item:", error);
    return {
      success: false,
      error: true,
      message: "Failed to update library catalog entry.",
    };
  }
}

export async function deleteLibraryCatalogItem(
  id: number
): Promise<ActionState> {
  const startedAt = Date.now();

  const session = await getServerSession(authOptions);

  if (!session?.user || !canManageLibraryCatalog(session.user.role)) {
    return {
      success: false,
      error: true,
      message: "Only admins and teachers can delete library catalog entries.",
    };
  }

  try {
    const item = await prisma.libraryCatalogItem.findUnique({
      where: { id },
    });

    if (!item) {
      return {
        success: false,
        error: true,
        message: "Library catalog item not found.",
      };
    }

    await prisma.libraryCatalogItem.delete({
      where: { id },
    });

    revalidatePath("/dashboard/lessons/library");
    revalidatePath("/dashboard/lessons");
    revalidatePath("/dashboard/academics");
    await writeServerAuditLog({
      action: "library_catalog_item.delete",
      category: "academics",
      summary: `Deleted library catalog item ${item.title}`,
      durationMs: Date.now() - startedAt,
      entity: {
        type: "library_catalog_item",
        label: item.title,
      },
      metadata: {
        id,
        itemType: item.itemType,
      },
    });

    return {
      success: true,
      error: false,
      message: "Library catalog entry deleted successfully.",
    };
  } catch (error) {
    console.error("Failed to delete library catalog item:", error);
    return {
      success: false,
      error: true,
      message: "Failed to delete library catalog entry.",
    };
  }
}
