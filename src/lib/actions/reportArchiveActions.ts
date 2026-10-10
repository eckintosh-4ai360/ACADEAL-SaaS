"use server";

import prisma from "../prisma";
import { revalidatePath } from "next/cache";
import fs from "fs/promises";
import path from "path";
import { requireAdmin, requireStaff } from "@/lib/security/guard";

export async function saveReportArchive(data: {
  title: string;
  base64Pdf: string;
  academicYear: string;
  term: string;
}) {
  try {
    await requireStaff();
    // Determine static upload directory
    const uploadDir = path.join(process.cwd(), "public", "uploads", "reports");
    await fs.mkdir(uploadDir, { recursive: true });

    // Generate unique filename
    const filename = `archive_${Date.now()}_${Math.round(Math.random() * 1000)}.pdf`;
    const filePath = path.join(uploadDir, filename);

    // Write base64 to file (strip data uri metadata robustly)
    const base64Data = data.base64Pdf.split(",")[1] || data.base64Pdf;
    await fs.writeFile(filePath, base64Data, "base64");

    const fileUrl = `/uploads/reports/${filename}`;

    // Save record to database
    const archive = await prisma.storedReportArchive.create({
      data: {
        title: data.title,
        fileUrl,
        academicYear: data.academicYear,
        term: data.term,
      },
    });

    revalidatePath("/dashboard/teachers/report-card");
    return { success: true, data: archive };
  } catch (error) {
    console.error("Error saving PDF archive:", error);
    return { success: false, error: "Failed to save PDF archive to server." };
  }
}

export async function getReportArchives() {
  try {
    await requireStaff();
    const archives = await prisma.storedReportArchive.findMany({
      orderBy: { createdAt: "desc" },
    });
    return { success: true, data: archives };
  } catch (error) {
    console.error("Error fetching report archives:", error);
    return { success: false, error: "Failed to fetch report archives." };
  }
}

export async function deleteReportArchive(id: string) {
  try {
    await requireAdmin();
    const archive = await prisma.storedReportArchive.findUnique({ where: { id } });
    if (!archive) return { success: false, error: "Archive not found" };

    // Delete file from disk
    const filePath = path.join(process.cwd(), "public", archive.fileUrl);
    try {
      await fs.unlink(filePath);
    } catch (e) {
      console.error("File already deleted or access denied:", e);
    }

    // Delete db record
    await prisma.storedReportArchive.delete({ where: { id } });
    
    revalidatePath("/dashboard/teachers/report-card");
    return { success: true };
  } catch (error) {
    console.error("Error deleting report archive:", error);
    return { success: false, error: "Failed to delete report archive." };
  }
}
