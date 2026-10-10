"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { format } from "date-fns";
import {
  ArrowLeft, CheckCircle2, Download, EyeOff, Info, Loader2, Plus, Printer, Save, Send, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayslipDocument } from "@/components/payslip/PayslipDocument";
import { DocumentPrintCopy, fileSafeName, useDocumentExport } from "@/components/print/DocumentExport";
import { loadPayslipDraft, savePayslip, setPayslipPublished } from "@/lib/payslipActions";
import {
  MONTH_NAMES,
  PAYSLIP_TITLE_SUGGESTIONS,
  computePayslipTotals,
  formatCedis,
  formatSalaryMonth,
  type PayslipDraft,
  type PayslipDraftSource,
  type PayslipLine,
  type PayslipLineSection,
  type PayslipSchool,
  type PayslipStaffOption,
  type PayslipTotals,
  type ResolvedPayslipDraft,
} from "@/lib/payslip";

type FormLine = { key: string; label: string; amount: string };

//* Amounts stay as typed strings while editing ("12." must survive a keystroke).
type PayslipForm = Omit<PayslipDraft, PayslipLineSection> & Record<PayslipLineSection, FormLine[]>;

type TextField = Exclude<keyof PayslipForm, PayslipLineSection | "staffId" | "staffType" | "salaryMonth">;

type DraftOrigin = { source: PayslipDraftSource | "copied" | null; previousMonth: string | null };

export type PayslipEditorInitial = Omit<ResolvedPayslipDraft, "source"> & {
  source: PayslipDraftSource | null;
};

type Notice = { tone: "error" | "success"; text: string };

const PAYSLIPS_PATH = "/dashboard/hr/payslips";
const DESIGNATION_SUGGESTIONS = ["Teaching", "Non-Teaching", "Administration", "Head Teacher", "Accountant"];

const LINE_SECTIONS: Array<{
  section: PayslipLineSection;
  totalKey: keyof PayslipTotals;
  title: string;
  description: string;
  addLabel: string;
  totalLabel: string;
  emptyText: string;
}> = [
  {
    section: "earnings",
    totalKey: "grossSalary",
    title: "Basic salary / allowances",
    description: "Rename, add or remove lines to match how this school pays.",
    addLabel: "Add allowance",
    totalLabel: "Gross salary",
    emptyText: "No earnings yet. Add the basic salary first.",
  },
  {
    section: "otherClaims",
    totalKey: "otherClaims",
    title: "Other claims",
    description: "One-off payments such as refunds or overtime. Added to the total gross.",
    addLabel: "Add claim",
    totalLabel: "Other claims",
    emptyText: "No other claims this month.",
  },
  {
    section: "deductions",
    totalKey: "deductions",
    title: "Deductions",
    description: "Regular deductions taken from this month's pay.",
    addLabel: "Add deduction",
    totalLabel: "Deductions",
    emptyText: "No deductions.",
  },
  {
    section: "otherDeductions",
    totalKey: "otherDeductions",
    title: "Other deductions",
    description: "Anything else deducted this month only.",
    addLabel: "Add deduction",
    totalLabel: "Other deductions",
    emptyText: "No other deductions this month.",
  },
];

let lineKeySeq = 0;
function nextLineKey() {
  lineKeySeq += 1;
  return `line-${lineKeySeq}`;
}

function toFormLines(lines: PayslipLine[]): FormLine[] {
  return lines.map((line) => ({
    key: nextLineKey(),
    label: line.label,
    amount: line.amount ? String(line.amount) : "",
  }));
}

function toForm(draft: PayslipDraft): PayslipForm {
  return {
    ...draft,
    earnings: toFormLines(draft.earnings),
    otherClaims: toFormLines(draft.otherClaims),
    deductions: toFormLines(draft.deductions),
    otherDeductions: toFormLines(draft.otherDeductions),
  };
}

function parseAmount(value: string) {
  const amount = Number.parseFloat(value.replace(/,/g, ""));
  return Number.isFinite(amount) ? amount : 0;
}

