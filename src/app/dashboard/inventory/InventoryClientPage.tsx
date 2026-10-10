"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Package, Plus, Pencil, Trash2, X, ShoppingCart, AlertTriangle, Ban, CheckCircle2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { OperationsReportExport } from "@/components/reports/OperationsReportExport";
import {
  createInventoryItem,
  updateInventoryItem,
  toggleInventoryItemActive,
  deleteInventoryItem,
  recordInventorySale,
  deleteInventorySale,
} from "@/lib/inventoryActions";

type InventoryItemRow = {
  id: number;
  name: string;
  category: string;
  unit: string;
  unitPrice: number;
  quantityOnHand: number;
  lowStockThreshold: number;
  notes: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type InventorySaleRow = {
  id: number;
  itemId: number;
  itemName: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  buyerType: "STUDENT" | "STAFF" | "OTHER";
  buyerName: string | null;
  paymentMethod: string;
  note: string | null;
  recordedByName: string;
  soldAt: string;
};

const PAYMENT_METHODS = ["CASH", "MOMO", "ONLINE"] as const;
const BUYER_TYPES = ["STUDENT", "STAFF", "OTHER"] as const;

function currency(amount: number) {
  return `GHS ${amount.toLocaleString("en-GH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export function InventoryClientPage({
  items,
  sales,
  salesTotal,
  salesPage,
  salesPageSize,
  salesThisMonth,
  lowStockCount,
  stockValue,
}: {
  items: InventoryItemRow[];
  sales: InventorySaleRow[];
  salesTotal: number;
  salesPage: number;
  salesPageSize: number;
  salesThisMonth: number;
  lowStockCount: number;
  stockValue: number;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [tab, setTab] = useState<"stock" | "sales">("stock");
  const [error, setError] = useState<string | null>(null);

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItemId, setEditingItemId] = useState<number | null>(null);
  const [deleteItemTarget, setDeleteItemTarget] = useState<number | null>(null);
  const emptyItemForm = {
    name: "", category: "", unit: "pcs", unitPrice: "", quantityOnHand: "0", lowStockThreshold: "5", notes: "",
  };
  const [itemForm, setItemForm] = useState(emptyItemForm);

  const [showSaleForm, setShowSaleForm] = useState(false);
  const [deleteSaleTarget, setDeleteSaleTarget] = useState<number | null>(null);
  const emptySaleForm = { itemId: "", quantity: "1", buyerType: "STUDENT" as (typeof BUYER_TYPES)[number], buyerName: "", paymentMethod: "CASH" as (typeof PAYMENT_METHODS)[number], note: "" };
  const [saleForm, setSaleForm] = useState(emptySaleForm);

  const activeItems = items.filter((i) => i.isActive);
  const selectedSaleItem = items.find((i) => i.id === Number(saleForm.itemId));
  const saleTotalPreview = selectedSaleItem ? selectedSaleItem.unitPrice * (Number(saleForm.quantity) || 0) : 0;

  function openCreateItemForm() {
    setItemForm(emptyItemForm);
    setEditingItemId(null);
    setShowItemForm(true);
  }

  function openEditItemForm(item: InventoryItemRow) {
    setItemForm({
      name: item.name, category: item.category, unit: item.unit,
      unitPrice: String(item.unitPrice), quantityOnHand: String(item.quantityOnHand),
      lowStockThreshold: String(item.lowStockThreshold), notes: item.notes ?? "",
    });
    setEditingItemId(item.id);
    setShowItemForm(true);
  }

  async function handleItemSubmit() {
    const unitPrice = parseFloat(itemForm.unitPrice);
    const quantityOnHand = parseInt(itemForm.quantityOnHand, 10);
    const lowStockThreshold = parseInt(itemForm.lowStockThreshold, 10);
    if (!itemForm.name.trim()) { setError("Item name is required."); return; }
    if (!itemForm.category.trim()) { setError("Category is required."); return; }
    if (!unitPrice || unitPrice < 0) { setError("Enter a valid unit price."); return; }
    setError(null);

    const input = {
      name: itemForm.name.trim(), category: itemForm.category.trim(), unit: itemForm.unit.trim() || "pcs",
      unitPrice, quantityOnHand: Number.isFinite(quantityOnHand) ? quantityOnHand : 0,
      lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
      notes: itemForm.notes.trim() || undefined,
    };

    startTransition(async () => {
      try {
        if (editingItemId) await updateInventoryItem(editingItemId, input);
        else await createInventoryItem(input);
        setShowItemForm(false);
        setEditingItemId(null);
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleToggleActive(item: InventoryItemRow) {
    startTransition(async () => {
      try { await toggleInventoryItemActive(item.id, !item.isActive); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDeleteItem() {
    if (deleteItemTarget === null) return;
    startTransition(async () => {
      try { await deleteInventoryItem(deleteItemTarget); setDeleteItemTarget(null); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  async function handleSaleSubmit() {
    const quantity = parseInt(saleForm.quantity, 10);
    if (!saleForm.itemId) { setError("Select an item."); return; }
    if (!quantity || quantity <= 0) { setError("Enter a valid quantity."); return; }
    setError(null);

    startTransition(async () => {
      try {
        await recordInventorySale({
          itemId: Number(saleForm.itemId),
          quantity,
          buyerType: saleForm.buyerType,
          buyerName: saleForm.buyerName.trim() || undefined,
          paymentMethod: saleForm.paymentMethod,
          note: saleForm.note.trim() || undefined,
        });
        setShowSaleForm(false);
        setSaleForm(emptySaleForm);
        setTab("sales");
        router.refresh();
      } catch (e) { setError((e as Error).message); }
    });
  }

  async function handleDeleteSale() {
    if (deleteSaleTarget === null) return;
    startTransition(async () => {
      try { await deleteInventorySale(deleteSaleTarget); setDeleteSaleTarget(null); router.refresh(); }
      catch (e) { setError((e as Error).message); }
    });
  }

  const salesTotalPages = Math.ceil(salesTotal / salesPageSize);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-xl">
        <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Store</p>
        <h1 className="text-3xl font-black tracking-tight">Sales & Inventory</h1>
        <p className="mt-1 max-w-xl text-sm text-slate-300">
          Track stock levels and record sales to students and staff.
        </p>

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <nav className="flex gap-2 flex-wrap">
            {[{ key: "stock" as const, title: "Stock Items" }, { key: "sales" as const, title: "Sales Log" }].map((t) => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-all ${
                  tab === t.key ? "bg-white text-slate-900 shadow" : "border border-white/20 bg-white/10 text-white hover:bg-white/20"
                }`}>
                {t.title}
              </button>
            ))}
          </nav>
          <OperationsReportExport kind="inventory" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Active Items</p>
          <p className="mt-1 text-2xl font-black">{activeItems.length}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${lowStockCount > 0 ? "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800" : "bg-card"}`}>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Low Stock</p>
          <p className="mt-1 text-2xl font-black">{lowStockCount}</p>
        </div>
        <div className="rounded-2xl border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wide">Stock Value</p>
          <p className="mt-1 text-xl font-black">{currency(stockValue)}</p>
        </div>
        <div className="rounded-2xl border bg-emerald-50 border-emerald-200 p-4 dark:bg-emerald-950/30 dark:border-emerald-800">
          <p className="text-xs text-emerald-700 uppercase tracking-wide dark:text-emerald-400">Sales This Month</p>
          <p className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-300">{currency(salesThisMonth)}</p>
        </div>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center justify-between">
          {error}
          <button onClick={() => setError(null)}><X className="h-4 w-4" /></button>
        </div>
      )}

      {tab === "stock" && (
        <div className="space-y-4">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowSaleForm((v) => !v)} className="gap-2">
              <ShoppingCart className="h-4 w-4" /> Record Sale
            </Button>
            <Button onClick={openCreateItemForm} className="gap-2">
              <Plus className="h-4 w-4" /> Add Item
            </Button>
          </div>

          {showSaleForm && (
            <Card className="border-2 border-dashed border-indigo-300 bg-indigo-50/50 dark:border-indigo-600/40 dark:bg-indigo-950/30">
              <CardHeader><CardTitle className="text-base">Record Sale</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Item *</label>
                    <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={saleForm.itemId} onChange={(e) => setSaleForm((f) => ({ ...f, itemId: e.target.value }))}>
                      <option value="">Select item…</option>
                      {activeItems.map((i) => (
                        <option key={i.id} value={i.id}>{i.name} — {i.quantityOnHand} {i.unit} left</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Quantity *</label>
                    <input type="number" min="1" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={saleForm.quantity} onChange={(e) => setSaleForm((f) => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div className="flex items-end pb-2">
                    <p className="text-sm text-muted-foreground">
                      Total: <span className="font-bold text-foreground">{currency(saleTotalPreview)}</span>
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Buyer Type</label>
                    <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={saleForm.buyerType} onChange={(e) => setSaleForm((f) => ({ ...f, buyerType: e.target.value as (typeof BUYER_TYPES)[number] }))}>
                      {BUYER_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Buyer Name</label>
                    <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={saleForm.buyerName} onChange={(e) => setSaleForm((f) => ({ ...f, buyerName: e.target.value }))} placeholder="Optional" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Payment Method</label>
                    <select className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={saleForm.paymentMethod} onChange={(e) => setSaleForm((f) => ({ ...f, paymentMethod: e.target.value as (typeof PAYMENT_METHODS)[number] }))}>
                      {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleSaleSubmit} disabled={isPending}>{isPending ? "Recording…" : "Record Sale"}</Button>
                  <Button size="sm" variant="outline" onClick={() => setShowSaleForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {showItemForm && (
            <Card className="border-2 border-dashed border-sky-300 bg-sky-50/50 dark:border-sky-600/40 dark:bg-sky-950/30">
              <CardHeader><CardTitle className="text-base">{editingItemId ? "Edit Item" : "Add Stock Item"}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Name *</label>
                    <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.name} onChange={(e) => setItemForm((f) => ({ ...f, name: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Category *</label>
                    <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.category} onChange={(e) => setItemForm((f) => ({ ...f, category: e.target.value }))}
                      placeholder="e.g. Uniform, Stationery" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Unit</label>
                    <input className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.unit} onChange={(e) => setItemForm((f) => ({ ...f, unit: e.target.value }))} placeholder="pcs" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Unit Price (GHS) *</label>
                    <input type="number" min="0" step="0.01" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.unitPrice} onChange={(e) => setItemForm((f) => ({ ...f, unitPrice: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Quantity on Hand</label>
                    <input type="number" min="0" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.quantityOnHand} onChange={(e) => setItemForm((f) => ({ ...f, quantityOnHand: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-muted-foreground">Low Stock Threshold</label>
                    <input type="number" min="0" className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                      value={itemForm.lowStockThreshold} onChange={(e) => setItemForm((f) => ({ ...f, lowStockThreshold: e.target.value }))} />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-muted-foreground">Notes</label>
                  <textarea rows={2} className="mt-1 w-full rounded-lg border bg-background px-3 py-2 text-sm"
                    value={itemForm.notes} onChange={(e) => setItemForm((f) => ({ ...f, notes: e.target.value }))} />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={handleItemSubmit} disabled={isPending}>{isPending ? "Saving…" : editingItemId ? "Save Changes" : "Add Item"}</Button>
                  <Button size="sm" variant="outline" onClick={() => { setShowItemForm(false); setEditingItemId(null); }}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

          {items.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              No stock items yet. Add your first item to get started.
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => {
                const lowStock = item.quantityOnHand <= item.lowStockThreshold;
                return (
                  <div key={item.id} className={`rounded-2xl border bg-card p-4 ${!item.isActive ? "opacity-60" : ""}`}>
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="rounded-xl bg-indigo-50 p-2 dark:bg-indigo-900/30">
                          <Package className="h-5 w-5 text-indigo-600" />
                        </div>
                        <div>
                          <p className="font-semibold flex items-center gap-2">
                            {item.name}
                            {!item.isActive && <span className="rounded-full border px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">INACTIVE</span>}
                            {lowStock && item.isActive && (
                              <span className="flex items-center gap-1 rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800 dark:bg-amber-900/40 dark:text-amber-300 dark:border-amber-700">
                                <AlertTriangle className="h-3 w-3" /> LOW STOCK
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground">{item.category} · {currency(item.unitPrice)} / {item.unit}</p>
                          <p className="mt-1 text-sm">
                            <span className="font-bold">{item.quantityOnHand}</span> {item.unit} on hand
                          </p>
                          {item.notes && <p className="mt-1 text-xs text-muted-foreground">{item.notes}</p>}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => openEditItemForm(item)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1.5" onClick={() => handleToggleActive(item)}>
                          {item.isActive ? <><Ban className="h-3.5 w-3.5" /> Deactivate</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Activate</>}
                        </Button>
                        <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteItemTarget(item.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {tab === "sales" && (
        <div className="space-y-4">
          {sales.length === 0 ? (
            <div className="rounded-2xl border border-dashed p-12 text-center text-muted-foreground">
              No sales recorded yet.
            </div>
          ) : (
            <div className="space-y-3">
              {sales.map((sale) => (
                <div key={sale.id} className="rounded-2xl border bg-card p-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <p className="font-semibold">{sale.itemName} × {sale.quantity}</p>
                      <p className="text-xs text-muted-foreground">
                        {sale.buyerType}{sale.buyerName ? ` · ${sale.buyerName}` : ""} · {sale.paymentMethod} · {new Date(sale.soldAt).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">Recorded by {sale.recordedByName}</p>
                      {sale.note && <p className="mt-1 text-sm text-muted-foreground">{sale.note}</p>}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-lg font-black text-emerald-700 dark:text-emerald-400">{currency(sale.totalAmount)}</span>
                      <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setDeleteSaleTarget(sale.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {salesTotalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">Page {salesPage} of {salesTotalPages}</p>
              <div className="flex gap-2">
                {salesPage > 1 && (
                  <Link href={`/dashboard/inventory?salesPage=${salesPage - 1}`}><Button variant="outline" size="sm">Previous</Button></Link>
                )}
                {salesPage < salesTotalPages && (
                  <Link href={`/dashboard/inventory?salesPage=${salesPage + 1}`}><Button variant="outline" size="sm">Next</Button></Link>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {deleteItemTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Delete Item</h3>
            <p className="text-sm text-muted-foreground">This will permanently remove the item. Items with sales history cannot be deleted — deactivate them instead.</p>
            <div className="flex gap-2">
              <Button onClick={handleDeleteItem} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">{isPending ? "Deleting…" : "Confirm Delete"}</Button>
              <Button variant="outline" onClick={() => setDeleteItemTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}

      {deleteSaleTarget !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="w-full max-w-md rounded-2xl bg-background p-6 shadow-xl space-y-4">
            <h3 className="text-lg font-bold">Delete Sale Record</h3>
            <p className="text-sm text-muted-foreground">The sold quantity will be returned to stock. This cannot be undone.</p>
            <div className="flex gap-2">
              <Button onClick={handleDeleteSale} disabled={isPending} className="bg-red-600 hover:bg-red-700 text-white">{isPending ? "Deleting…" : "Confirm Delete"}</Button>
              <Button variant="outline" onClick={() => setDeleteSaleTarget(null)}>Cancel</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
