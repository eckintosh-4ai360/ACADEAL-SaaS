"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Star, Plus, Lock, Trash2, ClipboardList, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createAppraisalCycle, closeAppraisalCycle, deleteAppraisalCycle, upsertAppraisalRecord } from "@/lib/hrActions";
import Link from "next/link";

type CycleRow = {
  id: number;
  title: string;
  period: string;
  status: "OPEN" | "CLOSED";
  startDate: string;
  endDate: string;
  createdByName: string;
  recordCount: number;
  closedAt: string | null;
  createdAt: string;
};

type RecordRow = {
  id: number;
  staffId: string;
  staffName: string;
  staffType: string;
  score: number;
  recommendation: string;
  comments: string | null;
  reviewerName: string;
  createdAt: string;
};

type StaffOption = { id: string; staffId: string; displayName: string; staffType: "ADMIN" | "TEACHER" };

const RECOMMENDATIONS = ["PROMOTE", "RETAIN", "IMPROVE", "DISMISS"] as const;
const REC_LABELS: Record<string, string> = {
  PROMOTE: "Promote", RETAIN: "Retain", IMPROVE: "Needs Improvement", DISMISS: "Dismissal",
};
const REC_STYLES: Record<string, string> = {
  PROMOTE: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  RETAIN: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-900/40 dark:text-sky-300 dark:border-sky-700",
  IMPROVE: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  DISMISS: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
};

function StarRating({ value, onChange, readonly }: { value: number; onChange?: (v: number) => void; readonly?: boolean }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(n)}
          className={`transition-colors ${readonly ? "cursor-default" : "hover:scale-110"}`}
        >
          <Star className={`h-5 w-5 ${n <= value ? "fill-amber-400 text-amber-400" : "text-gray-200"}`} />
        </button>
      ))}
    </div>
  );
}

