import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { authOptions } from "@/lib/auth";
import {
  clearDatabaseFailure,
  markDatabaseFailure,
  shouldBypassDatabase,
} from "@/lib/db-resilience";
import { getSystemSettings } from "@/lib/settings";
import prisma from "@/lib/prisma";
import { FeesTabNav } from "@/components/fees/FeesTabNav";
import { FeesTab } from "@/components/fees/FeesTab";
import { CheckStatementTab } from "@/components/fees/CheckStatementTab";
import { PrepareBillTab } from "@/components/fees/PrepareBillTab";
import { AdmissionTab } from "@/components/fees/AdmissionTab";
import { PaymentListTab } from "@/components/fees/PaymentListTab";
import { GenerateBillTab } from "@/components/fees/GenerateBillTab";
import { FeesArrearsTab } from "@/components/fees/FeesArrearsTab";
import { getSchoolLetterhead } from "@/lib/school-letterhead-server";
import { listStudentBillTemplates, listStudentBillsForTemplate } from "@/lib/student-bill-server";
import {
  getPaymentRecordStatus,
  isPaymentListFilter,
} from "@/lib/fee-payment-list";
import {
  getTermBillTargetTypeLabel,
  parseTermBillScope,
  STUDENT_GROUP_OPTIONS,
} from "@/lib/termBillScope";
import { normalizeTermValue } from "@/lib/termUtils";
import { getCurrentFeeAccess } from "@/lib/user-permissions-server";
import { FEE_TAB_LABELS, type FeeTabKey } from "@/lib/user-permissions";

type SessionUser = { adminRole?: string; id?: string; role?: string; username?: string };

async function getAdmissionBills() {
  if (shouldBypassDatabase()) {
    return { bills: [], degraded: true };
  }

  try {
    const bills = await prisma.admissionBill.findMany({
      orderBy: { level: "asc" },
    });

    clearDatabaseFailure();
    return { bills, degraded: false };
  } catch (error) {
    if (markDatabaseFailure(error)) {
      console.warn(
        "Admission bills temporarily unavailable after a transient database timeout."
      );
      return { bills: [], degraded: true };
    }

    throw error;
  }
}