function toDraft(form: PayslipForm): PayslipDraft {
  const lines = (items: FormLine[]) =>
    items.map((item) => ({ label: item.label.trim(), amount: parseAmount(item.amount) }));

  return {
    ...form,
    earnings: lines(form.earnings),
    otherClaims: lines(form.otherClaims),
    deductions: lines(form.deductions),
    otherDeductions: lines(form.otherDeductions),
  };
}

function yearOptions(today: string, salaryMonth: string) {
  const anchor = new Date(today).getFullYear();
  const selected = Number(salaryMonth.slice(0, 4));
  const years = new Set<number>();
  for (let year = anchor + 1; year >= anchor - 5; year--) years.add(year);
  if (Number.isFinite(selected)) years.add(selected);
  return [...years].sort((a, b) => b - a);
}

const controlClass =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-60";
const inputClass = `mt-1 ${controlClass}`;

function Field({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-bold">{title}</h3>
      {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
      <div className="mt-3">{children}</div>
    </section>
  );
}

export function PayslipEditor({
  school,
  staffOptions,
  today,
  initial,
}: {
  school: PayslipSchool;
  staffOptions: PayslipStaffOption[];
  //* Server time when the page loaded (ISO); the date on a draft until it's saved.
  today: string;
  initial: PayslipEditorInitial;
}) {
  const [form, setForm] = useState<PayslipForm>(() => toForm(initial.draft));
  const [payslipId, setPayslipId] = useState(initial.payslipId);
  const [savedAt, setSavedAt] = useState(initial.savedAt);
  const [publishedAt, setPublishedAt] = useState(initial.publishedAt);
  //* The date printed on the payslip: when it was last saved, or when this draft began.
  const [issuedAt, setIssuedAt] = useState(initial.savedAt ?? today);
  const [origin, setOrigin] = useState<DraftOrigin>({
    source: initial.source,
    previousMonth: initial.previousMonth,
  });
  const [storageReady, setStorageReady] = useState(initial.storageReady);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState<"load" | "save" | "publish" | "pdf" | null>(null);
  const [pendingStaffId, setPendingStaffId] = useState<string | null>(null);
  const [pendingMonth, setPendingMonth] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const { printRef, capturing, downloadPdf } = useDocumentExport();

  const draft = toDraft(form);
  const totals = computePayslipTotals(draft);
  const hasStaff = Boolean(form.staffId);
  //* Only teachers have a My Payslips page, so only they "see" a published payslip.
  const isTeacher = form.staffType === "TEACHER";
  const displayedMonth = pendingMonth ?? form.salaryMonth;
  const [selectedYear, selectedMonth] = displayedMonth.split("-");
  const teachers = staffOptions.filter((option) => option.staffType === "TEACHER");
  const admins = staffOptions.filter((option) => option.staffType === "ADMIN");
  const staffMissing = hasStaff && !staffOptions.some((option) => option.id === form.staffId);

  //* Warn before a reload or tab close throws away a half-filled payslip.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function syncUrl(nextPayslipId: number | null, staffId: string, salaryMonth: string) {
    const url = nextPayslipId
      ? `${PAYSLIPS_PATH}/${nextPayslipId}`
      : `${PAYSLIPS_PATH}/new?staffId=${encodeURIComponent(staffId)}&month=${salaryMonth}`;
    window.history.replaceState(null, "", url);
  }

  function updateField(field: TextField, value: string) {
    setForm((current) => ({ ...current, [field]: value }));
    setDirty(true);
  }

  function updateLine(section: PayslipLineSection, key: string, patch: Partial<Omit<FormLine, "key">>) {
    setForm((current) => ({
      ...current,
      [section]: current[section].map((line) => (line.key === key ? { ...line, ...patch } : line)),
    }));
    setDirty(true);
  }

  function addLine(section: PayslipLineSection) {
    setForm((current) => ({
      ...current,
      [section]: [...current[section], { key: nextLineKey(), label: "", amount: "" }],
    }));
    setDirty(true);
  }

  function removeLine(section: PayslipLineSection, key: string) {
    setForm((current) => ({
      ...current,
      [section]: current[section].filter((line) => line.key !== key),
    }));
    setDirty(true);
  }

  function applyResolved(resolved: ResolvedPayslipDraft) {
    setForm(toForm(resolved.draft));
    setPayslipId(resolved.payslipId);
    setSavedAt(resolved.savedAt);
    setPublishedAt(resolved.publishedAt);
    setIssuedAt(resolved.savedAt ?? new Date().toISOString());
    setOrigin({ source: resolved.source, previousMonth: resolved.previousMonth });
    setStorageReady(resolved.storageReady);
    setDirty(false);
    syncUrl(resolved.payslipId, resolved.draft.staffId, resolved.draft.salaryMonth);
  }

  async function fetchDraft(staffId: string, salaryMonth: string) {
    setBusy("load");
    setNotice(null);
    try {
      const result = await loadPayslipDraft({ staffId, salaryMonth });
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return null;
      }
      return result;
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Check your connection and try again." });
      return null;
    } finally {
      setBusy(null);
    }
  }

  async function handleStaffChange(staffId: string) {
    if (!staffId || staffId === form.staffId) return;
    if (dirty && !window.confirm("Discard your unsaved changes and load this staff member instead?")) return;

    setPendingStaffId(staffId);
    const result = await fetchDraft(staffId, form.salaryMonth);
    setPendingStaffId(null);
    if (result) applyResolved(result);
  }

  async function handleMonthChange(salaryMonth: string) {
    if (salaryMonth === form.salaryMonth) return;
    if (!hasStaff) {
      setForm((current) => ({ ...current, salaryMonth }));
      return;
    }

    setPendingMonth(salaryMonth);
    const result = await fetchDraft(form.staffId, salaryMonth);
    setPendingMonth(null);
    if (!result) return;

    if (result.source === "existing") {
      const confirmed =
        !dirty ||
        window.confirm(
          `${form.fullName || "This staff member"} already has a saved payslip for ${formatSalaryMonth(
            salaryMonth
          )}. Open it? Your unsaved changes here will be lost.`
        );
      if (confirmed) applyResolved(result);
      return;
    }

    //* Nothing saved for that month yet: what's on screen becomes a new payslip
    //* for it, which is how next month's payslip is made from this one.
    setForm((current) => ({ ...current, salaryMonth }));
    if (payslipId) {
      setOrigin({ source: "copied", previousMonth: form.salaryMonth });
      setPayslipId(null);
      setSavedAt(null);
      setPublishedAt(null);
      setIssuedAt(new Date().toISOString());
      setDirty(true);
    }
    syncUrl(null, form.staffId, salaryMonth);
  }

  async function handleSave(publish = false) {
    if (!hasStaff) {
      setNotice({ tone: "error", text: "Choose a staff member first." });
      return;
    }

    setBusy(publish ? "publish" : "save");
    setNotice(null);
    try {
      const result = await savePayslip({ payslipId, draft, publish });
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setPayslipId(result.payslipId);
      setSavedAt(result.savedAt);
      setIssuedAt(result.savedAt);
      setPublishedAt(result.publishedAt);
      setOrigin({ source: "existing", previousMonth: null });
      setDirty(false);
      const subject = `${form.fullName}'s payslip for ${formatSalaryMonth(form.salaryMonth)}`;
      setNotice({
        tone: "success",
        text: publish
          ? `Published ${subject}.${isTeacher ? " They can now see it under My Payslips." : ""}`
          : `Saved ${subject}.`,
      });
      syncUrl(result.payslipId, form.staffId, form.salaryMonth);
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleUnpublish() {
    if (!payslipId) return;
    const confirmed = window.confirm(
      `Unpublish ${form.fullName}'s payslip for ${formatSalaryMonth(form.salaryMonth)}?` +
        (isTeacher ? " They will no longer see it under My Payslips." : "")
    );
    if (!confirmed) return;

    setBusy("publish");
    setNotice(null);
    try {
      const result = await setPayslipPublished(payslipId, false);
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setPublishedAt(result.publishedAt);
      setSavedAt(result.savedAt);
      setIssuedAt(result.savedAt);
      setNotice({ tone: "success", text: `Unpublished ${form.fullName}'s payslip. It is a draft again.` });
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  async function handleDownloadPdf() {
    setBusy("pdf");
    setNotice(null);
    try {
      await downloadPdf(`Payslip_${fileSafeName(form.fullName, "Staff")}_${form.salaryMonth}.pdf`);
    } catch (error) {
      console.error("Payslip PDF export failed:", error);
      setNotice({
        tone: "error",
        text: 'Could not create the PDF. Use Print and choose "Save as PDF" instead.',
      });
    } finally {
      setBusy(null);
    }
  }

  let status: string;
  if (!hasStaff) {
    status = "Choose a staff member to start a payslip.";
  } else if (payslipId) {
    const parts = [savedAt ? `Last saved ${format(new Date(savedAt), "d MMM yyyy, h:mm a")}` : "Saved"];
    if (publishedAt) {
      parts.push(`published ${format(new Date(publishedAt), "d MMM yyyy")}`);
      if (isTeacher) parts.push("the teacher sees saved changes straight away");
    } else {
      parts.push(isTeacher ? "hidden from the teacher until published" : "not published");
    }
    if (dirty) parts.push("unsaved changes");
    status = parts.join(" · ");
  } else if (origin.source === "previous" && origin.previousMonth) {
    status = `New payslip · prefilled from the ${formatSalaryMonth(origin.previousMonth)} payslip`;
  } else if (origin.source === "copied" && origin.previousMonth) {
    status = `New payslip · copied from ${formatSalaryMonth(origin.previousMonth)}, not saved yet`;
  } else {
    status = "New payslip · prefilled from the staff profile";
  }

  const locked = !hasStaff || busy === "load";

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href={PAYSLIPS_PATH}>
              <ArrowLeft className="h-4 w-4" /> All payslips
            </Link>
          </Button>
          <div>
            <h2 className="flex flex-wrap items-center gap-2 text-lg font-bold leading-tight">
              {hasStaff ? `${form.fullName || "Payslip"} · ${formatSalaryMonth(form.salaryMonth)}` : "New payslip"}
              {hasStaff && (
                <span
                  className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
                    publishedAt
                      ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                      : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                  }`}
                >
                  {publishedAt ? "Published" : "Draft"}
                </span>
              )}
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground" suppressHydrationWarning>
              {status}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => handleSave()} disabled={!storageReady || !hasStaff || busy !== null} className="gap-1.5">
            {busy === "save" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {busy === "save" ? "Saving…" : "Save payslip"}
          </Button>
          {publishedAt ? (
            <Button variant="outline" onClick={handleUnpublish} disabled={!storageReady || busy !== null} className="gap-1.5">
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <EyeOff className="h-4 w-4" />}
              {busy === "publish" ? "Unpublishing…" : "Unpublish"}
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => handleSave(true)}
              disabled={!storageReady || !hasStaff || busy !== null}
              className="gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50 dark:border-emerald-700 dark:text-emerald-300 dark:hover:bg-emerald-950/40"
            >
              {busy === "publish" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {busy === "publish"
                ? "Publishing…"
                : payslipId && !dirty
                  ? isTeacher
                    ? "Publish to teacher"
                    : "Publish"
                  : "Save & publish"}
            </Button>
          )}
          <Button variant="outline" onClick={() => window.print()} disabled={!hasStaff || busy !== null} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={!hasStaff || busy !== null} className="gap-1.5">
            {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy === "pdf" ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {notice && (
        <div
          role={notice.tone === "error" ? "alert" : "status"}
          className={`flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.tone === "error"
              ? "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
              : "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          }`}
        >
          <span className="flex items-center gap-2">
            {notice.tone === "success" && <CheckCircle2 className="h-4 w-4 shrink-0" />}
            {notice.text}
          </span>
          <button type="button" aria-label="Dismiss" onClick={() => setNotice(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {!storageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Payslip storage isn&apos;t set up for this school yet, so payslips can be printed but not saved.
          Ask the platform administrator to run the tenant migrations.
        </div>
      )}

      {/* Totals strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Gross salary", value: totals.grossSalary },
          { label: "Total gross", value: totals.totalGross },
          { label: "Total deductions", value: totals.totalDeductions },
          { label: "Net salary", value: totals.netSalary, strong: true },
        ].map((item) => (
          <div
            key={item.label}
            className={`rounded-2xl border p-3 ${item.strong ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/30" : "bg-card"}`}
          >
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{item.label}</p>
            <p className={`mt-1 text-lg font-black ${item.value < 0 ? "text-red-600" : ""}`}>{formatCedis(item.value)}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,25rem)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,30rem)_minmax(0,1fr)]">
        {/* Form */}
        <div className="space-y-4">
          <FormSection title="Staff member and month">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Staff member *" className="sm:col-span-2">
                <select
                  className={inputClass}
                  value={pendingStaffId ?? form.staffId}
                  disabled={busy !== null}
                  onChange={(event) => handleStaffChange(event.target.value)}
                >
                  <option value="" disabled>
                    Select a staff member…
                  </option>
                  {teachers.length > 0 && (
                    <optgroup label="Teachers">
                      {teachers.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.employeeId})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {admins.length > 0 && (
                    <optgroup label="Administrators">
                      {admins.map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.name} ({option.employeeId})
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {staffMissing && (
                    <option value={form.staffId}>{form.fullName} (no longer on staff)</option>
                  )}
                </select>
              </Field>
              <Field label="Salary month *">
                <select
                  className={inputClass}
                  value={selectedMonth}
                  disabled={busy !== null}
                  onChange={(event) => handleMonthChange(`${selectedYear}-${event.target.value}`)}
                >
                  {MONTH_NAMES.map((name, index) => (
                    <option key={name} value={String(index + 1).padStart(2, "0")}>
                      {name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Year *">
                <select
                  className={inputClass}
                  value={selectedYear}
                  disabled={busy !== null}
                  onChange={(event) => handleMonthChange(`${event.target.value}-${selectedMonth}`)}
                >
                  {yearOptions(today, form.salaryMonth).map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </Field>
            </div>
            {busy === "load" && (
              <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading payslip details…
              </p>
            )}
            <p className="mt-3 flex items-start gap-2 rounded-lg bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>
                The school name, logo, address and contacts come from{" "}
                <Link href="/dashboard/settings" className="font-semibold text-primary hover:underline">
                  Settings
                </Link>
                . Everything else below can be edited for this payslip. Teachers only see a payslip under
                My Payslips once it is published.
              </span>
            </p>
          </FormSection>

          <fieldset disabled={locked} className="space-y-4">
            <FormSection title="Employee details">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Employee ID">
                  <input className={inputClass} value={form.employeeId} onChange={(e) => updateField("employeeId", e.target.value)} />
                </Field>
                <Field label="Title">
                  <input
                    className={inputClass}
                    list="payslip-title-options"
                    placeholder="Mr, Mrs, Miss…"
                    value={form.title}
                    onChange={(e) => updateField("title", e.target.value)}
                  />
                </Field>
                <Field label="Full name *" className="sm:col-span-2">
                  <input className={inputClass} value={form.fullName} onChange={(e) => updateField("fullName", e.target.value)} />
                </Field>
                <Field label="Designation">
                  <input
                    className={inputClass}
                    list="payslip-designation-options"
                    value={form.designation}
                    onChange={(e) => updateField("designation", e.target.value)}
                  />
                </Field>
                <Field label="Grade / level">
                  <input className={inputClass} value={form.gradeLevel} onChange={(e) => updateField("gradeLevel", e.target.value)} />
                </Field>
                <Field label="Phone number">
                  <input className={inputClass} type="tel" value={form.phone} onChange={(e) => updateField("phone", e.target.value)} />
                </Field>
                <Field label="Email">
                  <input className={inputClass} type="email" value={form.email} onChange={(e) => updateField("email", e.target.value)} />
                </Field>
              </div>
              <datalist id="payslip-title-options">
                {PAYSLIP_TITLE_SUGGESTIONS.map((title) => (
                  <option key={title} value={title} />
                ))}
              </datalist>
              <datalist id="payslip-designation-options">
                {DESIGNATION_SUGGESTIONS.map((designation) => (
                  <option key={designation} value={designation} />
                ))}
              </datalist>
            </FormSection>

            <FormSection title="Bank and SSNIT">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Bank">
                  <input className={inputClass} value={form.bankName} onChange={(e) => updateField("bankName", e.target.value)} />
                </Field>
                <Field label="Account number">
                  <input className={inputClass} value={form.accountNumber} onChange={(e) => updateField("accountNumber", e.target.value)} />
                </Field>
                <Field label="Bank branch">
                  <input className={inputClass} value={form.bankBranch} onChange={(e) => updateField("bankBranch", e.target.value)} />
                </Field>
                <Field label="SSNIT number">
                  <input className={inputClass} value={form.ssnitNumber} onChange={(e) => updateField("ssnitNumber", e.target.value)} />
                </Field>
                <Field label="SSNIT branch" className="sm:col-span-2">
                  <input className={inputClass} value={form.ssnitBranch} onChange={(e) => updateField("ssnitBranch", e.target.value)} />
                </Field>
              </div>
            </FormSection>

            {LINE_SECTIONS.map((config) => (
              <FormSection key={config.section} title={config.title} description={config.description}>
                <div className="space-y-2">
                  {form[config.section].length === 0 && (
                    <p className="rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                      {config.emptyText}
                    </p>
                  )}
                  {form[config.section].map((line) => (
                    <div key={line.key} className="grid grid-cols-[minmax(0,1fr)_7.5rem_auto] items-center gap-2">
                      <input
                        aria-label="Description"
                        placeholder="Description"
                        className={controlClass}
                        value={line.label}
                        onChange={(e) => updateLine(config.section, line.key, { label: e.target.value })}
                      />
                      <input
                        aria-label={`${line.label || "Line"} amount (GH₵)`}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        placeholder="0.00"
                        className={`${controlClass} text-right`}
                        value={line.amount}
                        onChange={(e) => updateLine(config.section, line.key, { amount: e.target.value })}
                      />
                      <button
                        type="button"
                        aria-label={`Remove ${line.label || "line"}`}
                        className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                        onClick={() => removeLine(config.section, line.key)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" onClick={() => addLine(config.section)}>
                      <Plus className="h-4 w-4" /> {config.addLabel}
                    </Button>
                    <p className="text-xs text-muted-foreground">
                      {config.totalLabel}:{" "}
                      <span className="font-semibold text-foreground">{formatCedis(totals[config.totalKey])}</span>
                    </p>
                  </div>
                </div>
              </FormSection>
            ))}

            <FormSection title="Footer">
              <div className="grid gap-3">
                <Field label="Prepared by">
                  <input className={inputClass} value={form.preparedBy} onChange={(e) => updateField("preparedBy", e.target.value)} />
                </Field>
                <Field label="Note">
                  <textarea
                    rows={2}
                    className={inputClass}
                    value={form.footerNote}
                    onChange={(e) => updateField("footerNote", e.target.value)}
                  />
                </Field>
              </div>
            </FormSection>
          </fieldset>
        </div>

        {/* Live preview */}
        <div className="space-y-2 xl:sticky xl:top-0 xl:max-h-[calc(100vh-7rem)] xl:self-start xl:overflow-y-auto">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Live preview</p>
          <div className="overflow-x-auto rounded-2xl border bg-muted/40 p-3">
            <PayslipDocument
              school={school}
              draft={draft}
              issuedAt={issuedAt}
              className="mx-auto min-w-[540px] max-w-[794px] shadow-sm"
            />
          </div>
        </div>
      </div>

      <DocumentPrintCopy printRef={printRef} capturing={capturing}>
        <div className="print-page">
          <PayslipDocument school={school} draft={draft} issuedAt={issuedAt} />
        </div>
      </DocumentPrintCopy>
    </div>
  );
}
