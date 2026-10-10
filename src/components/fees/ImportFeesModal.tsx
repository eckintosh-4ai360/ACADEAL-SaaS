"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, FileUp, Loader2 } from "lucide-react";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import { toast } from "react-toastify";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { importFeeEdits } from "@/lib/feeActions";
import {
  FEE_IMPORT_MAX_ROWS,
  normalizeFeeImportKey,
  parseFeeImportRows,
  type FeeImportRow,
  type FeeImportSummary,
} from "@/lib/fee-import";

interface ImportFeesModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type RawRow = Record<string, unknown>;

const PREVIEW_LIMIT = 25;

const hasContent = (row: RawRow) =>
  Object.values(row).some((value) => String(value ?? "").trim() !== "");

/**
 * The exported workbook leads with a "Summary" sheet, so the first sheet is the
 * wrong one to read. Pick whichever sheet actually carries a FEE_ID column.
 */
const readWorkbookRows = (workbook: XLSX.WorkBook): RawRow[] => {
  let fallback: RawRow[] = [];

  for (const sheetName of workbook.SheetNames) {
    const rows = XLSX.utils
      .sheet_to_json<RawRow>(workbook.Sheets[sheetName], { defval: "", raw: true })
      .filter(hasContent);

    if (rows.length === 0) continue;

    const headerKeys = Object.keys(rows[0]).map(normalizeFeeImportKey);
    if (headerKeys.includes("feeid")) {
      return rows;
    }

    if (fallback.length === 0) {
      fallback = rows;
    }
  }

  return fallback;
};

const parseUploadedFile = async (file: File): Promise<RawRow[]> => {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension === "xlsx" || extension === "xls") {
    const buffer = await file.arrayBuffer();
    return readWorkbookRows(XLSX.read(buffer, { type: "array" }));
  }

  if (extension === "csv") {
    const text = await file.text();
    const result = Papa.parse<RawRow>(text, {
      header: true,
      skipEmptyLines: true,
      dynamicTyping: false,
    });

    if (result.errors.length > 0) {
      throw new Error(result.errors[0].message);
    }

    return result.data.filter(hasContent);
  }

  throw new Error("Please upload an Excel (.xlsx, .xls) or CSV (.csv) file");
};

