"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Trash2, Loader2, ChevronDown, ChevronUp, PlayCircle, Plus, Save,
  Pencil, CheckCircle2, X,
} from "lucide-react";
import { buildAcademicYearOptions } from "@/lib/academicYear";
import { createTermBill, deleteTermBill, prepareTermFees, updateTermBill } from "@/lib/feeActions";
import type { TermBillTargetType } from "@/lib/termBillScope";
import { STUDENT_GROUP_OPTIONS } from "@/lib/termBillScope";
import { normalizeTermValue } from "@/lib/termUtils";
import { toast } from "react-toastify";

const TERMS = ["One", "Two", "Three"];

// Preset fee item names. "Add Other" is the sentinel that lets user type freely.
const PRESET_ITEMS = [
  "Tuition",
  "Toiletries & Others",
  "Examination",
  "Maintenance",
  "Utility",
];
const ADD_OTHER_SENTINEL = "__ADD_OTHER__";

const GRADE_LEVELS = [
  { id: 1, name: "CRECHE" },
  { id: 2, name: "NURSERY 1" },
  { id: 3, name: "NURSERY 2" },
  { id: 4, name: "KG 1" },
  { id: 5, name: "KG 2" },
  { id: 6, name: "BASIC 1" },
  { id: 7, name: "BASIC 2" },
  { id: 8, name: "BASIC 3" },
  { id: 9, name: "BASIC 4" },
  { id: 10, name: "BASIC 5" },
  { id: 11, name: "BASIC 6" },
  { id: 12, name: "JHS 1" },
  { id: 13, name: "JHS 2" },
  { id: 14, name: "JHS 3" },
];

type TermBillItem = { itemName: string; amount: number; isCustom?: boolean };

type TermBill = {
  id: number;
  targetType: TermBillTargetType;
  targetTypeLabel: string;
  targetName: string;
  targetDescription: string;
  term: string;
  academicYear: string;
  totalAmount: number;
  items: TermBillItem[];
  isPrepared: boolean;
};

type ClassOption = {
  id: number;
  name: string;
  gradeLabel: string;
};

interface PrepareBillTabProps {
  termBills: TermBill[];
  currentTerm: string;
  academicYear: string;
  classes: ClassOption[];
}

