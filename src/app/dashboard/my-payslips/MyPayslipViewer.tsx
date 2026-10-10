"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Download, Loader2, Printer, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PayslipDocument } from "@/components/payslip/PayslipDocument";
import { DocumentPrintCopy, fileSafeName, useDocumentExport } from "@/components/print/DocumentExport";
import { formatSalaryMonth, type PayslipDraft, type PayslipSchool } from "@/lib/payslip";

export function MyPayslipViewer({
  school,
  draft,
  issuedAt,
}: {
  school: PayslipSchool;
  draft: PayslipDraft;
  issuedAt: string;
}) {
  const { printRef, capturing, downloadPdf } = useDocumentExport();
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDownloadPdf() {
    setExporting(true);
    setError(null);
    try {
      await downloadPdf(`Payslip_${fileSafeName(draft.fullName, "Staff")}_${draft.salaryMonth}.pdf`);
    } catch (cause) {
      console.error("Payslip PDF export failed:", cause);
      setError('Could not create the PDF. Use Print and choose "Save as PDF" instead.');
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border bg-card p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Button asChild variant="outline" size="sm" className="gap-1.5">
            <Link href="/dashboard/my-payslips">
              <ArrowLeft className="h-4 w-4" /> My payslips
            </Link>
          </Button>
          <div>
            <h1 className="text-lg font-bold leading-tight">
              Payslip · {formatSalaryMonth(draft.salaryMonth)}
            </h1>
            <p className="mt-0.5 text-xs text-muted-foreground">Print it or save a PDF copy for your records.</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => window.print()} className="gap-1.5">
            <Printer className="h-4 w-4" /> Print
          </Button>
          <Button variant="outline" onClick={handleDownloadPdf} disabled={exporting} className="gap-1.5">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {exporting ? "Preparing…" : "Download PDF"}
          </Button>
        </div>
      </div>

      {error && (
        <div
          role="alert"
          className="flex items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-300"
        >
          {error}
          <button type="button" aria-label="Dismiss" onClick={() => setError(null)}>
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border bg-muted/40 p-3">
        <PayslipDocument
          school={school}
          draft={draft}
          issuedAt={issuedAt}
          className="mx-auto min-w-[540px] max-w-[794px] shadow-sm"
        />
      </div>

      <DocumentPrintCopy printRef={printRef} capturing={capturing}>
        <div className="print-page">
          <PayslipDocument school={school} draft={draft} issuedAt={issuedAt} />
        </div>
      </DocumentPrintCopy>
    </div>
  );
}