export function ImportFeesModal({ open, onOpenChange }: ImportFeesModalProps) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<FeeImportRow[]>([]);
  const [summary, setSummary] = useState<FeeImportSummary | null>(null);
  const [error, setError] = useState("");
  const [isBusy, setIsBusy] = useState(false);
  const [step, setStep] = useState<"upload" | "review" | "result">("upload");

  const reset = () => {
    setFileName("");
    setRows([]);
    setSummary(null);
    setError("");
    setStep("upload");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selected = event.target.files?.[0];
    if (!selected) return;

    setError("");
    setIsBusy(true);

    try {
      const rawRows = await parseUploadedFile(selected);

      if (rawRows.length === 0) {
        setError("That file has no fee rows. Export the payment list first, then edit it.");
        return;
      }

      if (rawRows.length > FEE_IMPORT_MAX_ROWS) {
        setError(
          `This file has ${rawRows.length} rows. Imports are limited to ${FEE_IMPORT_MAX_ROWS} rows at a time — split the file and import each part.`
        );
        return;
      }

      const parsedRows = parseFeeImportRows(rawRows);
      const preview = await importFeeEdits(parsedRows);

      if (!preview.success || !preview.summary) {
        setError(preview.message);
        return;
      }

      setFileName(selected.name);
      setRows(parsedRows);
      setSummary(preview.summary);
      setStep("review");
    } catch (err) {
      console.error("Fee import parse error:", err);
      setError(
        err instanceof Error ? err.message : "Failed to read the file. Check the format and try again."
      );
    } finally {
      setIsBusy(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleApply = async () => {
    setIsBusy(true);
    setError("");

    try {
      const result = await importFeeEdits(rows, { apply: true });

      if (!result.success || !result.summary) {
        setError(result.message);
        toast.error(result.message);
        return;
      }

      setSummary(result.summary);
      setStep("result");
      toast.success(`✅ ${result.message}`);
      router.refresh();
    } catch (err) {
      console.error("Fee import error:", err);
      setError("Failed to apply the import. Please try again.");
    } finally {
      setIsBusy(false);
    }
  };

  const changeCount = summary?.changes.length ?? 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Edited Fees</DialogTitle>
          <DialogDescription>
            Export the payment list, edit it in Excel, then upload it here to apply the changes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {step === "upload" && (
            <div className="space-y-4">
              <div className="rounded-lg border-2 border-dashed border-gray-300 p-6 text-center dark:border-white/15">
                <FileUp className="mx-auto mb-4 h-12 w-12 text-gray-400" />
                <p className="mb-2 text-sm font-medium text-foreground">
                  Upload the edited payment list
                </p>
                <p className="mb-4 text-xs text-muted-foreground">
                  Excel (.xlsx, .xls) or CSV (.csv) — up to {FEE_IMPORT_MAX_ROWS} rows per file
                </p>
                <Input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileSelect}
                  disabled={isBusy}
                  className="cursor-pointer"
                />
              </div>

              {isBusy && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Reading the file…
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-500/20 dark:bg-blue-500/10">
                <p className="mb-2 text-sm font-medium text-blue-900 dark:text-blue-200">
                  How matching works
                </p>
                <ul className="space-y-1 text-xs text-blue-800 dark:text-blue-300">
                  <li>
                    <span className="font-semibold">FEE_ID</span> is required — it is how each row
                    finds its fee record. Do not edit or delete that column.
                  </li>
                  <li>
                    Editable columns: <span className="font-semibold">FEE_ITEM</span>,{" "}
                    <span className="font-semibold">TOTAL_GHS</span>,{" "}
                    <span className="font-semibold">PAID_GHS</span>,{" "}
                    <span className="font-semibold">TERM</span>,{" "}
                    <span className="font-semibold">ACADEMIC_YEAR</span>. Every other column is
                    ignored.
                  </li>
                  <li>
                    Payment status is recalculated from the total and paid amounts — you do not set
                    it in the file.
                  </li>
                  <li>
                    Rows whose STUDENT_ID no longer matches their FEE_ID are rejected, so a sorted
                    or shifted sheet cannot be written to the wrong student.
                  </li>
                  <li>
                    Editing a paid amount here does not create a payment record or send a receipt.
                    Use Record Payment for money actually received.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {step === "review" && summary && (
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground">
                {fileName} — nothing has been saved yet.
              </p>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-500/20 dark:bg-amber-500/10">
                  <p className="text-xs font-medium text-amber-900 dark:text-amber-200">
                    Will change
                  </p>
                  <p className="text-2xl font-bold text-amber-600 dark:text-amber-300">
                    {changeCount}
                  </p>
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-white/10 dark:bg-white/[0.04]">
                  <p className="text-xs font-medium text-foreground">Unchanged</p>
                  <p className="text-2xl font-bold text-muted-foreground">{summary.unchanged}</p>
                </div>
                <div
                  className={`rounded-lg border p-4 ${
                    summary.errors.length > 0
                      ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
                      : "border-emerald-200 bg-emerald-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  }`}
                >
                  <p className="text-xs font-medium text-foreground">Rejected rows</p>
                  <p
                    className={`text-2xl font-bold ${
                      summary.errors.length > 0
                        ? "text-red-600 dark:text-red-300"
                        : "text-emerald-600 dark:text-emerald-300"
                    }`}
                  >
                    {summary.errors.length}
                  </p>
                </div>
              </div>

              {changeCount > 0 && (
                <div>
                  <h3 className="mb-2 text-sm font-medium text-foreground">
                    Changes {changeCount > PREVIEW_LIMIT ? `(first ${PREVIEW_LIMIT} of ${changeCount})` : ""}
                  </h3>
                  <div className="max-h-72 overflow-auto rounded-lg border border-slate-200 dark:border-white/10">
                    <table className="w-full text-xs">
                      <thead className="sticky top-0 bg-slate-100 dark:bg-white/[0.06]">
                        <tr>
                          <th className="px-2 py-2 text-left">Row</th>
                          <th className="px-2 py-2 text-left">Student</th>
                          <th className="px-2 py-2 text-left">Fee</th>
                          <th className="px-2 py-2 text-left">Changes</th>
                        </tr>
                      </thead>
                      <tbody>
                        {summary.changes.slice(0, PREVIEW_LIMIT).map((change) => (
                          <tr key={change.feeId} className="border-t border-slate-100 dark:border-white/5">
                            <td className="px-2 py-2 align-top text-muted-foreground">
                              {change.rowNumber}
                            </td>
                            <td className="px-2 py-2 align-top">
                              <div className="font-medium text-foreground">{change.studentName}</div>
                              <div className="text-[11px] text-muted-foreground">
                                {change.studentId}
                              </div>
                            </td>
                            <td className="px-2 py-2 align-top">{change.feeTitle}</td>
                            <td className="px-2 py-2 align-top">
                              <div className="space-y-1">
                                {change.changes.map((field) => (
                                  <div key={field.field}>
                                    <span className="font-medium">{field.field}:</span>{" "}
                                    <span className="text-muted-foreground line-through">
                                      {field.from}
                                    </span>{" "}
                                    <span className="text-emerald-700 dark:text-emerald-300">
                                      → {field.to}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {summary.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
                  <p className="mb-2 text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    These rows will be skipped:
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {summary.errors.slice(0, PREVIEW_LIMIT).map((issue) => (
                      <p
                        key={`${issue.rowNumber}-${issue.message}`}
                        className="text-xs text-yellow-800 dark:text-yellow-300"
                      >
                        Row {issue.rowNumber}: {issue.message}
                      </p>
                    ))}
                    {summary.errors.length > PREVIEW_LIMIT && (
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        …and {summary.errors.length - PREVIEW_LIMIT} more.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {changeCount > 0 && (
                <div className="rounded-lg border border-amber-200 bg-amber-50/80 px-4 py-2.5 text-xs text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                  ⚠️ Applying this import overwrites the stored fee records and is logged in the
                  audit trail. Changes are irreversible.
                </div>
              )}

              {error && (
                <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-300">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
                  {error}
                </div>
              )}

              <div className="flex gap-2">
                <Button onClick={reset} variant="outline" className="flex-1" disabled={isBusy}>
                  Back
                </Button>
                <Button
                  onClick={handleApply}
                  disabled={isBusy || changeCount === 0}
                  className="flex-1"
                >
                  {isBusy ? "Applying…" : `Apply ${changeCount} change${changeCount === 1 ? "" : "s"}`}
                </Button>
              </div>
            </div>
          )}

          {step === "result" && summary && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-green-200 bg-green-50 p-4 dark:border-emerald-500/20 dark:bg-emerald-500/10">
                  <div className="mb-2 flex items-center gap-2">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-emerald-300" />
                    <p className="font-medium text-green-900 dark:text-emerald-200">Updated</p>
                  </div>
                  <p className="text-2xl font-bold text-green-600 dark:text-emerald-300">
                    {summary.applied}
                  </p>
                </div>
                <div
                  className={`rounded-lg border p-4 ${
                    summary.errors.length > 0
                      ? "border-red-200 bg-red-50 dark:border-red-500/20 dark:bg-red-500/10"
                      : "border-green-200 bg-green-50 dark:border-emerald-500/20 dark:bg-emerald-500/10"
                  }`}
                >
                  <div className="mb-2 flex items-center gap-2">
                    {summary.errors.length > 0 && (
                      <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-300" />
                    )}
                    <p className="font-medium text-foreground">Skipped</p>
                  </div>
                  <p
                    className={`text-2xl font-bold ${
                      summary.errors.length > 0
                        ? "text-red-600 dark:text-red-300"
                        : "text-green-600 dark:text-emerald-300"
                    }`}
                  >
                    {summary.errors.length}
                  </p>
                </div>
              </div>

              {summary.errors.length > 0 && (
                <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 dark:border-yellow-500/20 dark:bg-yellow-500/10">
                  <p className="mb-2 text-sm font-medium text-yellow-900 dark:text-yellow-200">
                    Skipped rows:
                  </p>
                  <div className="max-h-40 space-y-1 overflow-y-auto">
                    {summary.errors.slice(0, PREVIEW_LIMIT).map((issue) => (
                      <p
                        key={`${issue.rowNumber}-${issue.message}`}
                        className="text-xs text-yellow-800 dark:text-yellow-300"
                      >
                        Row {issue.rowNumber}: {issue.message}
                      </p>
                    ))}
                    {summary.errors.length > PREVIEW_LIMIT && (
                      <p className="text-xs text-yellow-800 dark:text-yellow-300">
                        …and {summary.errors.length - PREVIEW_LIMIT} more.
                      </p>
                    )}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} className="w-full">
                Close
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