export function PrepareBillTab({
  termBills,
  currentTerm,
  academicYear,
  classes,
}: PrepareBillTabProps) {
  const router = useRouter();
  const academicYearOptions = buildAcademicYearOptions([
    academicYear,
    ...termBills.map((bill) => bill.academicYear),
  ]);
  const initialAcademicYear =
    academicYearOptions.find((option) => option.value === academicYear)?.value ??
    academicYearOptions[0]?.value ??
    "";
  const [isPending, startTransition] = useTransition();
  const [showForm, setShowForm] = useState(false);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [preparingId, setPreparingId] = useState<number | null>(null);
  // Seed from server so the state survives navigation
  const [preparedIds, setPreparedIds] = useState<Set<number>>(
    () => new Set(termBills.filter((b) => b.isPrepared).map((b) => b.id))
  );

  // ── Edit modal state ──────────────────────────────────────────────────
  const [editingBill, setEditingBill] = useState<TermBill | null>(null);
  const [editItems, setEditItems] = useState<TermBillItem[]>([]);
  const [isEditPending, startEditTransition] = useTransition();

  const [targetType, setTargetType] = useState<TermBillTargetType>("GRADE");
  const [targetId, setTargetId] = useState("");
  const [term, setTerm] = useState<string>(normalizeTermValue(currentTerm));
  const [year, setYear] = useState(initialAcademicYear);
  // Items: each has itemName, amount, and optionally isCustom flag
  const [items, setItems] = useState<TermBillItem[]>([]);

  // Compute which preset names are already used
  const usedPresets = new Set(
    items
      .filter((item) => !item.isCustom)
      .map((item) => item.itemName)
  );

  // Preset options available for the next dropdown
  const availablePresets = PRESET_ITEMS.filter((name) => !usedPresets.has(name));

  const addPresetItem = (name: string) => {
    if (name === ADD_OTHER_SENTINEL) {
      setItems((prev) => [...prev, { itemName: "", amount: 0, isCustom: true }]);
    } else {
      setItems((prev) => [...prev, { itemName: name, amount: 0, isCustom: false }]);
    }
  };

  const removeItem = (index: number) =>
    setItems((prev) => prev.filter((_, i) => i !== index));

  const updateItem = (index: number, field: keyof TermBillItem, value: string | number | boolean) =>
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const totalAmount = items.reduce((sum, item) => sum + (Number(item.amount) || 0), 0);

  const targetOptions =
    targetType === "CLASS"
      ? classes.map((c) => ({ id: c.id, label: `${c.name} (${c.gradeLabel})` }))
      : targetType === "STUDENT_GROUP"
      ? STUDENT_GROUP_OPTIONS.map((g, i) => ({ id: i, label: g.label }))
      : GRADE_LEVELS.map((g) => ({ id: g.id, label: g.name }));

  const selectedTargetLabel =
    targetOptions.find((option) => option.id.toString() === targetId)?.label ?? "";

  const handleCreate = () => {
    if (!targetId) {
      toast.error(
        targetType === "CLASS"
          ? "Select a class"
          : targetType === "STUDENT_GROUP"
          ? "Select a student group"
          : "Select a level"
      );
      return;
    }
    if (items.length === 0) {
      toast.error("Add at least one fee item");
      return;
    }
    if (items.some((item) => !item.itemName.trim() || !Number(item.amount))) {
      toast.error("Fill in all fee items with a name and amount");
      return;
    }

    startTransition(async () => {
      const result = await createTermBill({
        targetType,
        targetId: Number.parseInt(targetId, 10),
        term,
        academicYear: year,
        items: items.map((item) => ({
          itemName: item.itemName.trim(),
          amount: Number(item.amount),
        })),
      });

      if (result.success) {
        toast.success(result.message);
        setShowForm(false);
        setTargetType("GRADE");
        setTargetId("");
        setTerm(normalizeTermValue(currentTerm));
        setYear(initialAcademicYear);
        setItems([]);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handleDelete = (id: number) => {
    if (!confirm("Delete this term bill template?")) return;
    startTransition(async () => {
      const result = await deleteTermBill(id);
      if (result.success) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const handlePrepare = (bill: TermBill) => {
    if (!confirm(`This will create Fee records for all students in ${bill.targetName}. Continue?`)) return;
    setPreparingId(bill.id);
    startTransition(async () => {
      const result = await prepareTermFees(bill.id);
      if (result.success) {
        toast.success(result.message);
        setPreparedIds((prev) => new Set(prev).add(bill.id));
        router.refresh();
      } else {
        toast.error(result.message);
      }
      setPreparingId(null);
    });
  };

  // ── Edit handlers ─────────────────────────────────────────────────────
  const openEdit = (bill: TermBill) => {
    setEditingBill(bill);
    // Deep-clone items so we can mutate freely
    setEditItems(bill.items.map((i) => ({ ...i })));
  };

  const closeEdit = () => {
    setEditingBill(null);
    setEditItems([]);
  };

  const updateEditItem = (
    index: number,
    field: "itemName" | "amount",
    value: string | number
  ) =>
    setEditItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );

  const removeEditItem = (index: number) =>
    setEditItems((prev) => prev.filter((_, i) => i !== index));

  const addEditCustomItem = () =>
    setEditItems((prev) => [...prev, { itemName: "", amount: 0, isCustom: true }]);

  const handleUpdate = () => {
    if (!editingBill) return;
    if (editItems.length === 0) {
      toast.error("Add at least one fee item");
      return;
    }
    if (editItems.some((item) => !item.itemName.trim() || !Number(item.amount))) {
      toast.error("Fill in all fee items with a name and amount");
      return;
    }
    startEditTransition(async () => {
      const result = await updateTermBill(editingBill.id, {
        items: editItems.map((i) => ({
          itemName: i.itemName.trim(),
          amount: Number(i.amount),
        })),
      });
      if (result.success) {
        toast.success("Bill template updated!");
        closeEdit();
        router.refresh();
      } else {
        toast.error(result.message);
      }
    });
  };

  const inputCls =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-900 transition focus:border-blue-500/60 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-white/10 dark:bg-background/70 dark:text-foreground";
  const labelCls =
    "mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground";

  // True when all presets are used up and there's already a custom "other" row being filled
  const hasOpenCustom = items.some((item) => item.isCustom && !item.itemName.trim());
  const canAddMore = availablePresets.length > 0 || !hasOpenCustom;

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold">Term Bill Templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Use a class target for one-off items like excursion fees and collection fees.
          </p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-yellow-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-yellow-600"
        >
          <Plus className="h-3.5 w-3.5" />
          Add Bill Template
        </button>
      </div>

      {showForm && (
        <div className="space-y-5 rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-sm dark:border-white/10 dark:bg-card/60">
          <div>
            <h3 className="font-semibold text-sm">New Term Bill Template</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Choose <span className="font-semibold">Class</span> when only a specific group like KG 1
              or Basic 2 should be billed for an excursion or special collection.
            </p>
          </div>

          {/* Target + Term + Year */}
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div>
              <label className={labelCls}>Target Type *</label>
              <select
                value={targetType}
                onChange={(e) => {
                  setTargetType(e.target.value as TermBillTargetType);
                  setTargetId("");
                }}
                className={inputCls}
              >
                <option value="GRADE">Grade Level</option>
                <option value="STUDENT_GROUP">Student Group</option>
                <option value="CLASS">Class</option>
              </select>
            </div>

            <div>
              <label className={labelCls}>
                {targetType === "CLASS" ? "Class *" : targetType === "STUDENT_GROUP" ? "Group *" : "Level *"}
              </label>
              <select
                value={targetId}
                onChange={(e) => setTargetId(e.target.value)}
                className={inputCls}
              >
                <option value="">
                  {targetType === "CLASS" ? "Select Class" : targetType === "STUDENT_GROUP" ? "Select Group" : "Select Level"}
                </option>
                {targetOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Term *</label>
              <select value={term} onChange={(e) => setTerm(e.target.value)} className={inputCls}>
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    Term {t}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className={labelCls}>Academic Year *</label>
              <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
                {academicYearOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {selectedTargetLabel && (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white px-4 py-2.5 text-xs text-muted-foreground dark:border-white/10 dark:bg-background/40">
              This template will be prepared for{" "}
              <span className="font-semibold text-foreground">{selectedTargetLabel}</span>.
            </div>
          )}

          {/* Fee Items */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className={labelCls + " mb-0"}>Fee Items</label>
              {items.length > 0 && (
                <span className="text-[11px] text-muted-foreground">
                  {items.length} item{items.length !== 1 ? "s" : ""} added
                </span>
              )}
            </div>

            {/* Already-added items — each in its own 2-col row */}
            {items.map((item, index) => (
              <div key={index} className="grid grid-cols-2 items-center gap-3">
                {/* Col 1: name — fixed label for preset, text input for custom */}
                {item.isCustom ? (
                  <input
                    value={item.itemName}
                    onChange={(e) => updateItem(index, "itemName", e.target.value)}
                    placeholder="Enter fee item name"
                    className={inputCls}
                  />
                ) : (
                  <div className={inputCls + " flex items-center bg-slate-100 text-slate-600 dark:bg-white/[0.04] dark:text-muted-foreground cursor-default select-none"}>
                    {item.itemName}
                  </div>
                )}

                {/* Col 2: amount + delete */}
                <div className="flex items-center gap-2">
                  <span className="shrink-0 text-[11px] font-semibold text-muted-foreground">GHS</span>
                  <input
                    type="number"
                    value={item.amount || ""}
                    onChange={(e) => updateItem(index, "amount", e.target.value)}
                    placeholder="0.00"
                    className={inputCls + " text-right"}
                    min="0"
                    step="0.01"
                  />
                  <button
                    onClick={() => removeItem(index)}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}

            {/* "Add item" row — dropdown + amount placeholder in 2 columns */}
            {canAddMore && (
              <div className="grid grid-cols-2 items-end gap-3">
                {/* Col 1: item selector dropdown */}
                <div>
                  <label className="mb-1.5 block text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {items.length === 0 ? "Select fee item to add" : "Add another fee item"}
                  </label>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) addPresetItem(e.target.value);
                    }}
                    className={inputCls + " cursor-pointer"}
                  >
                    <option value="" disabled>— Choose a fee item —</option>
                    {availablePresets.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                    <option value={ADD_OTHER_SENTINEL}>✏️ Add Other (enter manually)</option>
                  </select>
                </div>

                {/* Col 2: Total + action buttons flush to the right */}
                <div className="flex items-center justify-end gap-3">
                  {items.length > 0 && (
                    <span className="shrink-0 text-sm font-semibold text-foreground">
                      Total: <span className="text-yellow-600">GHS {totalAmount.toFixed(2)}</span>
                    </span>
                  )}
                  <button
                    onClick={() => { setShowForm(false); setItems([]); }}
                    className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-muted dark:border-white/10"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreate}
                    disabled={isPending}
                    className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-600 disabled:opacity-50"
                  >
                    {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Template
                  </button>
                </div>
              </div>
            )}

            {/* When all presets used and no open custom row — still show total + buttons */}
            {!canAddMore && (
              <div className="flex items-center justify-end gap-3 pt-1">
                {items.length > 0 && (
                  <span className="shrink-0 text-sm font-semibold text-foreground">
                    Total: <span className="text-yellow-600">GHS {totalAmount.toFixed(2)}</span>
                  </span>
                )}
                <button
                  onClick={() => { setShowForm(false); setItems([]); }}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-muted dark:border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={isPending}
                  className="inline-flex items-center gap-2 rounded-xl bg-yellow-500 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-yellow-600 disabled:opacity-50"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  Save Template
                </button>
              </div>
            )}
          </div>
        </div>
      )}


      {/* Existing Templates Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-white/10">
        <table className="w-full text-sm">
          <thead className="bg-teal-600 text-xs text-white">
            <tr>
              <th className="px-3 py-2 text-left">Type</th>
              <th className="px-3 py-2 text-left">Target</th>
              <th className="px-3 py-2 text-left">Term</th>
              <th className="px-3 py-2 text-left">Acad. Year</th>
              <th className="px-3 py-2 text-right">Total (GHs)</th>
              <th className="px-3 py-2 text-center">Items</th>
              <th className="px-3 py-2 text-center">Actions</th>
              <th className="px-3 py-2 text-center">Status</th>
            </tr>
          </thead>
          <tbody>
            {termBills.map((bill) => (
              <Fragment key={bill.id}>
                <tr className="border-b hover:bg-muted/40">
                  <td className="px-3 py-2 font-medium">{bill.targetTypeLabel}</td>
                  <td className="px-3 py-2">
                    <div className="font-medium">{bill.targetName}</div>
                    <div className="text-xs text-muted-foreground">{bill.targetDescription}</div>
                  </td>
                  <td className="px-3 py-2">{bill.term}</td>
                  <td className="px-3 py-2">{bill.academicYear}</td>
                  <td className="px-3 py-2 text-right font-semibold">
                    {bill.totalAmount.toFixed(2)}
                  </td>
                  <td className="px-3 py-2 text-center">
                    <button
                      onClick={() => setExpandedId(expandedId === bill.id ? null : bill.id)}
                      className="mx-auto flex items-center gap-1 text-xs text-blue-600 hover:underline"
                    >
                      {bill.items.length} items
                      {expandedId === bill.id ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                    </button>
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      {/* ── Prepare button (locks after success or if already prepared) ── */}
                      {preparedIds.has(bill.id) ? (
                        <span className="inline-flex items-center gap-1 rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                          <CheckCircle2 className="h-3 w-3" />
                          Prepared ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handlePrepare(bill)}
                          disabled={isPending && preparingId === bill.id}
                          className="inline-flex items-center gap-1 rounded bg-green-600 px-2 py-1 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-60"
                        >
                          {isPending && preparingId === bill.id ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Preparing…
                            </>
                          ) : (
                            <>
                              <PlayCircle className="h-3 w-3" />
                              Prepare Bills
                            </>
                          )}
                        </button>
                      )}

                      {/* ── Edit button ── */}
                      <button
                        onClick={() => openEdit(bill)}
                        className="inline-flex items-center gap-1 rounded bg-blue-500 px-2 py-1 text-xs font-semibold text-white hover:bg-blue-600"
                      >
                        <Pencil className="h-3 w-3" />
                        Edit
                      </button>

                      {/* ── Delete button ── */}
                      <button
                        onClick={() => handleDelete(bill.id)}
                        className="rounded bg-red-500 px-2 py-1 text-xs text-white hover:bg-red-600"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                  {/* ── Status column ── */}
                  <td className="px-3 py-2 text-center">
                    {preparedIds.has(bill.id) ? (
                      <span className="inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700 dark:bg-green-900/30 dark:text-green-400">
                        Done
                      </span>
                    ) : isPending && preparingId === bill.id ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-semibold text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                        <Loader2 className="h-2.5 w-2.5 animate-spin" />
                        Preparing
                      </span>
                    ) : (
                      <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-500 dark:bg-white/5">
                        Not prepared
                      </span>
                    )}
                  </td>
                </tr>
                {expandedId === bill.id && (
                  <tr className="bg-muted/20">
                    <td colSpan={8} className="px-6 py-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b">
                            <th className="py-1 text-left">Item</th>
                            <th className="py-1 text-right">Amount (GHs)</th>
                          </tr>
                        </thead>
                        <tbody>
                          {bill.items.map((item, index) => (
                            <tr key={index}>
                              <td className="py-0.5">{item.itemName}</td>
                              <td className="text-right">{item.amount.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}

            {termBills.length === 0 && (
              <tr>
                <td colSpan={8} className="py-12 text-center text-sm text-muted-foreground">
                  No term bill templates yet. Create one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ════════════════════════════════════════════════════════════════
           EDIT BILL MODAL
         ════════════════════════════════════════════════════════════════ */}
      {editingBill && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-white shadow-2xl dark:bg-card">
            {/* Header */}
            <div className="flex items-center justify-between rounded-t-2xl bg-blue-600 px-5 py-4">
              <div>
                <h3 className="font-bold text-white">Edit Bill Template</h3>
                <p className="mt-0.5 text-xs text-blue-100">
                  {editingBill.targetName} — Term {editingBill.term} {editingBill.academicYear}
                </p>
              </div>
              <button
                onClick={closeEdit}
                className="rounded-lg p-1 text-blue-100 transition hover:bg-blue-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-3 p-5">
              <p className="text-xs text-muted-foreground">
                Adjust item names or amounts below then click{" "}
                <span className="font-semibold text-foreground">Save Changes</span>.
              </p>

              {editItems.map((item, index) => (
                <div key={index} className="grid grid-cols-[1fr_auto_auto] items-center gap-2">
                  {/* Item name */}
                  <input
                    value={item.itemName}
                    onChange={(e) => updateEditItem(index, "itemName", e.target.value)}
                    placeholder="Fee item name"
                    className={inputCls}
                  />
                  {/* Amount */}
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-semibold text-muted-foreground">GHS</span>
                    <input
                      type="number"
                      value={item.amount || ""}
                      onChange={(e) => updateEditItem(index, "amount", e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className={inputCls + " w-28 text-right"}
                    />
                  </div>
                  {/* Remove */}
                  <button
                    onClick={() => removeEditItem(index)}
                    className="flex h-9 w-9 items-center justify-center rounded-xl text-red-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Add another item */}
              <button
                onClick={addEditCustomItem}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" />
                Add Item
              </button>

              {/* Total */}
              {editItems.length > 0 && (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-2.5 text-sm dark:border-white/10 dark:bg-white/5">
                  Total:{" "}
                  <span className="font-bold text-yellow-600">
                    GHS{" "}
                    {editItems
                      .reduce((sum, i) => sum + (Number(i.amount) || 0), 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 rounded-b-2xl border-t border-slate-100 px-5 py-4 dark:border-white/10">
              <button
                onClick={closeEdit}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium transition hover:bg-muted dark:border-white/10"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdate}
                disabled={isEditPending}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:opacity-50"
              >
                {isEditPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
