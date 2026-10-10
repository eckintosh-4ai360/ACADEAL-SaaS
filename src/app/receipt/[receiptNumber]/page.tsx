import prisma from "@/lib/prisma";
import { notFound } from "next/navigation";
import { getSystemSettings } from "@/lib/settings";
import { ReceiptClient } from "./ReceiptClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type ReceiptSettings = {
  schoolName?: string;
  schoolLogo?: string | null;
  schoolPhone?: string | null;
  schoolEmail?: string | null;
  schoolAddress?: string | null;
};

export default async function ReceiptPage(props: {
  params: Promise<{ receiptNumber: string }>;
}) {
  const { receiptNumber } = await props.params;
  const normalizedReceiptNumber = decodeURIComponent(receiptNumber).trim();

  const [payment, settings] = await Promise.all([
    prisma.feePayment.findFirst({
      where: {
        receiptNumber: {
          equals: normalizedReceiptNumber,
          mode: "insensitive",
        },
      },
      //* Explicit select, never `include`. This page is public — anything
      //* named here is serialized into the payload the browser receives, and
      //* `include` pulled every scalar on Student and Parent, password hashes
      //* and all.
      select: {
        receiptNumber: true,
        amount: true,
        paymentMethod: true,
        paidAt: true,
        recordedBy: true,
        term: true,
        academicYear: true,
        student: {
          select: {
            name: true,
            surname: true,
            studentId: true,
            class: { select: { name: true } },
            grade: { select: { level: true } },
            parent: {
              select: {
                name: true,
                surname: true,
                phone: true,
              },
            },
          },
        },
        fee: {
          select: {
            title: true,
            amount: true,
            paidAmount: true,
          },
        },
      },
    }),
    getSystemSettings() as Promise<ReceiptSettings>,
  ]);

  if (!payment) {
    notFound();
  }

  const schoolName = settings?.schoolName || "STUDENT MANAGEMENT SYSTEM";

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#edf3f8_0%,#f8fbfd_45%,#eef5fa_100%)] px-4 py-8 sm:px-6">
      <ReceiptClient
        payment={payment}
        schoolName={schoolName}
        schoolLogo={settings?.schoolLogo || null}
        schoolPhone={settings?.schoolPhone || null}
        schoolEmail={settings?.schoolEmail || null}
        schoolAddress={settings?.schoolAddress || null}
      />
    </div>
  );
}
