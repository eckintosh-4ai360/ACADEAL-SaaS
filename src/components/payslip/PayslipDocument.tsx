import type { ReactNode } from "react";
import { format } from "date-fns";
import {
  amountInWords,
  computePayslipTotals,
  formatCedis,
  formatSalaryMonth,
  type PayslipDraft,
  type PayslipLine,
  type PayslipSchool,
} from "@/lib/payslip";

//* The printable payslip. Colours are fixed (not theme tokens) because this is
//* paper: it renders the same in dark mode, in print, and in the PDF export.

type PayslipDocumentProps = {
  school: PayslipSchool;
  draft: PayslipDraft;
  issuedAt: string;
  className?: string;
};

function visibleLines(lines: PayslipLine[]) {
  return lines.filter((line) => line.label.trim() || line.amount);
}

function DetailList({ rows }: { rows: Array<[string, string]> }) {
  return (
    <dl className="divide-y divide-slate-300">
      {rows.map(([label, value]) => (
        <div key={label} className="grid grid-cols-[104px_minmax(0,1fr)]">
          <dt className="border-r border-slate-300 bg-slate-50 px-2 py-1 text-right font-medium text-slate-600">
            {label}:
          </dt>
          <dd className="break-words px-2 py-1 font-semibold text-slate-900">{value || " "}</dd>
        </div>
      ))}
    </dl>
  );
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <tr>
      <th
        colSpan={3}
        scope="colgroup"
        className="border-t border-slate-400 bg-slate-100 px-3 py-1 text-left text-[11px] font-bold uppercase tracking-wide text-slate-800"
      >
        {children}
      </th>
    </tr>
  );
}

function LineRows({ lines }: { lines: PayslipLine[] }) {
  if (lines.length === 0) {
    return (
      <tr>
        <td className="py-0.5 pl-6 pr-3 italic text-slate-400">None</td>
        <td className="border-l border-slate-300" />
        <td className="border-l border-slate-300" />
      </tr>
    );
  }

  return (
    <>
      {lines.map((line, index) => (
        <tr key={`${line.label}-${index}`}>
          <td className="py-0.5 pl-6 pr-3">{line.label}</td>
          <td className="border-l border-slate-300 px-3 py-0.5 text-right tabular-nums">
            {formatCedis(line.amount)}
          </td>
          <td className="border-l border-slate-300" />
        </tr>
      ))}
    </>
  );
}

function TotalRow({ label, subtotal, total }: { label: string; subtotal?: number; total: number }) {
  return (
    <tr className="border-t border-slate-400">
      <th scope="row" className="px-3 py-1 text-left font-bold">
        {label}
      </th>
      <td className="border-l border-slate-300 px-3 py-1 text-right font-semibold tabular-nums">
        {subtotal === undefined ? "" : formatCedis(subtotal)}
      </td>
      <td className="border-l border-slate-300 px-3 py-1 text-right font-bold tabular-nums">
        {formatCedis(total)}
      </td>
    </tr>
  );
}

