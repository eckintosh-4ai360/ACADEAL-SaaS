"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  FileDown,
  FileText,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import { saveExcursionCampaign, recordExcursionPayment } from "@/lib/actions";
import {
  buildExcursionLedgerRows,
  exportExcursionLedgerToExcel,
  exportExcursionLedgerToPDF,
} from "@/lib/excursion-export";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { FilterSelect } from "@/components/ui/filter-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type ExcursionClassOption = {
  id: number;
  name: string;
};

type ExcursionCampaignData = {
  id: number;
  title: string;
  targetAmount: number;
};

type ExcursionStudentRow = {
  id: string;
  name: string;
  surname: string;
  studentId: string;
  paidAmount: number;
  paymentCount: number;
  lastPaymentAt: string | null;
};

type SelectedClassData = {
  id: number;
  name: string;
  gradeLevel: number;
  supervisorName: string | null;
};

type FeedbackState =
  | {
      type: "success" | "error";
      message: string;
    }
  | null;

type ExportScope = "all" | "paid" | "outstanding";

const EXPORT_SCOPE_OPTIONS: Array<{ value: ExportScope; label: string }> = [
  { value: "all", label: "All" },
  { value: "paid", label: "Paid" },
  { value: "outstanding", label: "Outstanding" },
];

function getExportScopeLabel(scope: ExportScope) {
  switch (scope) {
    case "paid":
      return "Paid Students";
    case "outstanding":
      return "Outstanding Students";
    default:
      return "All Students";
  }
}

function getExportScopeRows(rows: ReturnType<typeof buildExcursionLedgerRows>, scope: ExportScope) {
  if (scope === "paid") {
    return rows.filter((row) => row.status === "Paid");
  }

  if (scope === "outstanding") {
    return rows.filter((row) => row.status !== "Paid");
  }

  return rows;
}

function isStudentInScope(
  paidAmount: number,
  targetAmount: number | null,
  scope: ExportScope
) {
  if (scope === "all") {
    return true;
  }

  if (targetAmount == null || targetAmount <= 0) {
    return scope === "outstanding";
  }

  const isPaid = paidAmount >= targetAmount;
  return scope === "paid" ? isPaid : !isPaid;
}

function getEmptyScopeMessage(scope: ExportScope) {
  if (scope === "paid") {
    return "No paid students found for this class yet.";
  }

  if (scope === "outstanding") {
    return "No outstanding students left in this class.";
  }

  return "No students were found for this class.";
}

interface ExcursionTrackerProps {
  isAdmin: boolean;
  classes: ExcursionClassOption[];
  selectedClass: SelectedClassData;
  campaign: ExcursionCampaignData | null;
  students: ExcursionStudentRow[];
}

function formatCurrency(amount: number) {
  try {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: "GHS",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `GHS ${amount.toFixed(2)}`;
  }
}

function getStatusBadge(
  paidAmount: number,
  targetAmount: number | null
): { label: string; className: string } {
  if (targetAmount == null || targetAmount <= 0) {
    return {
      label: "Awaiting setup",
      className: "border-slate-200 bg-slate-100 text-slate-700",
    };
  }

  if (paidAmount >= targetAmount) {
    return {
      label: "Completed",
      className: "border-emerald-200 bg-emerald-50 text-emerald-700",
    };
  }

  if (paidAmount > 0) {
    return {
      label: "In progress",
      className: "border-amber-200 bg-amber-50 text-amber-700",
    };
  }

  return {
    label: "Not started",
    className: "border-slate-200 bg-slate-100 text-slate-700",
  };
}