export default async function FeesPage(props: {
  searchParams: Promise<{
    tab?: string;
    page?: string;
    pageSize?: string;
    search?: string;
    gradeLevel?: string;
    className?: string;
    term?: string;
    academicYear?: string;
    paymentStatus?: string;
    billTemplate?: string;
  }>;
}) {
  const searchParams = await props.searchParams;
  const session = await getServerSession(authOptions);
  const user = session?.user as SessionUser | undefined;
  const userRole = user?.role || "student";

  if (!session) redirect("/login");

  // Students and parents get their own read-only fee statement view
  if (userRole === "student" || userRole === "parent") {
    redirect("/dashboard/fees/my-fees");
  }

  const feeAccess = await getCurrentFeeAccess(user);
  if (!feeAccess.hasModuleAccess) {
    redirect("/dashboard");
  }

  const requestedTabParam = searchParams.tab || "fees";
  const requestedTab = FEE_TAB_LABELS.includes(requestedTabParam as FeeTabKey)
    ? (requestedTabParam as FeeTabKey)
    : "fees";

  if (!feeAccess.allowedTabs.includes(requestedTab)) {
    redirect(`/dashboard/fees?tab=${feeAccess.allowedTabs[0]}`);
  }

  const tab = requestedTab;
  const page = parseInt(searchParams.page || "1");
  const pageSize = parseInt(searchParams.pageSize || "25");
  const search = searchParams.search || "";
  const gradeLevel = searchParams.gradeLevel || "";
  const className = searchParams.className || "";
  const paymentStatus = isPaymentListFilter(searchParams.paymentStatus)
    ? searchParams.paymentStatus
    : "all";

  const settings = await getSystemSettings();
  const currentTerm = normalizeTermValue(settings.currentTerm);
  const currentAcademicYear = settings.academicYear || "2025/2026";

  // Allow URL params to override term/year (for viewing fees from other terms)
  const selectedTerm = normalizeTermValue(searchParams.term || currentTerm);
  const selectedAcademicYear = searchParams.academicYear || currentAcademicYear;

  // ──────────────────────────────────────────────────
  // TAB: FEES (default) — student payment list
  // ──────────────────────────────────────────────────
  if (tab === "fees" || !tab) {
    // Build where clause with all filters
    const studentWhere: Prisma.StudentWhereInput = {};
    
    // Search filter
    if (search) {
      studentWhere.OR = [
        { name: { contains: search, mode: "insensitive" as const } },
        { surname: { contains: search, mode: "insensitive" as const } },
        { studentId: { contains: search, mode: "insensitive" as const } },
      ];
    }
    
    // Grade level filter
    if (gradeLevel) {
      studentWhere.grade = { level: parseInt(gradeLevel) };
    }
    
    // Class name filter
    if (className) {
      studentWhere.class = { name: className };
    }

    const where: Prisma.FeeWhereInput = {
      ...(Object.keys(studentWhere).length > 0 ? { student: studentWhere } : {}),
      term: selectedTerm,
      academicYear: selectedAcademicYear,
    };

    const [fees, total, aggregate, allGrades, allClasses, allAcademicYears] = await Promise.all([
      prisma.fee.findMany({
        where,
        include: {
          student: {
            include: {
              grade: { select: { level: true } },
              class: { select: { name: true } },
            },
          },
        },
        orderBy: { student: { surname: "asc" } },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.fee.count({ where }),
      prisma.fee.aggregate({
        where,
        _sum: { amount: true, paidAmount: true },
      }),
      // Fetch all grade levels for the filter dropdown
      prisma.grade.findMany({
        select: { level: true },
        orderBy: { level: "asc" },
      }),
      // Fetch all classes for the filter dropdown
      prisma.class.findMany({
        select: { name: true },
        orderBy: { name: "asc" },
      }),
      prisma.fee.findMany({
        select: { academicYear: true },
        distinct: ["academicYear"],
        orderBy: { academicYear: "asc" },
      }),
    ]);

    const totalFees = aggregate._sum.amount ?? 0;
    const totalPaid = aggregate._sum.paidAmount ?? 0;
    const totalArrears = totalFees - totalPaid;

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="fees" visibleTabs={feeAccess.allowedTabs} />
        <FeesTab
          fees={fees.map((f) => ({
            id: f.id,
            title: f.title,
            amount: f.amount,
            paidAmount: f.paidAmount,
            status: f.status,
            term: f.term,
            academicYear: f.academicYear,
            student: {
              id: f.student.id,
              studentId: f.student.studentId,
              name: f.student.name,
              surname: f.student.surname,
              grade: { level: f.student.grade.level },
              class: { name: f.student.class.name },
            },
          }))}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          gradeLevel={gradeLevel}
          className={className}
          totalFees={totalFees}
          totalPaid={totalPaid}
          totalArrears={totalArrears}
          allGradeLevels={allGrades.map((g) => g.level)}
          allClassNames={allClasses.map((c) => c.name)}
          allAcademicYears={allAcademicYears.map((entry) => entry.academicYear)}
          selectedTerm={selectedTerm}
          selectedAcademicYear={selectedAcademicYear}
          currentTerm={currentTerm}
          currentAcademicYear={currentAcademicYear}
          canEditFeeRecords={feeAccess.canEditFeeRecords}
          canRecordFeePayments={feeAccess.canRecordFeePayments}
          canViewPaymentList={feeAccess.allowedTabs.includes("payments")}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: CHECK STATEMENT
  // ──────────────────────────────────────────────────
  if (tab === "statement") {
    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="statement" visibleTabs={feeAccess.allowedTabs} />
        <CheckStatementTab />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: PREPARE BILL
  // ──────────────────────────────────────────────────
  if (tab === "prepare") {
    const GRADE_NAMES: Record<number, string> = {
      1: "CRECHE", 2: "NURSERY 1", 3: "NURSERY 2", 4: "KG 1", 5: "KG 2",
      6: "BASIC 1", 7: "BASIC 2", 8: "BASIC 3", 9: "BASIC 4", 10: "BASIC 5",
      11: "BASIC 6", 12: "JHS 1", 13: "JHS 2", 14: "JHS 3",
    };

    const [termBills, classes] = await Promise.all([
      prisma.termBill.findMany({
        include: { items: true },
        orderBy: { createdAt: "desc" },
      }),
      prisma.class.findMany({
        select: {
          id: true,
          name: true,
          grade: {
            select: {
              level: true,
            },
          },
        },
        orderBy: { name: "asc" },
      }),
    ]);

    // For each term bill, check if Fee records have already been prepared
    // (i.e. at least one Fee row exists for the same term + academicYear whose
    // studentId is in the bill's target scope). A simple proxy: check whether
    // any Fee exists with that term+year — fast single query per bill.
    const preparedBillIds = new Set<number>();
    if (termBills.length > 0) {
      // Batch: for each unique (term, academicYear) pair, check for existing fees
      const pairMap = new Map<string, number[]>();
      for (const b of termBills) {
        const key = `${b.term}||${b.academicYear}`;
        const ids = pairMap.get(key) ?? [];
        ids.push(b.id);
        pairMap.set(key, ids);
      }

      await Promise.all(
        Array.from(pairMap.entries()).map(async ([key, billIds]) => {
          const [term, academicYear] = key.split("||");
          const count = await prisma.fee.count({
            where: { term, academicYear },
          });
          if (count > 0) {
            for (const id of billIds) preparedBillIds.add(id);
          }
        })
      );
    }

    const classById = new Map(classes.map((classRecord) => [classRecord.id, classRecord]));

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="prepare" visibleTabs={feeAccess.allowedTabs} />
        <PrepareBillTab
          termBills={termBills.map((b) => ({
            ...(() => {
              const scope = parseTermBillScope(b.level);
              const classRecord =
                scope?.targetType === "CLASS" ? classById.get(scope.targetId) : null;

              const targetType = scope?.targetType ?? "GRADE";

              let targetName: string;
              let targetDescription: string;

              if (targetType === "STUDENT_GROUP") {
                const group = STUDENT_GROUP_OPTIONS[scope?.targetId ?? -1];
                targetName = group?.label ?? `Group #${scope?.targetId ?? "?"}`;
                targetDescription = "Applies to all students in this school group";
              } else if (targetType === "CLASS") {
                targetName = classRecord?.name ?? `Class #${scope?.targetId ?? "?"}`;
                targetDescription = classRecord
                  ? `Class in ${GRADE_NAMES[classRecord.grade.level] ?? `Grade ${classRecord.grade.level}`}`
                  : "Specific class";
              } else {
                targetName =
                  GRADE_NAMES[scope?.targetId ?? Number.parseInt(b.level, 10)] ??
                  `Grade ${scope?.targetId ?? b.level}`;
                targetDescription = "Applies to the full grade level";
              }

              return {
                targetType,
                targetTypeLabel: getTermBillTargetTypeLabel(targetType),
                targetName,
                targetDescription,
              };
            })(),
            id: b.id,
            term: b.term,
            academicYear: b.academicYear,
            totalAmount: b.totalAmount,
            items: b.items.map((i) => ({ itemName: i.itemName, amount: i.amount })),
            isPrepared: preparedBillIds.has(b.id),
          }))}
          currentTerm={currentTerm}
          academicYear={currentAcademicYear}
          classes={classes.map((classRecord) => ({
            id: classRecord.id,
            name: classRecord.name,
            gradeLabel:
              GRADE_NAMES[classRecord.grade.level] ?? `Grade ${classRecord.grade.level}`,
          }))}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: ADMISSION
  // ──────────────────────────────────────────────────
  if (tab === "admission") {
    const { bills, degraded } = await getAdmissionBills();

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="admission" visibleTabs={feeAccess.allowedTabs} />
        {degraded ? (
          <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Admission bills are temporarily unavailable because the database
            connection timed out. Refresh and try again in a moment.
          </div>
        ) : (
          <AdmissionTab
            bills={bills.map((b) => ({
              id: b.id,
              level: b.level,
              item: b.item,
              amount: b.amount,
              createdAt: b.createdAt.toISOString(),
            }))}
          />
        )}
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: PAYMENT LIST
  // ──────────────────────────────────────────────────
  if (tab === "payments") {
    const paymentWhere: Prisma.FeeWhereInput = {};

    if (paymentStatus === "full") {
      paymentWhere.status = "PAID";
    } else if (paymentStatus === "arrears") {
      paymentWhere.status = { not: "PAID" };
    }

    if (search.trim()) {
      paymentWhere.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { term: { contains: search, mode: "insensitive" } },
        { academicYear: { contains: search, mode: "insensitive" } },
        {
          student: {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { surname: { contains: search, mode: "insensitive" } },
              { studentId: { contains: search, mode: "insensitive" } },
              { class: { name: { contains: search, mode: "insensitive" } } },
            ],
          },
        },
        {
          payments: {
            some: {
              receiptNumber: { contains: search, mode: "insensitive" },
            },
          },
        },
      ];
    }

    const feePaymentSelect = {
      id: true,
      title: true,
      amount: true,
      paidAmount: true,
      status: true,
      term: true,
      academicYear: true,
      student: {
        select: {
          studentId: true,
          name: true,
          surname: true,
          grade: { select: { level: true } },
          class: { select: { name: true } },
        },
      },
      payments: {
        select: {
          receiptNumber: true,
          paymentMethod: true,
          recordedBy: true,
          paidAt: true,
          receiptDeliveries: {
            select: {
              channel: true,
              status: true,
              recipient: true,
              error: true,
              sentAt: true,
              receiptUrl: true,
              createdAt: true,
            },
            orderBy: { createdAt: "desc" as const },
          },
        },
        orderBy: { paidAt: "desc" as const },
        take: 1,
      },
      _count: {
        select: {
          payments: true,
        },
      },
    } satisfies Prisma.FeeSelect;

    const [fees, total, aggregate, exportFees] = await Promise.all([
      prisma.fee.findMany({
        where: paymentWhere,
        select: feePaymentSelect,
        orderBy: [
          { updatedAt: "desc" },
          { student: { surname: "asc" } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.fee.count({ where: paymentWhere }),
      prisma.fee.aggregate({
        where: paymentWhere,
        _sum: {
          amount: true,
          paidAmount: true,
        },
      }),
      prisma.fee.findMany({
        where: paymentWhere,
        select: feePaymentSelect,
        orderBy: [
          { updatedAt: "desc" },
          { student: { surname: "asc" } },
        ],
      }),
    ]);

    const mapPaymentRow = (fee: (typeof fees)[number]) => {
      const lastPayment = fee.payments[0] ?? null;
      const receiptDelivery =
        lastPayment?.receiptDeliveries.find((delivery) => delivery.channel === "SMS") ??
        lastPayment?.receiptDeliveries[0] ??
        null;
      const fallbackReceiptUrl = lastPayment?.receiptNumber
        ? `/receipt/${encodeURIComponent(lastPayment.receiptNumber)}`
        : null;

      return {
        id: fee.id,
        feeTitle: fee.title,
        term: fee.term,
        academicYear: fee.academicYear,
        totalAmount: fee.amount,
        paidAmount: fee.paidAmount,
        balance: Math.max(fee.amount - fee.paidAmount, 0),
        paymentStatus: getPaymentRecordStatus(fee.paidAmount, fee.amount),
        paymentCount: fee._count.payments,
        lastReceiptNumber: lastPayment?.receiptNumber ?? null,
        lastReceiptUrl: receiptDelivery?.receiptUrl ?? fallbackReceiptUrl,
        lastPaymentMethod: lastPayment?.paymentMethod ?? null,
        lastRecordedBy: lastPayment?.recordedBy ?? null,
        lastPaidAt: lastPayment?.paidAt?.toISOString() ?? null,
        receiptDeliveryStatus: receiptDelivery?.status ?? null,
        receiptDeliveryChannel: receiptDelivery?.channel ?? null,
        receiptDeliveryRecipient: receiptDelivery?.recipient ?? null,
        receiptDeliveryError: receiptDelivery?.error ?? null,
        receiptDeliverySentAt: receiptDelivery?.sentAt?.toISOString() ?? null,
        student: {
          studentId: fee.student.studentId,
          name: fee.student.name,
          surname: fee.student.surname,
          gradeLevel: fee.student.grade.level,
          className: fee.student.class.name,
        },
      };
    };

    const totalBilled = aggregate._sum.amount ?? 0;
    const totalPaid = aggregate._sum.paidAmount ?? 0;
    const totalBalance = totalBilled - totalPaid;
    const exportRows = exportFees.map(mapPaymentRow);
    const fullPaymentCount = exportRows.filter(
      (row) => row.paymentStatus === "Full Payment"
    ).length;

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="payments" visibleTabs={feeAccess.allowedTabs} />
        <PaymentListTab
          payments={fees.map(mapPaymentRow)}
          exportPayments={exportRows}
          total={total}
          page={page}
          pageSize={pageSize}
          search={search}
          paymentStatus={paymentStatus}
          totalBilled={totalBilled}
          totalPaid={totalPaid}
          totalBalance={totalBalance}
          fullPaymentCount={fullPaymentCount}
          arrearsCount={total - fullPaymentCount}
          canRecordFeePayments={feeAccess.canRecordFeePayments}
          canEditFeeRecords={feeAccess.canEditFeeRecords}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: GENERATE BILL
  // ──────────────────────────────────────────────────
  if (tab === "generate") {
    const requestedTemplateId = Number(searchParams.billTemplate);
    const [grades, billTemplates, school] = await Promise.all([
      prisma.grade.findMany({
        select: { id: true, level: true },
        orderBy: { level: "asc" },
      }),
      listStudentBillTemplates(),
      getSchoolLetterhead(),
    ]);
    const selectedTemplateId = billTemplates.templates.some((item) => item.id === requestedTemplateId)
      ? requestedTemplateId
      : null;
    const bills = selectedTemplateId ? await listStudentBillsForTemplate(selectedTemplateId) : [];

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="generate" visibleTabs={feeAccess.allowedTabs} />
        <GenerateBillTab
          grades={grades}
          currentTerm={currentTerm}
          academicYear={currentAcademicYear}
          studentBills={{
            storageReady: billTemplates.storageReady,
            templates: billTemplates.templates,
            selectedTemplateId,
            bills,
            school,
            defaultResumptionDate: settings.reopeningDate
              ? new Date(settings.reopeningDate).toISOString()
              : null,
          }}
        />
      </div>
    );
  }

  // ──────────────────────────────────────────────────
  // TAB: FEES ARREARS
  // ──────────────────────────────────────────────────
  if (tab === "arrears") {
    const studentWhere: Prisma.StudentWhereInput = {};
    if (search) {
      studentWhere.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { surname: { contains: search, mode: "insensitive" } },
        { studentId: { contains: search, mode: "insensitive" } },
        { class: { name: { contains: search, mode: "insensitive" } } },
      ];
    }
    if (gradeLevel) {
      studentWhere.grade = { level: parseInt(gradeLevel) };
    }
    if (className) {
      studentWhere.class = { name: className };
    }

    const students = await prisma.student.findMany({
      where: studentWhere,
      select: {
        id: true,
        studentId: true,
        name: true,
        surname: true,
        grade: { select: { level: true } },
        class: { select: { name: true } },
        fees: {
          select: {
            id: true,
            title: true,
            amount: true,
            paidAmount: true,
            term: true,
            academicYear: true,
            description: true,
          },
        },
      },
      orderBy: { surname: "asc" },
    });

    const arrears: Array<{
      studentId: string;
      name: string;
      level: number;
      className: string;
      term: string;
      academicYear: string;
      priorArrears: number;
      currentTermFees: number;
      currentTermPaid: number;
      totalFees: number;
      totalPaid: number;
      balance: number;
    }> = [];

    for (const s of students) {
      let priorArrears = 0;
      let currentTermFees = 0;
      let currentTermPaid = 0;
      let totalFees = 0;
      let totalPaid = 0;
      let hasRolledOverArrears = false;

      for (const fee of s.fees) {
        const isCurrent =
          fee.term === currentTerm && fee.academicYear === currentAcademicYear;

        if (isCurrent) {
          currentTermFees += fee.amount;
          currentTermPaid += fee.paidAmount;
          if (fee.description?.includes("[Arrears B/F:")) {
            hasRolledOverArrears = true;
          }
        } else {
          const pastBalance = Math.max(fee.amount - fee.paidAmount, 0);
          priorArrears += pastBalance;
        }
        totalPaid += fee.paidAmount;
      }

      // If active term fee already has prior arrears added into its amount,
      // separate the base current bill from prior arrears so neither is double-counted.
      if (hasRolledOverArrears && priorArrears > 0 && currentTermFees >= priorArrears) {
        currentTermFees = currentTermFees - priorArrears;
        totalFees = priorArrears + currentTermFees;
      } else {
        totalFees = priorArrears + currentTermFees;
      }

      const totalBalance = Math.max(totalFees - totalPaid, 0);

      if (totalBalance > 0) {
        arrears.push({
          studentId: s.studentId,
          name: `${s.name} ${s.surname}`.trim(),
          level: s.grade.level,
          className: s.class?.name || `Grade ${s.grade.level}`,
          term: currentTerm,
          academicYear: currentAcademicYear,
          priorArrears: Math.round(priorArrears * 100) / 100,
          currentTermFees: Math.round(currentTermFees * 100) / 100,
          currentTermPaid: Math.round(currentTermPaid * 100) / 100,
          totalFees: Math.round(totalFees * 100) / 100,
          totalPaid: Math.round(totalPaid * 100) / 100,
          balance: Math.round(totalBalance * 100) / 100,
        });
      }
    }

    arrears.sort((a, b) => a.name.localeCompare(b.name));

    return (
      <div className="space-y-2">
        <FeesTabNav activeTab="arrears" visibleTabs={feeAccess.allowedTabs} />
        <FeesArrearsTab
          arrears={arrears}
          currentTerm={currentTerm}
          academicYear={currentAcademicYear}
          search={search}
        />
      </div>
    );
  }

  // Fallback — redirect to fees tab
  redirect("/dashboard/fees?tab=fees");
}
