import { format } from "date-fns";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import prisma from "@/lib/prisma";
import { authOptions } from "@/lib/auth";
import { getSystemSettings } from "@/lib/settings";
import { normalizeTermValue, formatTermLabel } from "@/lib/termUtils";
import { userHasFeePermission } from "@/lib/user-permissions-server";

export const runtime = "nodejs";

const GRADE_NAMES: Record<number, string> = {
  1: "CRECHE",
  2: "NURSERY 1",
  3: "NURSERY 2",
  4: "KG 1",
  5: "KG 2",
  6: "BASIC 1",
  7: "BASIC 2",
  8: "BASIC 3",
  9: "BASIC 4",
  10: "BASIC 5",
  11: "BASIC 6",
  12: "JHS 1",
  13: "JHS 2",
  14: "JHS 3",
};

function formatMoney(amount: number) {
  return `GHS ${amount.toFixed(2)}`;
}

function sanitizeFilePart(value: string) {
  return (
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "fees"
  );
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    const user = session?.user as { role?: string } | undefined;

    if (!session) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (user?.role === "teacher" && !(await userHasFeePermission("generateBill"))) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    if (user?.role !== "admin" && user?.role !== "teacher") {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }

    const body = await req.json();
    const {
      gradeId,
      term,
      academicYear,
    } = body as {
      gradeId: number;
      term?: string;
      academicYear?: string;
    };

    if (!gradeId) {
      return NextResponse.json({ error: "gradeId is required." }, { status: 400 });
    }

    const settings = await getSystemSettings();
    const targetTerm = normalizeTermValue(term || settings.currentTerm);
    const targetYear = academicYear || settings.academicYear || "";

    const fees = await prisma.fee.findMany({
      where: {
        student: { gradeId },
        ...(targetTerm ? { term: targetTerm } : {}),
        ...(targetYear ? { academicYear: targetYear } : {}),
      },
      include: {
        student: {
          select: {
            studentId: true,
            name: true,
            surname: true,
            grade: { select: { level: true } },
            class: { select: { name: true } },
          },
        },
      },
      orderBy: { student: { surname: "asc" } },
    });

    if (fees.length === 0) {
      return NextResponse.json(
        { error: "No fees found for this level/term." },
        { status: 404 }
      );
    }

    // Query prior unpaid fees for all students in this bill (any previous terms/years)
    const studentIds = fees.map((fee) => fee.studentId);
    const priorFees = await prisma.fee.findMany({
      where: {
        studentId: { in: studentIds },
        NOT: {
          term: targetTerm,
          academicYear: targetYear,
        },
      },
      select: {
        studentId: true,
        amount: true,
        paidAmount: true,
      },
    });

    const priorArrearsMap = new Map<string, number>();
    for (const pf of priorFees) {
      const unpaid = Math.max(pf.amount - pf.paidAmount, 0);
      if (unpaid > 0) {
        priorArrearsMap.set(
          pf.studentId,
          (priorArrearsMap.get(pf.studentId) || 0) + unpaid
        );
      }
    }

    const rows = fees.map((fee) => {
      const priorArrears = priorArrearsMap.get(fee.studentId) || 0;
      const feeIncludesPrior =
        Boolean(fee.description?.includes("[Arrears B/F:")) ||
        (priorArrears > 0 && fee.amount > priorArrears);
      const currentBill = feeIncludesPrior
        ? Math.max(fee.amount - priorArrears, 0)
        : fee.amount;
      const currentPaid = fee.paidAmount;
      const totalPayable = feeIncludesPrior ? fee.amount : priorArrears + currentBill;
      const netBalance = Math.max(totalPayable - currentPaid, 0);

      let status: string = fee.status;
      if (priorArrears > 0 && netBalance > 0) {
        status = currentPaid > 0 ? "PARTIAL" : "ARREARS";
      }

      return {
        studentId: fee.student.studentId,
        name: `${fee.student.name} ${fee.student.surname}`.trim(),
        className: fee.student.class?.name || "",
        title: fee.title,
        priorArrears: Math.round(priorArrears * 100) / 100,
        currentBill: Math.round(currentBill * 100) / 100,
        totalPayable: Math.round(totalPayable * 100) / 100,
        paidAmount: Math.round(currentPaid * 100) / 100,
        balance: Math.round(netBalance * 100) / 100,
        status,
      };
    });

    const totalPriorArrears = rows.reduce((sum, row) => sum + row.priorArrears, 0);
    const totalCurrentBill = rows.reduce((sum, row) => sum + row.currentBill, 0);
    const totalPayable = rows.reduce((sum, row) => sum + row.totalPayable, 0);
    const totalPaid = rows.reduce((sum, row) => sum + row.paidAmount, 0);
    const totalNetBalance = rows.reduce((sum, row) => sum + row.balance, 0);

    const gradeLevel = fees[0]?.student.grade.level ?? gradeId;
    const gradeLabel = GRADE_NAMES[gradeLevel] ?? `GRADE ${gradeLevel}`;
    const schoolName = settings.schoolName?.trim() || "School Fee Bill";
    const generatedAt = new Date();

    const doc = new jsPDF({ orientation: "landscape" });
    const pdfDoc = doc as jsPDF & { lastAutoTable?: { finalY: number } };

    doc.setFontSize(18);
    doc.setTextColor(20);
    doc.text(schoolName, 14, 18);

    doc.setFontSize(14);
    doc.text(`Fee Bill - ${gradeLabel}`, 14, 28);

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Term: ${formatTermLabel(targetTerm)}`, 14, 36);
    doc.text(`Academic Year: ${targetYear || "Current Year"}`, 14, 42);
    doc.text(`Students: ${rows.length}`, 14, 48);
    doc.text(`Generated: ${format(generatedAt, "dd MMM yyyy HH:mm:ss")}`, 14, 54);

    autoTable(doc, {
      startY: 60,
      head: [["Metric", "Value"]],
      body: [
        ["Grade Level", gradeLabel],
        ["Current Term Billed", formatMoney(totalCurrentBill)],
        ["Prior Arrears (Brought Forward)", formatMoney(totalPriorArrears)],
        ["Total Payable", formatMoney(totalPayable)],
        ["Total Paid", formatMoney(totalPaid)],
        ["Net Outstanding Balance", formatMoney(totalNetBalance)],
      ],
      styles: {
        fontSize: 9,
        cellPadding: 2.5,
      },
      headStyles: {
        fillColor: [29, 78, 216],
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 80 },
      },
    });

    autoTable(doc, {
      startY: (pdfDoc.lastAutoTable?.finalY ?? 60) + 8,
      head: [[
        "S/N",
        "Student ID",
        "Student Name",
        "Class",
        "Fee Item",
        "Arrears B/F (GHS)",
        "Current Fee (GHS)",
        "Total Payable (GHS)",
        "Paid (GHS)",
        "Balance Due (GHS)",
        "Status",
      ]],
      body: rows.map((row, index) => [
        String(index + 1),
        row.studentId,
        row.name,
        row.className,
        row.title,
        row.priorArrears.toFixed(2),
        row.currentBill.toFixed(2),
        row.totalPayable.toFixed(2),
        row.paidAmount.toFixed(2),
        row.balance.toFixed(2),
        row.status,
      ]),
      foot: [[
        "",
        "",
        `Total (${rows.length} students)`,
        "",
        "",
        totalPriorArrears.toFixed(2),
        totalCurrentBill.toFixed(2),
        totalPayable.toFixed(2),
        totalPaid.toFixed(2),
        totalNetBalance.toFixed(2),
        "",
      ]],
      styles: {
        fontSize: 7.5,
        cellPadding: 2,
      },
      headStyles: {
        fillColor: [14, 116, 144],
      },
      footStyles: {
        fillColor: [241, 245, 249],
        textColor: [15, 23, 42],
        fontStyle: "bold",
      },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { cellWidth: 42 },
        3: { cellWidth: 24 },
        4: { cellWidth: 36 },
        5: { cellWidth: 26, halign: "right" },
        6: { cellWidth: 26, halign: "right" },
        7: { cellWidth: 26, halign: "right" },
        8: { cellWidth: 22, halign: "right" },
        9: { cellWidth: 26, halign: "right" },
        10: { cellWidth: 18, halign: "center" },
      },
    });

    const pdfBuffer = Buffer.from(doc.output("arraybuffer"));
    const fileName = [
      "fee-bill",
      sanitizeFilePart(gradeLabel),
      sanitizeFilePart(targetTerm || "current-term"),
      sanitizeFilePart(targetYear || "current-year"),
    ].join("-");

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${fileName}.pdf"`,
        "Content-Length": String(pdfBuffer.length),
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("bill-pdf route error:", error);
    return NextResponse.json({ error: "Internal server error." }, { status: 500 });
  }
}
