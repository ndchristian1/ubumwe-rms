import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Archive, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Select, FormField } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { api, type Batch, type Medicine } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { CATEGORIES, formatDate, toDateInputValue } from "@/lib/utils";

const emptyForm = {
  name: "", category: "General", description: "", low_stock_threshold: 0,
  batch_number: "", expiry_date: "", quantity: 0, purchase_price: 0, selling_price: 0, supplier_name: "",
};

export function MedicinesPage() {
  const { toast } = useToast();
  const { t, refreshAlerts } = useApp();
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Medicine | null>(null);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editTarget, setEditTarget] = useState<Medicine | null>(null);
  const [editBatches, setEditBatches] = useState<Batch[]>([]);
  const [editLoading, setEditLoading] = useState(false);
  const [searchParams] = useSearchParams();
  const lowStockOnly = searchParams.get("low_stock") === "1";

  const load = useCallback(async () => {
    const result = await api.listMedicines({ search, category, page, page_size: 20, low_stock_only: lowStockOnly || undefined });
    setMedicines(result.items);
    setTotal(result.total);
  }, [search, category, page, lowStockOnly]);

  useEffect(() => { load(); }, [load]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = form.name;
    try {
      await api.createMedicine(form);
      setDialogOpen(false);
      setForm(emptyForm);
      toast({ type: "success", title: t("medicine_saved"), description: t("medicine_added_desc", { name }) });
      await refreshAlerts();
      load();
    } catch (err) {
      toast({ type: "error", title: t("could_not_save_medicine"), description: friendlyError(err) });
    }
  }

  async function handleArchive(m: Medicine) {
    if (!confirm(t("archive_confirm", { name: m.name }))) return;
    try {
      await api.archiveMedicine(m.id);
      toast({ type: "success", title: t("medicine_hidden"), description: t("medicine_archived_desc", { name: m.name }) });
      await refreshAlerts();
      load();
    } catch (err) {
      toast({ type: "error", title: t("could_not_archive"), description: friendlyError(err) });
    }
  }

  async function openEdit(m: Medicine) {
    setEditTarget({ ...m });
    setEditBatches([]);
    setEditLoading(true);
    try {
      const batches = await api.listBatches(m.id);
      setEditBatches(batches);
    } catch (err) {
      toast({ type: "error", title: t("update_failed"), description: friendlyError(err) });
      setEditTarget(null);
    } finally {
      setEditLoading(false);
    }
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    const name = editTarget.name;
    try {
      for (const batch of editBatches) {
        if (!batch.batch_number.trim()) {
          throw new Error(t("batch_number_required"));
        }
        if (!batch.expiry_date) {
          throw new Error(t("expiry_date_required"));
        }
        if (batch.purchase_price < 0 || batch.selling_price < 0) {
          throw new Error(t("prices_cannot_be_negative"));
        }
      }
      await api.updateMedicine({
        id: editTarget.id,
        name: editTarget.name,
        category: editTarget.category,
        description: editTarget.description || "",
        low_stock_threshold: editTarget.low_stock_threshold,
      });
      await Promise.all(
        editBatches.map((batch) =>
          api.updateBatch({
            id: batch.id,
            batch_number: batch.batch_number,
            expiry_date: batch.expiry_date,
            purchase_price: batch.purchase_price,
            selling_price: batch.selling_price,
            supplier_id: batch.supplier_id,
          }),
        ),
      );
      setEditTarget(null);
      setEditBatches([]);
      toast({ type: "success", title: t("medicine_updated"), description: t("medicine_updated_desc", { name }) });
      await refreshAlerts();
      load();
    } catch (err) {
      toast({ type: "error", title: t("update_failed"), description: friendlyError(err) });
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    if (!pin.trim()) {
      setPinError(t("enter_owner_pin"));
      return;
    }
    setDeleting(true);
    setPinError("");
    try {
      const ok = await api.verifyPin(pin);
      if (!ok) {
        setPinError(t("wrong_pin"));
        toast({ type: "error", title: t("wrong_pin_title"), description: t("wrong_pin_desc") });
        return;
      }
      const name = deleteTarget.name;
      await api.deleteMedicine(deleteTarget.id, pin);
      toast({ type: "success", title: t("medicine_deleted"), description: t("medicine_deleted_desc", { name }) });
      setDeleteTarget(null);
      setPin("");
      await refreshAlerts();
      load();
    } catch (err) {
      setPinError(friendlyError(err));
      toast({ type: "error", title: t("delete_failed"), description: friendlyError(err) });
    } finally {
      setDeleting(false);
    }
  }

  const totalPages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("medicines")}</h1>
          <p className="text-muted-foreground">{t("medicines_subtitle")}</p>
          {lowStockOnly && <p className="text-sm text-orange-600 mt-1">{t("low_stock_filter")}</p>}
        </div>
        <Button onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4" /> {t("add_medicine")}</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-wrap gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder={t("search_medicines")} value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="w-48">
              <option value="">{t("all_categories")}</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("name")}</TableHead>
                <TableHead>{t("category")}</TableHead>
                <TableHead>{t("stock")}</TableHead>
                <TableHead>{t("batches")}</TableHead>
                <TableHead>{t("nearest_expiry")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {medicines.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="font-medium">{m.name}</TableCell>
                  <TableCell>{m.category}</TableCell>
                  <TableCell>{m.total_quantity}</TableCell>
                  <TableCell>{m.batch_count}</TableCell>
                  <TableCell>{m.nearest_expiry ? formatDate(m.nearest_expiry) : "—"}</TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" variant="secondary" onClick={() => openEdit(m)}><Pencil className="h-3 w-3 mr-1" /> {t("edit")}</Button>
                      <Button size="sm" variant="outline" title={t("archive_hide_title")} onClick={() => handleArchive(m)}>
                        <Archive className="h-3 w-3 mr-1" /> {t("archive")}
                      </Button>
                      <Button size="sm" variant="destructive" title={t("delete_pin_title")} onClick={() => { setDeleteTarget(m); setPin(""); setPinError(""); }}>
                        <Trash2 className="h-3 w-3 mr-1" /> {t("delete")}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {medicines.length === 0 && (
                <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">{t("no_medicines")}</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
          {totalPages > 1 && (
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t("previous")}</Button>
              <span className="text-sm self-center">{t("page_of", { page, total: totalPages })}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(page + 1)}>{t("next")}</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-6">
          <DialogHeader><DialogTitle>{t("add_medicine")}</DialogTitle></DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <FormField label={`${t("medicine_name")} *`}><Input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></FormField>
            <FormField label={t("category")}>
              <Select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </FormField>
            <div className="grid grid-cols-2 gap-4">
              <FormField label={`${t("batch_number")} *`}><Input required value={form.batch_number} onChange={(e) => setForm({ ...form, batch_number: e.target.value })} /></FormField>
              <FormField label={`${t("expiry_date")} *`}><Input type="date" required value={form.expiry_date} onChange={(e) => setForm({ ...form, expiry_date: e.target.value })} /></FormField>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <FormField label={t("quantity")}><NumberInput value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} /></FormField>
              <FormField label={t("purchase_price")}><NumberInput step={0.01} value={form.purchase_price} onChange={(v) => setForm({ ...form, purchase_price: v })} /></FormField>
              <FormField label={t("selling_price")}><NumberInput step={0.01} value={form.selling_price} onChange={(v) => setForm({ ...form, selling_price: v })} /></FormField>
            </div>
            <FormField label={t("supplier")}><Input value={form.supplier_name} onChange={(e) => setForm({ ...form, supplier_name: e.target.value })} /></FormField>
            <FormField label={t("low_stock_threshold")}><NumberInput value={form.low_stock_threshold} onChange={(v) => setForm({ ...form, low_stock_threshold: v })} /></FormField>
            <div className="pt-2"><Button type="submit" className="w-full">{t("save_medicine")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editTarget !== null} onOpenChange={() => { setEditTarget(null); setEditBatches([]); }}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto gap-6">
          <DialogHeader><DialogTitle>{t("edit_medicine")}</DialogTitle></DialogHeader>
          {editTarget && (
            editLoading ? (
              <p className="text-sm text-muted-foreground py-4">{t("loading")}</p>
            ) : (
              <form onSubmit={handleUpdate} className="space-y-4">
                <FormField label={`${t("name")} *`}><Input required value={editTarget.name} onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })} /></FormField>
                <FormField label={t("category")}>
                  <Select value={editTarget.category} onChange={(e) => setEditTarget({ ...editTarget, category: e.target.value })}>
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </Select>
                </FormField>
                <FormField label={t("low_stock_threshold")}><NumberInput value={editTarget.low_stock_threshold} onChange={(v) => setEditTarget({ ...editTarget, low_stock_threshold: v })} /></FormField>
                {editBatches.length > 0 && (
                  <div className="space-y-3 rounded-lg border p-4">
                    <p className="text-sm font-medium">{t("batch_pricing")}</p>
                    {editBatches.map((batch, index) => (
                      <div key={batch.id} className="space-y-3 rounded-md bg-muted/40 p-3">
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label={`${t("batch_number")} *`}>
                            <Input
                              required
                              value={batch.batch_number}
                              onChange={(e) => {
                                const next = [...editBatches];
                                next[index] = { ...batch, batch_number: e.target.value };
                                setEditBatches(next);
                              }}
                            />
                          </FormField>
                          <FormField label={`${t("expiry_date")} *`}>
                            <Input
                              type="date"
                              required
                              value={toDateInputValue(batch.expiry_date)}
                              onChange={(e) => {
                                const next = [...editBatches];
                                next[index] = { ...batch, expiry_date: e.target.value };
                                setEditBatches(next);
                              }}
                            />
                          </FormField>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <FormField label={t("purchase_price")}>
                            <NumberInput
                              step={0.01}
                              value={batch.purchase_price}
                              onChange={(v) => {
                                const next = [...editBatches];
                                next[index] = { ...batch, purchase_price: v };
                                setEditBatches(next);
                              }}
                            />
                          </FormField>
                          <FormField label={t("selling_price")}>
                            <NumberInput
                              step={0.01}
                              value={batch.selling_price}
                              onChange={(v) => {
                                const next = [...editBatches];
                                next[index] = { ...batch, selling_price: v };
                                setEditBatches(next);
                              }}
                            />
                          </FormField>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <div className="pt-2"><Button type="submit" className="w-full">{t("save_changes")}</Button></div>
              </form>
            )
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={deleteTarget !== null} onOpenChange={() => { setDeleteTarget(null); setPin(""); setPinError(""); }}>
        <DialogContent className="gap-6">
          <DialogHeader>
            <DialogTitle>{t("delete_confirm", { name: deleteTarget?.name ?? "" })}</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">{t("delete_confirm_desc")}</p>
          <form onSubmit={(e) => { e.preventDefault(); handleDelete(); }} className="space-y-4">
            <FormField label={t("owner_pin_label")} error={pinError}>
              <Input type="password" value={pin} onChange={(e) => { setPin(e.target.value); setPinError(""); }} autoFocus />
            </FormField>
            <div className="pt-2">
              <Button type="submit" variant="destructive" disabled={deleting || !pin.trim()}>
                {deleting ? t("deleting") : t("delete_permanently")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
