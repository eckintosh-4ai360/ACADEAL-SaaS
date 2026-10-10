"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import {
  Banknote,
  CheckCircle2,
  Clock3,
  Layers3,
  Loader2,
  Save,
} from "lucide-react";
import {
  recordFeeCollectionPayment,
  saveFeeCollectionCampaign,
  setFeeCollectionCampaignStatus,
} from "@/lib/actions";
import { DashboardMetricCard } from "@/components/DashboardMetricCard";
import { FilterSelect } from "@/components/ui/filter-select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";

type FeeCollectionType = "PRINTING_FEE" | "MOCK_FEE" | "SPECIAL_DONATION";
type FeeCollectionStatus = "ACTIVE" | "CLOSED";

type CollectionClassOption = {
  id: number;
  name: string;
};

type CollectionStudentRow = {
  id: string;
  name: string;
  surname: string;
  studentId: string;
};

type CollectionStudentSummary = {
  studentId: string;
  paidAmount: number;
  paymentCount: number;
  lastPaymentAt: string | null;
};

type FeeCollectionCampaignData = {
  id: number;
  title: string;
  collectionType: FeeCollectionType;
  targetAmount: number;
  status: FeeCollectionStatus;
  createdAt: string;
  updatedAt: string;
  studentSummaries: CollectionStudentSummary[];
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

const COLLECTION_TYPE_OPTIONS: Array<{
  value: FeeCollectionType;
  label: string;
  helper: string;
}> = [
  {
    value: "PRINTING_FEE",
    label: "Printing Fee",
    helper: "For printing sheets, handouts, and exam material duplication.",
  },
  {
    value: "MOCK_FEE",
    label: "Mock Fee",
    helper: "For mock examination administration and related logistics.",
  },
  {
    value: "SPECIAL_DONATION",
    label: "Special Donation",
    helper: "For PTA drives, class fundraising, and one-off support collections.",
  },
];

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

function getCollectionTypeLabel(type: FeeCollectionType) {
  return COLLECTION_TYPE_OPTIONS.find((option) => option.value === type)?.label ?? type;
}

function getCollectionTypeHelper(type: FeeCollectionType) {
  return (
    COLLECTION_TYPE_OPTIONS.find((option) => option.value === type)?.helper ??
    "Track class collections for this campaign."
  );
}

function getCollectionBadgeClassName(type: FeeCollectionType) {
  switch (type) {
    case "PRINTING_FEE":
      return "border-sky-200 bg-sky-50 text-sky-700";
    case "MOCK_FEE":
      return "border-amber-200 bg-amber-50 text-amber-700";
    case "SPECIAL_DONATION":
      return "border-emerald-200 bg-emerald-50 text-emerald-700";
    default:
      return "border-slate-200 bg-slate-100 text-slate-700";
  }
}

function getStudentStatusBadge(
  paidAmount: number,
  targetAmount: number
): { label: string; className: string } {
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

function getDefaultCollectionTitle(type: FeeCollectionType) {
  return getCollectionTypeLabel(type);
}

interface CollectionTrackerProps {
  isAdmin: boolean;
  classes: CollectionClassOption[];
  selectedClass: SelectedClassData;
  campaigns: FeeCollectionCampaignData[];
  students: CollectionStudentRow[];
}

export function CollectionTracker({
  isAdmin,
  classes,
  selectedClass,
  campaigns,
  students,
}: CollectionTrackerProps) {
  const router = useRouter();
  const [campaignType, setCampaignType] = useState<FeeCollectionType>("PRINTING_FEE");
  const [campaignTitle, setCampaignTitle] = useState(getDefaultCollectionTitle("PRINTING_FEE"));
  const [targetAmount, setTargetAmount] = useState("");
  const [paymentDrafts, setPaymentDrafts] = useState<Record<string, Record<string, string>>>({});
  const [savingCampaign, setSavingCampaign] = useState(false);
  const [savingPaymentKey, setSavingPaymentKey] = useState<string | null>(null);
  const [statusActionCampaignId, setStatusActionCampaignId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<FeedbackState>(null);

  const activeCampaigns = campaigns.filter((campaign) => campaign.status === "ACTIVE");
  const closedCampaigns = campaigns.filter((campaign) => campaign.status === "CLOSED");
  const activeExpectedTotal = activeCampaigns.reduce(
    (sum, campaign) => sum + campaign.targetAmount * students.length,
    0
  );
  const activeCollectedTotal = activeCampaigns.reduce(
    (sum, campaign) =>
      sum +
      campaign.studentSummaries.reduce((campaignTotal, summary) => campaignTotal + summary.paidAmount, 0),
    0
  );
  const totalActiveObligations = activeCampaigns.length * students.length;
  const completedActiveObligations = activeCampaigns.reduce(
    (sum, campaign) =>
      sum +
      campaign.studentSummaries.filter((summary) => summary.paidAmount >= campaign.targetAmount).length,
    0
  );
  const activeOutstandingTotal = Math.max(activeExpectedTotal - activeCollectedTotal, 0);
  const selectedTypeHelper = getCollectionTypeHelper(campaignType);

  const setDraftValue = (campaignId: number, studentId: string, value: string) => {
    setPaymentDrafts((prev) => ({
      ...prev,
      [campaignId]: {
        ...(prev[campaignId] ?? {}),
        [studentId]: value,
      },
    }));
  };

  const handleCollectionTypeChange = (nextType: FeeCollectionType) => {
    const currentDefaultTitle = getDefaultCollectionTitle(campaignType);
    const nextDefaultTitle = getDefaultCollectionTitle(nextType);

    setCampaignType(nextType);
    setCampaignTitle((prev) => {
      const trimmedTitle = prev.trim();
      if (!trimmedTitle || trimmedTitle === currentDefaultTitle) {
        return nextDefaultTitle;
      }
      return prev;
    });
  };

  const handleSaveCampaign = async () => {
    const parsedTarget = Number.parseFloat(targetAmount);

    if (!campaignTitle.trim()) {
      setFeedback({ type: "error", message: "Collection title is required." });
      return;
    }

    if (!Number.isFinite(parsedTarget) || parsedTarget <= 0) {
      setFeedback({ type: "error", message: "Enter a valid target amount." });
      return;
    }

    setSavingCampaign(true);
    setFeedback(null);

    const result = await saveFeeCollectionCampaign(
      { success: false, error: false },
      {
        classId: selectedClass.id,
        title: campaignTitle.trim(),
        collectionType: campaignType,
        targetAmount: parsedTarget,
      }
    );

    setSavingCampaign(false);

    if (result.success) {
      setTargetAmount("");
      setFeedback({
        type: "success",
        message: result.message || "Collection campaign saved successfully.",
      });
      router.refresh();
      return;
    }

    setFeedback({
      type: "error",
      message: result.message || "Failed to save collection campaign.",
    });
  };

  const handleToggleCampaignStatus = async (
    campaignId: number,
    currentStatus: FeeCollectionStatus,
    title: string
  ) => {
    const nextStatus = currentStatus === "ACTIVE" ? "CLOSED" : "ACTIVE";
    const confirmationMessage =
      nextStatus === "CLOSED"
        ? `Close "${title}"? Teachers will stop collecting payments until it is reopened.`
        : `Reopen "${title}" for payment collection?`;

    if (!window.confirm(confirmationMessage)) {
      return;
    }

    setStatusActionCampaignId(campaignId);
    setFeedback(null);

    const result = await setFeeCollectionCampaignStatus(campaignId, nextStatus);

    setStatusActionCampaignId(null);

    if (result.success) {
      setFeedback({
        type: "success",
        message: result.message || "Collection status updated successfully.",
      });
      router.refresh();
      return;
    }

    setFeedback({
      type: "error",
      message: result.message || "Failed to update collection status.",
    });
  };

  const handleRecordPayment = async (campaign: FeeCollectionCampaignData, studentId: string) => {
    if (campaign.status !== "ACTIVE") {
      setFeedback({
        type: "error",
        message: "This collection is closed. Reopen it before recording payments.",
      });
      return;
    }

    const rawAmount = paymentDrafts[campaign.id]?.[studentId]?.trim() || "";
    const parsedAmount = Number.parseFloat(rawAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setFeedback({ type: "error", message: "Enter a valid payment amount." });
      return;
    }

    const currentSummary = campaign.studentSummaries.find((summary) => summary.studentId === studentId);
    const remaining = Math.max(campaign.targetAmount - (currentSummary?.paidAmount ?? 0), 0);

    if (remaining <= 0) {
      setFeedback({
        type: "error",
        message: "This student has already met the target for this collection.",
      });
      return;
    }

    const paymentKey = `${campaign.id}:${studentId}`;
    setSavingPaymentKey(paymentKey);
    setFeedback(null);

    const result = await recordFeeCollectionPayment(
      { success: false, error: false },
      {
        campaignId: campaign.id,
        studentId,
        amount: parsedAmount,
      }
    );

    setSavingPaymentKey(null);

    if (result.success) {
      setDraftValue(campaign.id, studentId, "");
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

  const renderCampaignCard = (campaign: FeeCollectionCampaignData) => {
    const summaryByStudent = new Map(
      campaign.studentSummaries.map((summary) => [summary.studentId, summary] as const)
    );
    const totalCollected = campaign.studentSummaries.reduce(
      (sum, summary) => sum + summary.paidAmount,
      0
    );
    const completedStudents = campaign.studentSummaries.filter(
      (summary) => summary.paidAmount >= campaign.targetAmount
    ).length;
    const totalTarget = campaign.targetAmount * students.length;
    const remainingTotal = Math.max(totalTarget - totalCollected, 0);
    const statusBadgeClassName =
      campaign.status === "ACTIVE"
        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
        : "border-slate-200 bg-slate-100 text-slate-700";

    return (
      <Card key={campaign.id} className="overflow-hidden">
        <CardHeader className="border-b bg-muted/20">
          <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle>{campaign.title}</CardTitle>
                <Badge variant="outline" className={getCollectionBadgeClassName(campaign.collectionType)}>
                  {getCollectionTypeLabel(campaign.collectionType)}
                </Badge>
                <Badge variant="outline" className={statusBadgeClassName}>
                  {campaign.status === "ACTIVE" ? "Active" : "Closed"}
                </Badge>
              </div>
              <CardDescription>
                {getCollectionTypeHelper(campaign.collectionType)} Updated{" "}
                {format(new Date(campaign.updatedAt), "MMM dd, yyyy")}.
              </CardDescription>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={statusActionCampaignId === campaign.id}
              onClick={() =>
                void handleToggleCampaignStatus(campaign.id, campaign.status, campaign.title)
              }
            >
              {statusActionCampaignId === campaign.id ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : campaign.status === "ACTIVE" ? (
                "Close collection"
              ) : (
                "Reopen collection"
              )}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="space-y-5 p-6">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Target Per Student
              </p>
              <p className="mt-2 text-xl font-bold">{formatCurrency(campaign.targetAmount)}</p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Collected
              </p>
              <p className="mt-2 text-xl font-bold">{formatCurrency(totalCollected)}</p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Completed Students
              </p>
              <p className="mt-2 text-xl font-bold">
                {students.length > 0 ? `${completedStudents}/${students.length}` : "0"}
              </p>
            </div>
            <div className="rounded-2xl border bg-background px-4 py-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Remaining
              </p>
              <p className="mt-2 text-xl font-bold">{formatCurrency(remainingTotal)}</p>
            </div>
          </div>

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
                {students.length === 0 ? (
                  <tr>
                    <td className="p-6 text-center text-muted-foreground" colSpan={7}>
                      No students were found for this class.
                    </td>
                  </tr>
                ) : (
                  students.map((student, index) => {
                    const summary = summaryByStudent.get(student.id);
                    const paidAmount = summary?.paidAmount ?? 0;
                    const paymentCount = summary?.paymentCount ?? 0;
                    const remaining = Math.max(campaign.targetAmount - paidAmount, 0);
                    const status = getStudentStatusBadge(paidAmount, campaign.targetAmount);
                    const paymentKey = `${campaign.id}:${student.id}`;
                    const isSavingRow = savingPaymentKey === paymentKey;
                    const isStudentCompleted = remaining <= 0;
                    const lastPayment = summary?.lastPaymentAt
                      ? format(new Date(summary.lastPaymentAt), "MMM dd, yyyy")
                      : "-";

                    return (
                      <tr key={`${campaign.id}-${student.id}`} className="border-b align-top transition-colors hover:bg-muted/30">
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
                          {formatCurrency(campaign.targetAmount)}
                        </td>
                        <td className="p-3">
                          <div>
                            <p className="font-medium">{formatCurrency(paidAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {paymentCount} payment{paymentCount === 1 ? "" : "s"}
                            </p>
                          </div>
                        </td>
                        <td className="p-3 text-sm font-medium">{formatCurrency(remaining)}</td>
                        <td className="p-3">
                          <div className="flex flex-col gap-2 md:flex-row">
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={paymentDrafts[campaign.id]?.[student.id] ?? ""}
                              onChange={(event) =>
                                setDraftValue(campaign.id, student.id, event.target.value)
                              }
                              onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                  event.preventDefault();
                                  void handleRecordPayment(campaign, student.id);
                                }
                              }}
                              placeholder="0.00"
                              disabled={campaign.status !== "ACTIVE" || isStudentCompleted || isSavingRow}
                              className="md:max-w-[130px]"
                            />
                            <Button
                              size="sm"
                              onClick={() => void handleRecordPayment(campaign, student.id)}
                              disabled={campaign.status !== "ACTIVE" || isStudentCompleted || isSavingRow}
                              className="shrink-0"
                            >
                              {isSavingRow ? (
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
                          <Badge variant="outline" className={status.className}>
                            {status.label}
                          </Badge>
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
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Collections Tracker</h1>
          <p className="mt-1 text-muted-foreground">
            Run printing fees, mock fees, and special donations side by side for the same class.
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

      <div className="rounded-2xl border border-dashed bg-muted/20 px-4 py-4 text-sm text-muted-foreground">
        Each collection stays independent. If Printing Fee and Mock Fee are both active, teachers can
        record payments for both from this page without pausing or replacing either campaign.
      </div>

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

      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-4">
        <DashboardMetricCard
          title="Active Collections"
          value={activeCampaigns.length.toString()}
          description="Open class campaigns currently taking payments."
          icon={Layers3}
          tone="sky"
          badge="Live"
          detail={`${campaigns.length} total`}
        />
        <DashboardMetricCard
          title="Collected"
          value={formatCurrency(activeCollectedTotal)}
          description="Money received across all active collections."
          icon={Banknote}
          tone="emerald"
          badge="Payments"
          detail={`${students.length} student${students.length === 1 ? "" : "s"}`}
        />
        <DashboardMetricCard
          title="Completed Obligations"
          value={totalActiveObligations > 0 ? `${completedActiveObligations}/${totalActiveObligations}` : "0"}
          description="Student-by-collection balances that have been fully cleared."
          icon={CheckCircle2}
          tone="violet"
          badge="Status"
          detail={activeCampaigns.length > 0 ? "Across active campaigns" : "No live campaigns"}
        />
        <DashboardMetricCard
          title="Outstanding"
          value={formatCurrency(activeOutstandingTotal)}
          description="Remaining balance still expected across active collections."
          icon={Clock3}
          tone="amber"
          badge="Balance"
          detail={activeCampaigns.length > 0 ? "Across active campaigns" : "Nothing open"}
        />
      </div>

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle>Start New Collection</CardTitle>
          <CardDescription>
            Create a class collection and keep it active alongside any existing one.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)_minmax(0,1fr)_auto]">
            <div className="space-y-2">
              <Label htmlFor="collection-type">Collection type</Label>
              <Select
                id="collection-type"
                value={campaignType}
                onChange={(event) => handleCollectionTypeChange(event.target.value as FeeCollectionType)}
              >
                {COLLECTION_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-title">Collection title</Label>
              <Input
                id="collection-title"
                value={campaignTitle}
                onChange={(event) => setCampaignTitle(event.target.value)}
                placeholder="Enter collection title"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="collection-target">Target amount per student</Label>
              <Input
                id="collection-target"
                type="number"
                min="0"
                step="0.01"
                value={targetAmount}
                onChange={(event) => setTargetAmount(event.target.value)}
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
                    Start collection
                  </>
                )}
              </Button>
            </div>
          </div>

          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            {selectedTypeHelper}
          </div>
        </CardContent>
      </Card>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">Active Collections</h2>
            <p className="text-sm text-muted-foreground">
              Teachers can collect across any of these campaigns immediately.
            </p>
          </div>
          <Badge variant="outline" className="rounded-full px-3 py-1">
            {activeCampaigns.length} active
          </Badge>
        </div>

        {activeCampaigns.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No active collections yet. Start one above to begin taking payments.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">{activeCampaigns.map(renderCampaignCard)}</div>
        )}
      </section>

      {closedCampaigns.length > 0 && (
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold">Closed Collections</h2>
              <p className="text-sm text-muted-foreground">
                Historical campaigns remain visible and can be reopened when needed.
              </p>
            </div>
            <Badge variant="outline" className="rounded-full px-3 py-1">
              {closedCampaigns.length} closed
            </Badge>
          </div>

          <div className="space-y-6">{closedCampaigns.map(renderCampaignCard)}</div>
        </section>
      )}

      <Card className="border-dashed">
        <CardContent className="flex flex-col gap-3 p-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="font-semibold">Class coverage</p>
            <p className="text-sm text-muted-foreground">
              {students.length} student{students.length === 1 ? "" : "s"} in {selectedClass.name}
            </p>
          </div>
          <div className="rounded-xl border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
            Every active campaign uses the same class roster, so payments stay comparable across
            printing, mock, and donation drives.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