export function PayslipDocument({ school, draft, issuedAt, className }: PayslipDocumentProps) {
  const totals = computePayslipTotals(draft);
  const issued = new Date(issuedAt);
  const employeeName = [draft.title, draft.fullName].filter(Boolean).join(" ");
  const contactLine = [school.phone ? `Tel: ${school.phone}` : null, school.email]
    .filter(Boolean)
    .join("  |  ");
  const paidToBank = Boolean(draft.bankName || draft.accountNumber);

  return (
    <article
      className={`w-full border-2 border-slate-800 bg-white text-[12px] leading-snug text-slate-900 ${className ?? ""}`}
    >
      <header className="grid grid-cols-[132px_auto_minmax(0,1fr)] items-center gap-4 border-b-2 border-slate-800 px-4 py-3">
        <div className="self-start text-[11px] text-slate-700">
          <p className="font-semibold" suppressHydrationWarning>
            {format(issued, "EEEE, MMMM d, yyyy")}
          </p>
          <p suppressHydrationWarning>{format(issued, "h:mm:ss a")}</p>
        </div>
        <div className="flex h-20 w-20 items-center justify-center">
          {/* Plain <img>: next/image's lazy, srcset-driven output is unreliable
              for window.print() and html2canvas. crossOrigin keeps the cached
              copy usable when the PDF export re-reads it. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={school.logo}
            alt={`${school.name} logo`}
            crossOrigin="anonymous"
            className="max-h-20 max-w-20 object-contain"
          />
        </div>
        <div className="text-center">
          <h1 className="text-[19px] font-extrabold uppercase leading-tight tracking-wide text-slate-900">
            {school.name}
          </h1>
          {school.address && <p className="mt-1 italic text-slate-700">{school.address}</p>}
          {contactLine && <p className="mt-0.5 text-[11px] text-slate-600">{contactLine}</p>}
        </div>
      </header>

      <h2 className="border-b-2 border-slate-800 py-1.5 text-center text-[16px] font-bold tracking-wide">
        Employee Payslip
      </h2>

      <section className="grid grid-cols-2 border-b-2 border-slate-800">
        <div className="border-r border-slate-800">
          <DetailList
            rows={[
              ["Employee ID", draft.employeeId],
              ["Full Name", employeeName],
              ["Designation", draft.designation],
              ["Grade/Level", draft.gradeLevel],
              ["Phone No", draft.phone],
              ["Email", draft.email],
            ]}
          />
        </div>
        <DetailList
          rows={[
            ["Bank", draft.bankName],
            ["Account No", draft.accountNumber],
            ["Branch", draft.bankBranch],
            ["SSNIT No", draft.ssnitNumber],
            ["SSNIT Branch", draft.ssnitBranch],
            ["Salary Month", formatSalaryMonth(draft.salaryMonth)],
          ]}
        />
      </section>

      <table className="w-full border-collapse">
        <colgroup>
          <col />
          <col className="w-[118px]" />
          <col className="w-[118px]" />
        </colgroup>
        <thead>
          <tr className="text-[10px] uppercase tracking-wide text-slate-500">
            <th scope="col" className="px-3 py-1 text-left font-semibold">
              Description
            </th>
            <th scope="col" className="border-l border-slate-300 px-3 py-1 text-right font-semibold">
              Amount
            </th>
            <th scope="col" className="border-l border-slate-300 px-3 py-1 text-right font-semibold">
              Total
            </th>
          </tr>
        </thead>
        <tbody>
          <SectionHeading>Basic Salary / Allowances</SectionHeading>
          <LineRows lines={visibleLines(draft.earnings)} />
          <TotalRow label="Gross Salary" total={totals.grossSalary} />
          <SectionHeading>Other Claims</SectionHeading>
          <LineRows lines={visibleLines(draft.otherClaims)} />
          <TotalRow label="Total Gross Salary" subtotal={totals.otherClaims} total={totals.totalGross} />
        </tbody>
        <tbody className="border-t-2 border-slate-800">
          <SectionHeading>Deductions</SectionHeading>
          <LineRows lines={visibleLines(draft.deductions)} />
          <TotalRow label="Deductions" total={totals.deductions} />
          <SectionHeading>Other Deductions</SectionHeading>
          <LineRows lines={visibleLines(draft.otherDeductions)} />
          <TotalRow label="Total Deduction" subtotal={totals.otherDeductions} total={totals.totalDeductions} />
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-800 bg-slate-100">
            <th scope="row" colSpan={2} className="px-3 py-2 text-left text-[14px] font-extrabold uppercase tracking-wide">
              Net Salary
            </th>
            <td className="px-3 py-2 text-right text-[14px] font-extrabold tabular-nums">
              {formatCedis(totals.netSalary)}
            </td>
          </tr>
        </tfoot>
      </table>

      <footer>
        <div className="grid grid-cols-2 border-t-2 border-slate-800 bg-slate-100 font-semibold">
          <p className="px-3 py-1.5">Annual Salary: {formatCedis(totals.annualSalary)}</p>
          <p className="px-3 py-1.5 text-right">
            {paidToBank ? "Salary to Bank" : "Amount Payable"}: {formatCedis(totals.netSalary)}
          </p>
        </div>
        <p className="border-t border-slate-400 px-3 py-1.5">
          <span className="font-semibold">Amount Paid in Words: </span>
          <span className="italic">{amountInWords(totals.netSalary)}</span>
        </p>
        {draft.footerNote && (
          <p className="border-t border-slate-400 px-3 py-1.5 text-slate-700">{draft.footerNote}</p>
        )}
        <div className="flex flex-wrap items-center justify-between gap-2 border-t-2 border-slate-800 px-3 py-2 text-[11px]">
          <p>
            Prepared by: <span className="font-semibold">{draft.preparedBy || "—"}</span>
          </p>
          <p className="font-semibold tracking-wider text-slate-600">***** Computer Generated Payslip *****</p>
        </div>
      </footer>
    </article>
  );
}
