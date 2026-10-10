"use client";

import { useState } from "react";
import { flushSync } from "react-dom";
import { useRouter } from "next/navigation";
import {
  CheckCircle2, Download, EyeOff, FileText, Loader2, Printer, RefreshCw, Send, Trash2, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentPrintCopy, fileSafeName, useDocumentExport } from "@/components/print/DocumentExport";
import { StudentBillDocument } from "@/components/student-bill/StudentBillDocument";
import {
  deleteStudentBill,
  generateStudentBills,
  publishStudentBills,
  setStudentBillPublished,
} from "@/lib/studentBillActions";
import { formatCedis } from "@/lib/cedis";
import type { SchoolLetterhead } from "@/lib/school-letterhead";
import { toBillDateInput, type StudentBillTemplate, type StudentBillView } from "@/lib/student-bill";
import { formatTermLabel } from "@/lib/termUtils";

export type StudentBillsPanelData = {
  storageReady: boolean;
  templates: StudentBillTemplate[];
  selectedTemplateId: number | null;
  bills: StudentBillView[];
  school: SchoolLetterhead;
  //* From Settings > reopening date, used until a template's bills carry one.
  defaultResumptionDate: string | null;
};

type Notice = { tone: "error" | "success"; text: string };

const inputClass = "mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm";

function templateLabel(template: StudentBillTemplate) {
  return `${template.label} · ${formatTermLabel(template.term)} · ${template.academicYear} · ${formatCedis(template.totalAmount)}`;
}

