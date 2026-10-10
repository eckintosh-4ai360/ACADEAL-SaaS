"use client";

import { useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FinanceReport, InventoryReport } from "@/lib/operations-report-types";

type ReportKind = "inventory" | "finance";
type ReportFormat = "excel" | "pdf";

export function OperationsReportExport({ kind }: { kind: ReportKind }) {
  const [busy, setBusy] = useState<ReportFormat | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function exportReport(format: ReportFormat) {
    setBusy(format);
    setError(null);
    try {
      const response = await fetch(`/api/reports/${kind}`, { cache: "no-store" });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "Unable to load the complete report.");
      }

      const exports = await import("@/lib/operations-report-export");
      if (kind === "inventory") {
        const report = (await response.json()) as InventoryReport;
        if (format === "excel") exports.exportInventoryReportExcel(report);
        else exports.exportInventoryReportPdf(report);
      } else {
        const report = (await response.json()) as FinanceReport;
        if (format === "excel") exports.exportFinanceReportExcel(report);
        else exports.exportFinanceReportPdf(report);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to export the report.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-full text-xs text-slate-300">Complete report, including all pages</span>
      <Button variant="outline" size="sm" className="gap-2 bg-white text-slate-900 hover:bg-slate-100"
        disabled={busy !== null} onClick={() => exportReport("excel")}>
        <Download className="h-4 w-4" /> {busy === "excel" ? "Preparing..." : "Export Excel"}
      </Button>
      <Button variant="outline" size="sm" className="gap-2 bg-white text-slate-900 hover:bg-slate-100"
        disabled={busy !== null} onClick={() => exportReport("pdf")}>
        <Download className="h-4 w-4" /> {busy === "pdf" ? "Preparing..." : "Export PDF"}
      </Button>
      {error && <p role="alert" className="w-full text-sm text-red-200">{error}</p>}
    </div>
  );
}