export function AppraisalsClientPage({
  cycles, cycleRecords, activeCycleId, staffList, activeStatus,
}: {
  cycles: CycleRow[];
  cycleRecords: RecordRow[];
  activeCycleId: number | null;
  staffList: StaffOption[];
  activeStatus?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showNewCycleForm, setShowNewCycleForm] = useState(false);
  const [showAddRecordForm, setShowAddRecordForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New cycle form
  const [cycleForm, setCycleForm] = useState({ title: "", period: "", startDate: "", endDate: "", description: "" });

  // Record form
  const [recordForm, setRecordForm] = useState({
    staffId: "", score: 3, teachingScore: 0, professionalScore: 0, conductScore: 0,
    recommendation: "RETAIN" as typeof RECOMMENDATIONS[number],
    comments: "", strengths: "", improvements: "",
  });

  const activeCycle = cycles.find((c) => c.id === activeCycleId);

  async function handleCreateCycle() {
    if (!cycleForm.title.trim() || !cycleForm.period.trim() || !cycleForm.startDate || !cycleForm.endDate) {
      setError("Title, period, start date, and end date are required."); return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await createAppraisalCycle({
          title: cycleForm.title,
          period: cycleForm.period,
          startDate: new Date(cycleForm.startDate),
          endDate: new Date(cycleForm.endDate),
          description: cycleForm.description || undefined,
        });
        setShowNewCycleForm(false);
        setCycleForm({ title: "", period: "", startDate: "", endDate: "", description: "" });
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleCloseCycle(id: number) {
    if (!confirm("Close this cycle? Records will become read-only.")) return;
    startTransition(async () => {
      try { await closeAppraisalCycle(id); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDeleteCycle(id: number) {
    if (!confirm("Delete this cycle and all its records?")) return;
    startTransition(async () => {
      try { await deleteAppraisalCycle(id); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleAddRecord(cycleId: number) {
    const staff = staffList.find((s) => s.id === recordForm.staffId);
    if (!staff) { setError("Select a staff member."); return; }
    if (recordForm.score < 1 || recordForm.score > 5) { setError("Score must be 1–5."); return; }
    setError(null);
    startTransition(async () => {
      try {
        await upsertAppraisalRecord(cycleId, {
          staffId: staff.id,
          staffName: staff.displayName,
          staffType: staff.staffType,
          staffProfileId: staff.staffId,
          score: recordForm.score,
          teachingScore: recordForm.teachingScore || undefined,
          professionalScore: recordForm.professionalScore || undefined,
          conductScore: recordForm.conductScore || undefined,
          recommendation: recordForm.recommendation,
          comments: recordForm.comments || undefined,
          strengths: recordForm.strengths || undefined,
          improvements: recordForm.improvements || undefined,
        });
        setShowAddRecordForm(false);
        setRecordForm({ staffId: "", score: 3, teachingScore: 0, professionalScore: 0, conductScore: 0, recommendation: "RETAIN", comments: "", strengths: "", improvements: "" });
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
        {/* Left: Cycle list */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-lg">Cycles</h2>
            <Button size="sm" onClick={() => setShowNewCycleForm((v) => !v)} className="gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New
            </Button>
          </div>

          {/* Status filter */}
          <div className="flex gap-2">
            {["", "OPEN", "CLOSED"].map((s) => {
              const params = new URLSearchParams();
              if (s) params.set("status", s);
              if (activeCycleId) params.set("cycleId", activeCycleId.toString());
              return (
                <Link key={s || "all"} href={`/dashboard/hr/appraisals?${params.toString()}`}>
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold cursor-pointer transition-colors ${
                    (activeStatus ?? "") === s ? "bg-foreground text-background" : "bg-card hover:bg-muted"
                  }`}>
                    {s || "All"}
                  </span>
                </Link>
              );
            })}
          </div>

          {/* New cycle form */}
          {showNewCycleForm && (
            <Card className="border-2 border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-500/40 dark:bg-violet-950/30">
              <CardContent className="pt-4 space-y-3">
                <p className="text-sm font-semibold">New Appraisal Cycle</p>
                {[
                  { key: "title", label: "Title *", placeholder: "e.g. Term 1 2025 Appraisal" },
                  { key: "period", label: "Period *", placeholder: "e.g. 2025 Term 1" },
                ].map(({ key, label, placeholder }) => (
                  <div key={key}>
                    <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                    <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      placeholder={placeholder}
                      value={cycleForm[key as keyof typeof cycleForm]}
                      onChange={(e) => setCycleForm((f) => ({ ...f, [key]: e.target.value }))} />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-2">
                  {["startDate", "endDate"].map((k) => (
                    <div key={k}>
                      <label className="text-xs font-semibold text-muted-foreground">
                        {k === "startDate" ? "Start Date *" : "End Date *"}
                      </label>
                      <input type="date" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                        value={cycleForm[k as keyof typeof cycleForm]}
                        onChange={(e) => setCycleForm((f) => ({ ...f, [k]: e.target.value }))} />
                    </div>
                  ))}
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Description</label>
                  <textarea rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={cycleForm.description}
                    onChange={(e) => setCycleForm((f) => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleCreateCycle} disabled={isPending}>
                    {isPending ? "Creating…" : "Create"}
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setShowNewCycleForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Cycle cards */}
          {cycles.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-8 text-center text-xs text-muted-foreground">
              No appraisal cycles yet.
            </div>
          ) : (
            cycles.map((cycle) => {
              const isActive = cycle.id === activeCycleId;
              const params = new URLSearchParams();
              params.set("cycleId", cycle.id.toString());
              if (activeStatus) params.set("status", activeStatus);

              return (
                <Link key={cycle.id} href={`/dashboard/hr/appraisals?${params.toString()}`}>
                  <div className={`rounded-2xl border cursor-pointer p-4 transition-all hover:shadow-md ${
                    isActive
                      ? "border-violet-400 bg-violet-50 shadow dark:border-violet-500 dark:bg-violet-950/40"
                      : "bg-card hover:bg-muted/30"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-sm">{cycle.title}</p>
                        <p className="text-xs text-muted-foreground">{cycle.period}</p>
                      </div>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-semibold shrink-0 ${
                        cycle.status === "OPEN"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700"
                          : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-600"
                      }`}>
                        {cycle.status}
                      </span>
                    </div>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {cycle.recordCount} reviews · by {cycle.createdByName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(cycle.startDate).toLocaleDateString()} → {new Date(cycle.endDate).toLocaleDateString()}
                    </p>

                    {isActive && cycle.status === "OPEN" && (
                      <div className="mt-3 flex gap-2" onClick={(e) => e.preventDefault()}>
                        <button className="text-xs text-muted-foreground hover:text-red-600 flex items-center gap-1"
                          onClick={() => handleCloseCycle(cycle.id)} disabled={isPending}>
                          <Lock className="h-3 w-3" /> Close Cycle
                        </button>
                        <button className="text-xs text-muted-foreground hover:text-red-600 flex items-center gap-1"
                          onClick={() => handleDeleteCycle(cycle.id)} disabled={isPending}>
                          <Trash2 className="h-3 w-3" /> Delete
                        </button>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })
          )}
        </div>

        {/* Right: Cycle detail / records */}
        <div className="space-y-4">
          {!activeCycle ? (
            <div className="rounded-2xl border border-dashed p-16 text-center">
              <ClipboardList className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Select a cycle from the left to view and manage appraisal records.</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">{activeCycle.title}</h2>
                  <p className="text-sm text-muted-foreground">{activeCycle.period} · {cycleRecords.length} reviews completed</p>
                </div>
                {activeCycle.status === "OPEN" && (
                  <Button size="sm" onClick={() => setShowAddRecordForm((v) => !v)} className="gap-2">
                    <Plus className="h-4 w-4" /> Add Review
                  </Button>
                )}
              </div>

              {/* Add record form */}
              {showAddRecordForm && activeCycle.status === "OPEN" && (
                <Card className="border-2 border-dashed border-violet-300 bg-violet-50/50 dark:border-violet-500/40 dark:bg-violet-950/30">
                  <CardHeader><CardTitle className="text-base">Add Appraisal Review</CardTitle></CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Staff Member *</label>
                        <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={recordForm.staffId}
                          onChange={(e) => setRecordForm((f) => ({ ...f, staffId: e.target.value }))}>
                          <option value="">Select staff…</option>
                          {staffList.map((s) => (
                            <option key={s.id} value={s.id}>{s.displayName} ({s.staffType})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-muted-foreground">Recommendation *</label>
                        <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={recordForm.recommendation}
                          onChange={(e) => setRecordForm((f) => ({ ...f, recommendation: e.target.value as typeof RECOMMENDATIONS[number] }))}>
                          {RECOMMENDATIONS.map((r) => <option key={r} value={r}>{REC_LABELS[r]}</option>)}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-muted-foreground">Overall Score *</label>
                      <div className="mt-2">
                        <StarRating value={recordForm.score} onChange={(v) => setRecordForm((f) => ({ ...f, score: v }))} />
                        <p className="mt-1 text-xs text-muted-foreground">{recordForm.score} / 5</p>
                      </div>
                    </div>

                    <div className="grid gap-4 sm:grid-cols-3">
                      {[
                        { key: "teachingScore", label: "Teaching Score (optional)" },
                        { key: "professionalScore", label: "Professional Score (optional)" },
                        { key: "conductScore", label: "Conduct Score (optional)" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                          <div className="mt-2">
                            <StarRating
                              value={recordForm[key as keyof typeof recordForm] as number}
                              onChange={(v) => setRecordForm((f) => ({ ...f, [key]: v }))}
                            />
                          </div>
                        </div>
                      ))}
                    </div>

                    {[
                      { key: "comments", label: "General Comments" },
                      { key: "strengths", label: "Strengths" },
                      { key: "improvements", label: "Areas for Improvement" },
                    ].map(({ key, label }) => (
                      <div key={key}>
                        <label className="text-xs font-semibold text-muted-foreground">{label}</label>
                        <textarea rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                          value={recordForm[key as keyof typeof recordForm] as string}
                          onChange={(e) => setRecordForm((f) => ({ ...f, [key]: e.target.value }))} />
                      </div>
                    ))}

                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => handleAddRecord(activeCycle.id)} disabled={isPending}>
                        {isPending ? "Saving…" : "Save Review"}
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => setShowAddRecordForm(false)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Records list */}
              {cycleRecords.length === 0 ? (
                <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
                  No appraisal reviews in this cycle yet.
                  {activeCycle.status === "OPEN" && " Click \"Add Review\" to get started."}
                </div>
              ) : (
                <div className="space-y-3">
                  {cycleRecords.map((rec) => (
                    <div key={rec.id} className="rounded-2xl border bg-card p-4">
                      <div className="flex flex-wrap items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="rounded-xl bg-violet-50 p-2 dark:bg-violet-900/30">
                            <Star className="h-5 w-5 text-violet-600" />
                          </div>
                          <div>
                            <p className="font-semibold">{rec.staffName}</p>
                            <p className="text-xs text-muted-foreground">{rec.staffType} · Reviewed by {rec.reviewerName}</p>
                            <div className="mt-2">
                              <StarRating value={rec.score} readonly />
                            </div>
                            {rec.comments && <p className="mt-2 text-sm text-muted-foreground">{rec.comments}</p>}
                          </div>
                        </div>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${REC_STYLES[rec.recommendation]}`}>
                          {REC_LABELS[rec.recommendation]}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