export function ExcursionTracker({
  isAdmin,
  classes,
  selectedClass,
  campaign,
  students,
}: ExcursionTrackerProps) {
  const router = useRouter();
  const [campaignTitle, setCampaignTitle] = useState(campaign?.title ?? "");
  const [targetAmount, setTargetAmount] = useState(
    campaign ? campaign.targetAmount.toFixed(2) : ""
  );
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, string>>({});
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);
  const [exportScope, setExportScope] = useState<ExportScope>("all");

  const totalCollected = students.reduce((sum, student) => sum + student.paidAmount, 0);
  const totalTarget = campaign ? campaign.targetAmount * students.length : 0;
  const completedStudents = campaign
    ? students.filter((student) => student.paidAmount >= campaign.targetAmount).length
    : 0;
  const remainingTotal = campaign ? Math.max(totalTarget - totalCollected, 0) : 0;
  const exportRows = buildExcursionLedgerRows(students, campaign?.targetAmount ?? null);
  const exportScopeRows = getExportScopeRows(exportRows, exportScope);
  const exportScopeLabel = getExportScopeLabel(exportScope);
  const tableRows = students.filter((student) =>
    isStudentInScope(student.paidAmount, campaign?.targetAmount ?? null, exportScope)
  );
  const hasExportRows = exportScopeRows.length > 0;
  const canExport = Boolean(campaign);

  const exportContext = {
    className: selectedClass.name,
    gradeLevel: selectedClass.gradeLevel,
    supervisorName: selectedClass.supervisorName,
    excursionTitle: campaign?.title || campaignTitle || "Excursion",
    targetAmount: campaign?.targetAmount ?? null,
    scopeLabel: exportScopeLabel,
    exportMode: exportScope,
    generatedAt: new Date(),
  };

  const handleExportExcel = () => {
    if (!canExport) {
      setFeedback({ type: "error", message: "Set the excursion target before exporting." });
      return;
    }

    if (!hasExportRows) {
      setFeedback({
        type: "error",
        message:
          exportScope === "all"
            ? "No students are available to export."
            : `No ${exportScopeLabel.toLowerCase()} are available to export.`,
      });
      return;
    }

    exportExcursionLedgerToExcel(exportContext, exportScopeRows);
  };

  const handleExportPDF = () => {
    if (!canExport) {
      setFeedback({ type: "error", message: "Set the excursion target before exporting." });
      return;
    }

    if (!hasExportRows) {
      setFeedback({
        type: "error",
        message:
          exportScope === "all"
            ? "No students are available to export."
            : `No ${exportScopeLabel.toLowerCase()} are available to export.`,
      });
      return;
    }

    exportExcursionLedgerToPDF(exportContext, exportScopeRows);
  };

  const handleSaveCampaign = async () => {
    const parsedTarget = Number.parseFloat(targetAmount);

    if (!campaignTitle.trim()) {
      setFeedback({ type: "error", message: "Excursion title is required." });
      return;
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFeedback({ type: "error", message: "Enter a valid excursion target amount." });
      return;
    }

    setSavingCampaign(true);
    setFeedback(null);

    const result = await saveExcursionCampaign(
      { success: false, error: false },
      {
        id: campaign?.id,
        classId: selectedClass.id,
        title: campaignTitle.trim(),
        targetAmount: parsedTarget,
      }
    );

    setSavingCampaign(false);

    if (result.success) {
      setFeedback({
        type: "success",
        message: result.message || "Excursion target saved successfully.",
      });
      router.refresh();
      return;
    }

    setFeedback({
      type: "error",
      message: result.message || "Failed to save excursion target.",
    });
  };

  const handleRecordPayment = async (studentId: string) => {
    if (!campaign) {
      setFeedback({ type: "error", message: "Set the excursion target first." });
      return;
    }

    const rawAmount = paymentDrafts[studentId]?.trim() || "";
    const parsedAmount = Number.parseFloat(rawAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: "error", message: "Enter a valid payment amount." });
      return;
    }

    const currentStudent = students.find((student) => student.id === studentId);
    const remaining = currentStudent
      ? Math.max(campaign.targetAmount - currentStudent.paidAmount, 0)
      : 0;

    if (remaining <= 0) {
      setFeedback({ type: "error", message: "This student has already met the target." });
      return;
    }

    setSavingStudentId(studentId);
    setFeedback(null);

    const result = await recordExcursionPayment(
      { success: false, error: false },
      {
        campaignId: campaign.id,
        studentId,
        amount: parsedAmount,
      }
    );

    setSavingStudentId(null);

    if (result.success) {
      setPaymentDrafts((prev) => ({
        ...prev,
        [studentId]: "",
      }));
      setFeedback({
        type: "success",
        message: result.message || "Payment recorded successfully.",
      });
      router.refresh();
      return;
    }

    setFeedback({
      type: "error",
      message: result.message || "Failed to record payment.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Excursion Tracker</h1>
          <p className="mt-1 text-muted-foreground">
            Track excursion contributions in real time for the selected class.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedClass.name} - Grade {selectedClass.gradeLevel}
            {selectedClass.supervisorName ? ` - Supervisor ${selectedClass.supervisorName}` : ""}
          </p>
        </div>

        {isAdmin && classes.length > 0 && (
          <FilterSelect
            options={classes.map((item) => ({
              label: item.name,
              value: item.id.toString(),
            }))}
            paramName="classId"
            placeholder="Select class"
            className="min-w-[220px]"
          />
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Target Per Student"
          value={campaign ? formatCurrency(campaign.targetAmount) : "-"}
          description="Each student is tracked against the same excursion target."
          icon={Users}
          tone="sky"
          badge="Target"
          detail={campaign ? "Live campaign" : "No target set"}
        />

        <DashboardMetricCard
          title="Collected"
          value={formatCurrency(totalCollected)}
          description="Total amount already paid across the selected class."
          icon={Banknote}
          tone="emerald"
          badge="Payments"
          detail={`${students.length} student${students.length === 1 ? "" : "s"}`}
        />

        <DashboardMetricCard
          title="Completed Students"
          value={students.length > 0 ? `${completedStudents}/${students.length}` : "0"}
          description="Students who have already met the excursion target."
          icon={CheckCircle2}
          tone="violet"
          badge="Status"
          detail={campaign ? "Reached target" : "Pending setup"}
        />

        <DashboardMetricCard
          title="Remaining Balance"
          value={campaign ? formatCurrency(remainingTotal) : "-"}
          description="Outstanding class balance still waiting to be recorded."
          icon={Clock3}
          tone="amber"
          badge="Balance"
          detail={campaign ? "Across the class" : "No target set"}
        />
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Excursion Setup</CardTitle>
          <CardDescription>
            Set the target amount for this class, then record partial payments student by student.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {feedback && (
            <div
              className={`rounded-xl border px-4 py-3 text-sm ${
                feedback.type === "success"
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-rose-200 bg-rose-50 text-rose-700"
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="grid gap-4 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="excursion-title">Excursion title</Label>
              <Input
                id="excursion-title"
                value={campaignTitle}
                onChange={(e) => setCampaignTitle(e.target.value)}
                placeholder="Enter excursion title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="excursion-target">Target amount per student</Label>
              <Input
                id="excursion-target"
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                placeholder="0.00"
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleSaveCampaign} disabled={savingCampaign} className="w-full">
                {savingCampaign ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    {campaign ? "Update target" : "Start excursion"}
                  </>
                )}
              </Button>
            </div>
          </div>

          {!campaign && (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
              Set the excursion target above to unlock payment entry for the students below.
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <CardTitle>Class Ledger</CardTitle>
            <CardDescription>
              Spreadsheet-style payment tracking for the selected class. 
            </CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Tabs value={exportScope} onValueChange={(value) => setExportScope(value as ExportScope)}>
              <TabsList className="h-9 rounded-full bg-muted/40 p-1">
                {EXPORT_SCOPE_OPTIONS.map((option) => (
                  <TabsTrigger
                    key={option.value}
                    value={option.value}
                    className="h-7 rounded-full px-3 text-xs"
                  >
                    {option.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {tableRows.length} shown
              {exportScope !== "all" ? ` of ${students.length}` : ""}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportExcel}
              disabled={!canExport}
            >
              <FileDown className="mr-2 h-4 w-4" />
              Excel
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExportPDF}
              disabled={!canExport}
            >
              <FileText className="mr-2 h-4 w-4" />
              PDF
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b text-left">
                  <th className="p-3 font-medium">S/N</th>
                  <th className="p-3 font-medium">Student</th>
                  <th className="p-3 font-medium">Target</th>
                  <th className="p-3 font-medium">Paid So Far</th>
                  <th className="p-3 font-medium">Remaining</th>
                  <th className="p-3 font-medium">Add Payment</th>
                  <th className="p-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      {students.length === 0
                        ? "No students were found for this class."
                        : getEmptyScopeMessage(exportScope)}
                    </td>
                  </tr>
                ) : (
                  tableRows.map((student, index) => {
                    const remaining = campaign
                      ? Math.max(campaign.targetAmount - student.paidAmount, 0)
                      : null;
                    const status = getStatusBadge(student.paidAmount, campaign?.targetAmount ?? null);
                    const isStudentCompleted = remaining != null && remaining <= 0;
                    const lastPayment = student.lastPaymentAt
                      ? format(new Date(student.lastPaymentAt), "MMM dd, yyyy")
                      : "-";

                    return (
                      <tr key={student.id} className="border-b align-top transition-colors hover:bg-muted/40">
                        <td className="p-3 text-sm font-medium">{index + 1}</td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">
                              {student.name} {student.surname}
                            </p>
                            <p className="text-xs text-muted-foreground">{student.studentId}</p>
                            <p className="mt-1 text-xs text-muted-foreground">
                              Last payment: {lastPayment}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">
                          {campaign ? formatCurrency(campaign.targetAmount) : "-"}
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{formatCurrency(student.paidAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {student.paymentCount} payment{student.paymentCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">
                          {campaign ? formatCurrency(remaining ?? 0) : "-"}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-col gap-2 md:flex-row">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentDrafts[student.id] ?? ""}
                              onChange={(e) =>
                                setPaymentDrafts((prev) => ({
                                  ...prev,
                                  [student.id]: e.target.value,
                                }))
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleRecordPayment(student.id);
                                }
                              }}
                              placeholder="0.00"
                              disabled={!campaign || isStudentCompleted || savingStudentId === student.id}
                              className="md:max-w-[130px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => void handleRecordPayment(student.id)}
                              disabled={!campaign || isStudentCompleted || savingStudentId === student.id}
                              className="shrink-0"
                            >
                              {savingStudentId === student.id ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Saving
                                </>
                              ) : (
                                "Add payment"
                              )}
                            </Button>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={status.className}>{status.label}</Badge>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
