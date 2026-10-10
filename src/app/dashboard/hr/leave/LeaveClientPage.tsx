"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarCheck, Plus, CheckCircle2, XCircle, Trash2, Clock, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { submitLeaveRequest, reviewLeaveRequest, deleteLeaveRequest } from "@/lib/hrActions";
import Link from "next/link";

type LeaveRequestRow = {
  id: number;
  staffId: string;
  staffName: string;
  staffType: string;
  staffProfileId: string | null;
  leaveType: string;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason: string;
  status: string;
  reviewedByName: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
};

type StaffOption = { id: string; staffId: string; displayName: string; staffType: "ADMIN" | "TEACHER" };

const LEAVE_TYPES = ["ANNUAL", "SICK", "MATERNITY", "PATERNITY", "UNPAID", "EMERGENCY"] as const;
const LEAVE_TYPE_LABELS: Record<string, string> = {
  ANNUAL: "Annual Leave", SICK: "Sick Leave", MATERNITY: "Maternity", PATERNITY: "Paternity", UNPAID: "Unpaid", EMERGENCY: "Emergency",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700",
  APPROVED: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 dark:border-emerald-700",
  REJECTED: "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/40 dark:text-red-300 dark:border-red-700",
};

export function LeaveClientPage({
  requests, total, page, pageSize, pendingCount, approvedThisMonth, staffList, activeStatus, activeType,
}: {
  requests: LeaveRequestRow[];
  total: number;
  page: number;
  pageSize: number;
  pendingCount: number;
  approvedThisMonth: number;
  staffList: StaffOption[];
  activeStatus?: string;
  activeType?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [reviewModal, setReviewModal] = useState<{ id: number; decision: "APPROVED" | "REJECTED" } | null>(null);
  const [reviewNote, setReviewNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Submit form state
  const [form, setForm] = useState({
    staffId: "", leaveType: "ANNUAL" as typeof LEAVE_TYPES[number],
    startDate: "", endDate: "", reason: "",
  });

  function calcDays(start: string, end: string) {
    if (!start || !end) return 0;
    let count = 0;
    const current = new Date(start);
    const endDate = new Date(end);
    while (current <= endDate) {
      const day = current.getDay();
      if (day !== 0 && day !== 6) count++;
      current.setDate(current.getDate() + 1);
    }
    return count;
  }

  async function handleSubmit() {
    const staff = staffList.find((s) => s.id === form.staffId);
    if (!staff) { setError("Select a staff member."); return; }
    if (!form.startDate || !form.endDate) { setError("Start and end dates are required."); return; }
    if (new Date(form.endDate) < new Date(form.startDate)) { setError("End date must be after start date."); return; }
    if (!form.reason.trim()) { setError("A reason is required."); return; }
    setError(null);

    startTransition(async () => {
      try {
        await submitLeaveRequest({
          staffId: staff.id,
          staffName: staff.displayName,
          staffType: staff.staffType,
          staffProfileId: staff.staffId,
          leaveType: form.leaveType,
          startDate: new Date(form.startDate),
          endDate: new Date(form.endDate),
          reason: form.reason,
        });
        setShowForm(false);
        setForm({ staffId: "", leaveType: "ANNUAL", startDate: "", endDate: "", reason: "" });
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleReview() {
    if (!reviewModal) return;
    startTransition(async () => {
      try {
        await reviewLeaveRequest(reviewModal.id, reviewModal.decision, reviewNote || undefined);
        setReviewModal(null);
        setReviewNote("");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this leave request?")) return;
    startTransition(async () => {
      try { await deleteLeaveRequest(id); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  const totalPages = Math.ceil(total / pageSize);

  function buildUrl(overrides: Record<string, string | undefined>) {
    const p = new URLSearchParams();
    const merged = { status: activeStatus, type: activeType, page: page.toString(), ...overrides };
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v); });
    return `/dashboard/hr/leave?${p.toString()}`;
  }

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Total Requests</p>
          <p className="mt-1 text-2xl font-black">{total}</p>
        </div>
        <div className="rounded-2xl border bg-amber-50 border-amber-200 p-4 dark:bg-amber-950/30 dark:border-amber-800">
          <p className="text-xs text-amber-700 uppercase tracking-wide dark:text-amber-400">Pending</p>
          <p className="mt-1 text-2xl font-black text-amber-800 dark:text-amber-300">{pendingCount}</p>
        </div>
        <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 uppercase tracking-wide dark:text-emerald-400">Approved This Month</p>
          <p className="mt-1 text-2xl font-black text-emerald-800 dark:text-emerald-300">{approvedThisMonth}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Page</p>
          <p className="mt-1 text-2xl font-black">{page} / {totalPages || 1}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Filter + actions row */}
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div className="flex flex-wrap gap-2">
          {/* Status filters */}
          {["", "PENDING", "APPROVED", "REJECTED"].map((s) => (
            <Link key={s || "all"} href={buildUrl({ status: s || undefined, page: "1" })}>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                (activeStatus ?? "") === s ? "bg-foreground text-background" : "bg-card hover:bg-muted"
              }`}>
                {s || "All"}
              </span>
            </Link>
          ))}
          <span className="text-muted-foreground">|</span>
          {/* Leave type filters */}
          {LEAVE_TYPES.map((t) => (
            <Link key={t} href={buildUrl({ type: activeType === t ? undefined : t, page: "1" })}>
              <span className={`rounded-full border px-3 py-1 text-xs font-semibold cursor-pointer transition-colors ${
                activeType === t ? "bg-foreground text-background" : "bg-card hover:bg-muted"
              }`}>
                {LEAVE_TYPE_LABELS[t]}
              </span>
            </Link>
          ))}
        </div>
        <Button onClick={() => setShowForm((v) => !v)} className="gap-2">
          <Plus className="h-4 w-4" /> Submit Request
        </Button>
      </div>

      {/* Submit form */}
      {showForm && (
        <Card className="border-2 border-dashed border-sky-300 bg-sky-50/50 dark:border-sky-600/40 dark:bg-sky-950/30">
          <CardHeader><CardTitle className="text-base">Submit Leave Request</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Staff Member *</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.staffId} onChange={(e) => setForm((f) => ({ ...f, staffId: e.target.value }))}>
                  <option value="">Select staff…</option>
                  {staffList.map((s) => (
                    <option key={s.id} value={s.id}>{s.displayName} ({s.staffType})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Leave Type *</label>
                <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.leaveType} onChange={(e) => setForm((f) => ({ ...f, leaveType: e.target.value as typeof LEAVE_TYPES[number] }))}>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{LEAVE_TYPE_LABELS[t]}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">Start Date *</label>
                <input type="date" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">End Date *</label>
                <input type="date" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                  value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
              </div>
              {form.startDate && form.endDate && (
                <div className="flex items-end pb-2">
                  <p className="text-sm text-muted-foreground">
                    <span className="font-bold text-foreground">{calcDays(form.startDate, form.endDate)}</span> working days
                  </p>
                </div>
              )}
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Reason *</label>
              <textarea rows={3} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                value={form.reason} onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSubmit} disabled={isPending}>{isPending ? "Submitting…" : "Submit Request"}</Button>
              <Button size="sm" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Requests list */}
      {requests.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
          No leave requests match your current filters.
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <div key={req.id} className="rounded-2xl border bg-card p-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <div className="rounded-xl bg-sky-50 p-2 dark:bg-sky-900/30">
                    <CalendarCheck className="h-5 w-5 text-sky-600" />
                  </div>
                  <div>
                    <p className="font-semibold">{req.staffName}</p>
                    <p className="text-xs text-muted-foreground">{req.staffType} · {LEAVE_TYPE_LABELS[req.leaveType]}</p>
                    <p className="mt-1 text-xs">
                      {new Date(req.startDate).toLocaleDateString()} → {new Date(req.endDate).toLocaleDateString()}
                      <span className="ml-2 font-semibold">{req.totalDays} working days</span>
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">{req.reason}</p>
                    {req.reviewedByName && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Reviewed by {req.reviewedByName}
                        {req.reviewNote && ` — "${req.reviewNote}"`}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${STATUS_STYLES[req.status]}`}>
                    {req.status}
                  </span>
                  {req.status === "PENDING" && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                        onClick={() => { setReviewModal({ id: req.id, decision: "APPROVED" }); setReviewNote(""); }}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                      </Button>
                      <Button size="sm" variant="outline"
                        className="gap-1.5 text-red-600 border-red-200 hover:bg-red-50"
                        onClick={() => { setReviewModal({ id: req.id, decision: "REJECTED" }); setReviewNote(""); }}>
                        <XCircle className="h-3.5 w-3.5" /> Reject
                      </Button>
                      <Button size="sm" variant="ghost" className="text-muted-foreground"
                        onClick={() => handleDelete(req.id)} disabled={isPending}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 && (
              <Link href={buildUrl({ page: (page - 1).toString() })}>
                <Button variant="outline" size="sm">Previous</Button>
              </Link>
            )}
            {page < totalPages && (
              <Link href={buildUrl({ page: (page + 1).toString() })}>
                <Button variant="outline" size="sm">Next</Button>
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Review confirmation modal */}
      {reviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">
              {reviewModal.decision === "APPROVED" ? "Approve" : "Reject"} Leave Request
            </h3>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">
                Reviewer Note (optional)
              </label>
              <textarea rows={3}
                className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                placeholder="Add a note for the staff member…"
                value={reviewNote}
                onChange={(e) => setReviewNote(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={handleReview} disabled={isPending}
                className={reviewModal.decision === "APPROVED" ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-red-600 hover:bg-red-700 text-white"}>
                {isPending ? "Saving…" : reviewModal.decision === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
              </Button>
              <Button variant="outline" onClick={() => setReviewModal(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
