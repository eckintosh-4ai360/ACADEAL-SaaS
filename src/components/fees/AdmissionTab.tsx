"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  FileStack,
  LayoutGrid,
  Loader2,
  Pencil,
  Plus,
  PlusCircle,
  Trash2,
} from "lucide-react";
import { createAdmissionBill, updateAdmissionBill, deleteAdmissionBill } from "@/lib/feeActions";
import { GRADE_LEVEL_OPTIONS, cn } from "@/lib/utils";
import { toast } from "react-toastify";
import { format } from "date-fns";

const LEVELS = GRADE_LEVEL_OPTIONS.map(({ label }) => label);

interface AdmissionBill {
  id: number;
  level: string;
  item: string;
  amount: number;
  createdAt: string;
}

type SubTab = "view" | "add" | "summary";

interface AdmissionTabProps {
  bills: AdmissionBill[];
}

const SUB_TABS: Array<{
  key: SubTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  activeClassName: string;
  inactiveClassName: string;
  iconClassName: string;
}> = [
  {
    key: "view",
    label: "View Admission Bill",
    icon: FileStack,
    activeClassName:
      "border-violet-300 bg-violet-50 text-violet-700 shadow-[0_14px_30px_-22px_rgba(124,58,237,0.4)] dark:border-violet-500/35 dark:bg-violet-500/15 dark:text-violet-100 dark:shadow-[0_18px_34px_-24px_rgba(124,58,237,0.36)]",
    inactiveClassName:
      "border-slate-200 bg-white/95 text-slate-700 hover:border-violet-200 hover:bg-violet-50/75 hover:text-violet-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-violet-500/25 dark:hover:bg-violet-500/10 dark:hover:text-violet-100",
    iconClassName:
      "bg-violet-100 text-violet-700 dark:bg-violet-500/15 dark:text-violet-300",
  },
  {
    key: "add",
    label: "Add Admission Bill",
    icon: PlusCircle,
    activeClassName:
      "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-[0_14px_30px_-22px_rgba(5,150,105,0.4)] dark:border-emerald-500/35 dark:bg-emerald-500/15 dark:text-emerald-100 dark:shadow-[0_18px_34px_-24px_rgba(5,150,105,0.35)]",
    inactiveClassName:
      "border-slate-200 bg-white/95 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50/75 hover:text-emerald-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-emerald-500/25 dark:hover:bg-emerald-500/10 dark:hover:text-emerald-100",
    iconClassName:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300",
  },
  {
    key: "summary",
    label: "Bill Summary",
    icon: BarChart3,
    activeClassName:
      "border-cyan-300 bg-cyan-50 text-cyan-700 shadow-[0_14px_30px_-22px_rgba(8,145,178,0.38)] dark:border-cyan-500/35 dark:bg-cyan-500/15 dark:text-cyan-100 dark:shadow-[0_18px_34px_-24px_rgba(8,145,178,0.34)]",
    inactiveClassName:
      "border-slate-200 bg-white/95 text-slate-700 hover:border-cyan-200 hover:bg-cyan-50/75 hover:text-cyan-700 dark:border-white/10 dark:bg-slate-950/50 dark:text-slate-200 dark:hover:border-cyan-500/25 dark:hover:bg-cyan-500/10 dark:hover:text-cyan-100",
    iconClassName:
      "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-300",
  },
];