function StatusBadge({ publishedAt }: { publishedAt: string | null }) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${
        publishedAt
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
      }`}
    >
      {publishedAt ? "Published" : "Draft"}
    </span>
  );
}

export function StudentBillsPanel({
  storageReady,
  templates,
  selectedTemplateId,
  bills,
  school,
  defaultResumptionDate,
}: StudentBillsPanelData) {
  const router = useRouter();
  const template = templates.find((item) => item.id === selectedTemplateId) ?? null;
  const latest = bills[0] ?? null;
  const [resumptionDate, setResumptionDate] = useState(
    toBillDateInput(latest?.resumptionDate ?? defaultResumptionDate)
  );
  const [notes, setNotes] = useState(latest?.notes ?? "");
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [viewing, setViewing] = useState<StudentBillView | null>(null);
  const { printRef, capturing, downloadPdf } = useDocumentExport();

  const drafts = bills.filter((bill) => !bill.publishedAt);
  const grandTotal = bills.reduce((sum, bill) => sum + bill.grandTotal, 0);
  //* The print copy holds the bill being viewed, or every bill for "Print all".
  const printBills = viewing ? [viewing] : bills;

  async function run(key: string, task: () => Promise<void>) {
    setBusy(key);
    setNotice(null);
    try {
      await task();
    } catch {
      setNotice({ tone: "error", text: "Could not reach the server. Check your connection and try again." });
    } finally {
      setBusy(null);
    }
  }

  function selectTemplate(id: string) {
    setViewing(null);
    setNotice(null);
    router.push(id ? `/dashboard/fees?tab=generate&billTemplate=${id}` : "/dashboard/fees?tab=generate");
  }

  function handleGenerate() {
    if (!template) return;
    return run("generate", async () => {
      const result = await generateStudentBills({ termBillId: template.id, resumptionDate, notes });
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      const parts = [];
      if (result.created) parts.push(`${result.created} new`);
      if (result.updated) parts.push(`${result.updated} refreshed`);
      setNotice({ tone: "success", text: `Bills ready for ${template.label}: ${parts.join(", ")}.` });
      router.refresh();
    });
  }

  function handlePublishAll() {
    if (drafts.length === 0) return;
    const confirmed = window.confirm(
      `Publish ${drafts.length} draft bill${drafts.length === 1 ? "" : "s"}? Students and their parents will see them under My Fees.`
    );
    if (!confirmed) return;
    return run("publish-all", async () => {
      const result = await publishStudentBills(drafts.map((bill) => bill.id));
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setNotice({ tone: "success", text: `Published ${result.count} bill${result.count === 1 ? "" : "s"}.` });
      router.refresh();
    });
  }

  function handleTogglePublished(bill: StudentBillView) {
    return run(`publish-${bill.id}`, async () => {
      const result = await setStudentBillPublished(bill.id, !bill.publishedAt);
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      if (viewing?.id === bill.id) setViewing({ ...bill, publishedAt: result.publishedAt });
      router.refresh();
    });
  }

  function handleDelete(bill: StudentBillView) {
    const warning = bill.publishedAt ? " The student and parent will no longer see it." : "";
    if (!window.confirm(`Delete ${bill.billNumber} for ${bill.studentName}?${warning}`)) return;
    return run(`delete-${bill.id}`, async () => {
      const result = await deleteStudentBill(bill.id);
      if (!result.success) {
        setNotice({ tone: "error", text: result.error });
        return;
      }
      setViewing(null);
      router.refresh();
    });
  }

  function handlePrintAll() {
    flushSync(() => setViewing(null));
    window.print();
  }

  async function handleDownloadPdf(bill: StudentBillView) {
    setBusy("pdf");
    setNotice(null);
    try {
      await downloadPdf(`Bill_${fileSafeName(bill.studentName, "Student")}_${bill.academicYear}_${bill.term}.pdf`);
    } catch (error) {
      console.error("Student bill PDF export failed:", error);
      setNotice({ tone: "error", text: 'Could not create the PDF. Use Print and choose "Save as PDF" instead.' });
    } finally {
      setBusy(null);
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border bg-card p-4">
      <div>
        <h3 className="text-base font-bold">Student bills</h3>
        <p className="text-sm text-muted-foreground">
          Turn a Prepare Bill template into a printable bill for every student it covers. Students and parents
          see a bill under My Fees once it is published.
        </p>
      </div>

      {!storageReady && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
          Student bill storage isn&apos;t set up for this school yet. Ask the platform administrator to run the
          tenant migrations.
        </div>
      )}

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

      {templates.length === 0 ? (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No bill templates yet. Create one in the Prepare Bill tab first.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_12rem]">
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Bill template</span>
            <select
              className={inputClass}
              value={selectedTemplateId ?? ""}
              onChange={(event) => selectTemplate(event.target.value)}
            >
              <option value="">Choose a class, level or group…</option>
              {templates.map((item) => (
                <option key={item.id} value={item.id}>
                  {templateLabel(item)}
                  {item.billCount > 0 ? ` (${item.publishedCount}/${item.billCount} published)` : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-semibold text-muted-foreground">Resumption date</span>
            <input
              type="date"
              className={inputClass}
              value={resumptionDate}
              disabled={!template}
              onChange={(event) => setResumptionDate(event.target.value)}
            />
          </label>
          <label className="block lg:col-span-2">
            <span className="text-xs font-semibold text-muted-foreground">NB notes printed on every bill</span>
            <textarea
              rows={4}
              className={inputClass}
              value={notes}
              disabled={!template}
              placeholder={
                "e.g. 30% of your ward's fees should be paid before or on resumption.\n" +
                "FEES: <bank> A/C NO. <number> · MOMO PAY: Merchant ID <id>\n" +
                "P.T.A General Meeting: <date and time>"
              }
              onChange={(event) => setNotes(event.target.value)}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2 lg:col-span-2">
            <Button onClick={handleGenerate} disabled={!template || !storageReady || busy !== null} className="gap-2">
              {busy === "generate" ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {bills.length > 0 ? "Refresh bills" : "Generate bills"}
            </Button>
            {template && (
              <p className="text-xs text-muted-foreground">
                {bills.length > 0
                  ? "Refreshing reapplies the template items, arrears, resumption date and notes to every bill."
                  : "Creates one bill per student, with arrears carried from earlier terms."}
              </p>
            )}
          </div>
        </div>
      )}

      {template && bills.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {[
              { label: "Bills", value: String(bills.length) },
              { label: "Published", value: `${bills.length - drafts.length} of ${bills.length}` },
              { label: "Grand total", value: formatCedis(grandTotal) },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border p-3">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{stat.label}</p>
                <p className="mt-1 text-lg font-black">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              onClick={handlePublishAll}
              disabled={!storageReady || busy !== null || drafts.length === 0}
              className="gap-2 bg-emerald-600 text-white hover:bg-emerald-700"
            >
              {busy === "publish-all" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              {drafts.length === 0 ? "All published" : `Publish to parents & students (${drafts.length})`}
            </Button>
            <Button variant="outline" onClick={handlePrintAll} disabled={busy !== null} className="gap-2">
              <Printer className="h-4 w-4" /> Print all ({bills.length})
            </Button>
          </div>

          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[820px] text-sm">
              <thead className="bg-muted/30 text-left">
                <tr>
                  <th className="px-3 py-2.5 text-xs font-semibold">Bill No</th>
                  <th className="px-3 py-2.5 text-xs font-semibold">Student</th>
                  <th className="px-3 py-2.5 text-xs font-semibold">Class</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold">Term bill</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold">Arrears</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold">Grand total</th>
                  <th className="px-3 py-2.5 text-xs font-semibold">Status</th>
                  <th className="px-3 py-2.5 text-xs font-semibold">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-t transition-colors hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs">{bill.billNumber}</td>
                    <td className="px-3 py-2">
                      <button type="button" className="font-medium hover:underline" onClick={() => setViewing(bill)}>
                        {bill.studentName}
                      </button>
                      <p className="text-xs text-muted-foreground">{bill.studentCode}</p>
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{bill.className || "—"}</td>
                    <td className="px-3 py-2 text-right">{formatCedis(bill.totalAmount)}</td>
                    <td className="px-3 py-2 text-right">{bill.arrears > 0 ? formatCedis(bill.arrears) : "—"}</td>
                    <td className="px-3 py-2 text-right font-bold">{formatCedis(bill.grandTotal)}</td>
                    <td className="px-3 py-2">
                      <StatusBadge publishedAt={bill.publishedAt} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="sm" onClick={() => setViewing(bill)}>
                          View
                        </Button>
                        <button
                          type="button"
                          aria-label={bill.publishedAt ? `Unpublish ${bill.billNumber}` : `Publish ${bill.billNumber}`}
                          title={bill.publishedAt ? "Unpublish" : "Publish"}
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-muted disabled:opacity-50"
                          disabled={busy !== null}
                          onClick={() => handleTogglePublished(bill)}
                        >
                          {busy === `publish-${bill.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : bill.publishedAt ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Send className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          aria-label={`Delete ${bill.billNumber}`}
                          title="Delete"
                          className="rounded-md p-2 text-muted-foreground transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:hover:bg-red-950/40"
                          disabled={busy !== null}
                          onClick={() => handleDelete(bill)}
                        >
                          {busy === `delete-${bill.id}` ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {template && bills.length === 0 && storageReady && (
        <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          <FileText className="mx-auto mb-2 h-8 w-8 opacity-40" />
          No bills for this template yet. Set the resumption date and notes, then click Generate bills.
        </div>
      )}

      {viewing && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${viewing.billNumber} for ${viewing.studentName}`}
          className="fixed inset-0 z-50 overflow-y-auto bg-black/50 p-4"
        >
          <div className="mx-auto max-w-4xl space-y-3 rounded-2xl bg-card p-4 shadow-2xl">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <h3 className="font-bold">
                  {viewing.billNumber} · {viewing.studentName}
                </h3>
                <StatusBadge publishedAt={viewing.publishedAt} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => window.print()} className="gap-1.5">
                  <Printer className="h-4 w-4" /> Print
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDownloadPdf(viewing)}
                  disabled={busy !== null}
                  className="gap-1.5"
                >
                  {busy === "pdf" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Download PDF
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleTogglePublished(viewing)}
                  disabled={busy !== null}
                  className="gap-1.5"
                >
                  {viewing.publishedAt ? <EyeOff className="h-4 w-4" /> : <Send className="h-4 w-4" />}
                  {viewing.publishedAt ? "Unpublish" : "Publish"}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setViewing(null)} aria-label="Close">
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl bg-muted/40 p-3">
              <StudentBillDocument
                school={school}
                bill={viewing}
                className="mx-auto min-w-[560px] max-w-[794px] shadow-sm"
              />
            </div>
          </div>
        </div>
      )}

      <DocumentPrintCopy printRef={printRef} capturing={capturing}>
        {printBills.map((bill) => (
          <div key={bill.id} className="print-page">
            <StudentBillDocument school={school} bill={bill} />
          </div>
        ))}
      </DocumentPrintCopy>
    </section>
  );
}