export function AdmissionTab({ bills }: AdmissionTabProps) {
  const router = useRouter();
  const [subTab, setSubTab] = useState<SubTab>("view");
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<number | null>(null);

  // Add form
  const [level, setLevel] = useState("");
  const [item, setItem] = useState("Admission Fee & Form");
  const [amount, setAmount] = useState("");

  // Edit form
  const [editAmount, setEditAmount] = useState("");
  const [editItem, setEditItem] = useState("");

  const handleAdd = () => {
    if (!level || !amount) { toast.error("Fill all fields"); return; }
    startTransition(async () => {
      const result = await createAdmissionBill({ level, item, amount: parseFloat(amount) });
      if (result.success) {
        toast.success(result.message);
        setLevel(""); setAmount(""); setItem("Admission Fee & Form");
        setSubTab("view");
        router.refresh();
      } else toast.error(result.message);
    });
  };

  const startEdit = (bill: AdmissionBill) => {
    setEditingId(bill.id);
    setEditAmount(String(bill.amount));
    setEditItem(bill.item);
  };

  const handleUpdate = (id: number) => {
    startTransition(async () => {
      const result = await updateAdmissionBill(id, { item: editItem, amount: parseFloat(editAmount) });
      if (result.success) {
        toast.success(result.message);
        setEditingId(null);
        router.refresh();
      } else toast.error(result.message);
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this admission bill?")) return;
    startTransition(async () => {
      const result = await deleteAdmissionBill(id);
      if (result.success) { toast.success(result.message); router.refresh(); }
      else toast.error(result.message);
    });
  };

  const totalAdmission = bills.reduce((s, b) => s + b.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Bills for New Admission</h2>
      </div>

      {/* Sub-tabs */}
      <div className="mb-2 flex flex-wrap gap-2">
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = subTab === tab.key;

          return (
            <button
              key={tab.key}
              onClick={() => setSubTab(tab.key)}
              aria-pressed={isActive}
              className={cn(
                "group inline-flex items-center gap-2.5 rounded-2xl border px-4 py-2.5 text-xs font-bold uppercase tracking-[0.08em] transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/25 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-950",
                isActive
                  ? `scale-[1.02] ${tab.activeClassName}`
                  : `shadow-[0_10px_30px_-24px_rgba(15,23,42,0.3)] hover:-translate-y-0.5 ${tab.inactiveClassName}`
              )}
            >
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-xl transition-colors",
                  tab.iconClassName
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* View sub-tab */}
      {subTab === "view" && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <select className="border rounded px-2 py-1.5 text-sm w-48">
              <option value="">All Levels</option>
              {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-teal-600 text-white text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">ID</th>
                  <th className="px-3 py-2 text-left">Level</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Amount</th>
                  <th className="px-3 py-2 text-left">Uploaded</th>
                  <th className="px-3 py-2 text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {bills.map((bill) => (
                  <tr key={bill.id} className="border-b hover:bg-muted/40">
                    <td className="px-3 py-2 text-muted-foreground">{bill.id}</td>
                    <td className="px-3 py-2 font-medium">{bill.level}</td>
                    <td className="px-3 py-2">
                      {editingId === bill.id
                        ? <input value={editItem} onChange={e => setEditItem(e.target.value)} className="border rounded px-2 py-0.5 text-xs w-40" />
                        : bill.item}
                    </td>
                    <td className="px-3 py-2 text-right font-semibold">
                      {editingId === bill.id
                        ? <input type="number" value={editAmount} onChange={e => setEditAmount(e.target.value)} className="border rounded px-2 py-0.5 text-xs w-24 text-right" />
                        : bill.amount.toFixed(0)}
                    </td>
                    <td className="px-3 py-2 text-sm text-muted-foreground">
                      {format(new Date(bill.createdAt), "yyyy-MM-dd")}
                    </td>
                    <td className="px-3 py-2 text-center">
                      <div className="flex items-center gap-1 justify-center">
                        {editingId === bill.id ? (
                          <>
                            <button onClick={() => handleUpdate(bill.id)} disabled={isPending} className="px-2 py-0.5 text-xs text-white bg-green-600 hover:bg-green-700 rounded">Save</button>
                            <button onClick={() => setEditingId(null)} className="px-2 py-0.5 text-xs border rounded hover:bg-muted">Cancel</button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => startEdit(bill)} className="px-2 py-0.5 text-xs text-white bg-blue-500 hover:bg-blue-600 rounded flex items-center gap-1">
                              <Pencil className="w-3 h-3" /> Edit
                            </button>
                            <button onClick={() => handleDelete(bill.id)} disabled={isPending} className="px-2 py-0.5 text-xs text-white bg-red-500 hover:bg-red-600 rounded flex items-center gap-1">
                              <Trash2 className="w-3 h-3" /> Delete
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {bills.length === 0 && (
                  <tr><td colSpan={6} className="text-center py-12 text-muted-foreground text-sm">No admission bills yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground">Showing 1 to {bills.length} of {bills.length} entries</p>
        </div>
      )}

      {/* Add sub-tab */}
      {subTab === "add" && (
        <div className="max-w-md space-y-4 border rounded-lg p-5">
          <h3 className="font-semibold text-sm">Add New Admission Bill</h3>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium mb-1 block">Level *</label>
              <select value={level} onChange={e => setLevel(e.target.value)} className="w-full border rounded px-2 py-2 text-sm">
                <option value="">Select Level</option>
                {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Item *</label>
              <input value={item} onChange={e => setItem(e.target.value)} className="w-full border rounded px-2 py-2 text-sm" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Amount (GH₵) *</label>
              <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="w-full border rounded px-2 py-2 text-sm" min="0" step="0.01" placeholder="0.00" />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setSubTab("view")} className="px-4 py-1.5 text-sm border rounded hover:bg-muted">Cancel</button>
            <button onClick={handleAdd} disabled={isPending} className="px-4 py-1.5 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded flex items-center gap-2 disabled:opacity-50">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add Bill
            </button>
          </div>
        </div>
      )}

      {/* Summary sub-tab */}
      {subTab === "summary" && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="border rounded p-4">
              <div className="flex items-center gap-2 mb-2"><LayoutGrid className="w-4 h-4 text-blue-500" /><p className="font-semibold text-sm">Total Levels Configured</p></div>
              <p className="text-3xl font-bold">{bills.length}</p>
            </div>
            <div className="border rounded p-4">
              <p className="font-semibold text-sm mb-2">Average Admission Fee</p>
              <p className="text-3xl font-bold">GH₵ {bills.length > 0 ? (totalAdmission / bills.length).toFixed(0) : "0"}</p>
            </div>
          </div>
          <div className="overflow-x-auto rounded border">
            <table className="w-full text-sm">
              <thead className="bg-gray-100 dark:bg-gray-800 text-xs">
                <tr>
                  <th className="px-3 py-2 text-left">Level</th>
                  <th className="px-3 py-2 text-left">Item</th>
                  <th className="px-3 py-2 text-right">Amount (GH₵)</th>
                </tr>
              </thead>
              <tbody>
                {bills.map(b => (
                  <tr key={b.id} className="border-b">
                    <td className="px-3 py-2 font-medium">{b.level}</td>
                    <td className="px-3 py-2">{b.item}</td>
                    <td className="px-3 py-2 text-right font-semibold">{b.amount.toFixed(0)}</td>
                  </tr>
                ))}
                <tr className="border-t-2 font-bold bg-muted/30">
                  <td className="px-3 py-2" colSpan={2}>TOTAL</td>
                  <td className="px-3 py-2 text-right">GH₵ {totalAdmission.toFixed(0)}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
