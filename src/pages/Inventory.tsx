import { useEffect, useMemo, useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FormField, Input } from "@/components/ui/input";
import { NumberInput } from "@/components/ui/number-input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { api, type Batch, type InventoryTransaction } from "@/lib/api";
import { friendlyError } from "@/lib/errors";
import { formatDate } from "@/lib/utils";
import { transactionLabel } from "@/i18n/translations";

type BatchSort = "expiry_asc" | "expiry_desc" | "name" | "quantity";
type HistorySort = "date_desc" | "date_asc" | "name" | "type";

export function InventoryPage() {
  const { toast } = useToast();
  const { t, language, refreshAlerts } = useApp();
  const [batches, setBatches] = useState<Batch[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [addDialog, setAddDialog] = useState<number | null>(null);
  const [adjustDialog, setAdjustDialog] = useState<number | null>(null);
  const [quantity, setQuantity] = useState(0);
  const [newQty, setNewQty] = useState(0);
  const [notes, setNotes] = useState("");
  const [batchSort, setBatchSort] = useState<BatchSort>("expiry_asc");
  const [historySort, setHistorySort] = useState<HistorySort>("date_desc");

  const sortedBatches = useMemo(() => {
    const copy = [...batches];
    copy.sort((a, b) => {
      if (batchSort === "name") return a.medicine_name.localeCompare(b.medicine_name);
      if (batchSort === "quantity") return b.quantity - a.quantity;
      const da = new Date(a.expiry_date).getTime();
      const db = new Date(b.expiry_date).getTime();
      return batchSort === "expiry_desc" ? db - da : da - db;
    });
    return copy;
  }, [batches, batchSort]);

  const sortedTransactions = useMemo(() => {
    const copy = [...transactions];
    copy.sort((a, b) => {
      if (historySort === "name") return a.medicine_name.localeCompare(b.medicine_name);
      if (historySort === "type") return a.transaction_type.localeCompare(b.transaction_type);
      const da = new Date(a.created_at.replace(" ", "T")).getTime();
      const db = new Date(b.created_at.replace(" ", "T")).getTime();
      return historySort === "date_asc" ? da - db : db - da;
    });
    return copy;
  }, [transactions, historySort]);

  async function load() {
    const [b, tx] = await Promise.all([api.listBatches(), api.listTransactions({ page: 1, page_size: 200 })]);
    setBatches(b);
    setTransactions(tx.items);
  }

  useEffect(() => { load(); }, []);

  async function handleAddStock(e: React.FormEvent) {
    e.preventDefault();
    if (addDialog === null) return;
    try {
      await api.addStock({ batch_id: addDialog, quantity, notes: notes || undefined });
      setAddDialog(null); setQuantity(0); setNotes("");
      toast({ type: "success", title: t("stock_added"), description: t("inventory_updated") });
      await refreshAlerts();
      load();
    } catch (err) {
      toast({ type: "error", title: t("could_not_add_stock"), description: friendlyError(err) });
    }
  }

  async function handleAdjust(e: React.FormEvent) {
    e.preventDefault();
    if (adjustDialog === null) return;
    try {
      await api.adjustStock({ batch_id: adjustDialog, new_quantity: newQty, notes: notes || undefined });
      setAdjustDialog(null); setNewQty(0); setNotes("");
      toast({ type: "success", title: t("stock_adjusted"), description: t("inventory_updated") });
      await refreshAlerts();
      load();
    } catch (err) {
      toast({ type: "error", title: t("could_not_adjust"), description: friendlyError(err) });
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("inventory")}</h1>
        <p className="text-muted-foreground">{t("inventory_subtitle")}</p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("current_stock")}</CardTitle>
          <select value={batchSort} onChange={(e) => setBatchSort(e.target.value as BatchSort)} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="expiry_asc">{t("sort_expiry_soonest")}</option>
            <option value="expiry_desc">{t("sort_expiry_latest")}</option>
            <option value="name">{t("sort_by_name")}</option>
            <option value="quantity">{t("sort_by_quantity")}</option>
          </select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("medicine")}</TableHead>
                <TableHead>{t("batch")}</TableHead>
                <TableHead>{t("quantity")}</TableHead>
                <TableHead>{t("expiry_col")}</TableHead>
                <TableHead>{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedBatches.map((b) => (
                <TableRow key={b.id}>
                  <TableCell className="font-medium">{b.medicine_name}</TableCell>
                  <TableCell>{b.batch_number}</TableCell>
                  <TableCell>{b.quantity}</TableCell>
                  <TableCell>{formatDate(b.expiry_date)}</TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => { setAddDialog(b.id); setQuantity(0); setNotes(""); }}><Plus className="h-3 w-3" /> {t("add_stock")}</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setAdjustDialog(b.id); setNewQty(b.quantity); setNotes(""); }}>{t("adjust")}</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-4">
          <CardTitle>{t("inventory_history")}</CardTitle>
          <select value={historySort} onChange={(e) => setHistorySort(e.target.value as HistorySort)} className="rounded-md border bg-background px-3 py-2 text-sm">
            <option value="date_desc">{t("sort_date_newest")}</option>
            <option value="date_asc">{t("sort_date_oldest")}</option>
            <option value="name">{t("sort_by_name")}</option>
            <option value="type">{t("sort_transaction_type")}</option>
          </select>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("date")}</TableHead>
                <TableHead>{t("medicine")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("change_col")}</TableHead>
                <TableHead>{t("before_after")}</TableHead>
                <TableHead>{t("notes")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedTransactions.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>{formatDate(row.created_at)}</TableCell>
                  <TableCell>{row.medicine_name} ({row.batch_number})</TableCell>
                  <TableCell>{transactionLabel(language, row.transaction_type)}</TableCell>
                  <TableCell>{row.quantity_change > 0 ? `+${row.quantity_change}` : row.quantity_change}</TableCell>
                  <TableCell>{row.quantity_before} → {row.quantity_after}</TableCell>
                  <TableCell>{row.notes || "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addDialog !== null} onOpenChange={() => setAddDialog(null)}>
        <DialogContent className="gap-6">
          <DialogHeader><DialogTitle>{t("add_stock_title")}</DialogTitle></DialogHeader>
          <form onSubmit={handleAddStock} className="space-y-4">
            <FormField label={t("qty_to_add")}><NumberInput min={1} value={quantity} onChange={setQuantity} /></FormField>
            <FormField label={t("notes")}><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
            <div className="pt-2"><Button type="submit">{t("confirm_add")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={adjustDialog !== null} onOpenChange={() => setAdjustDialog(null)}>
        <DialogContent className="gap-6">
          <DialogHeader><DialogTitle>{t("adjust_stock_title")}</DialogTitle></DialogHeader>
          <form onSubmit={handleAdjust} className="space-y-4">
            <FormField label={t("new_quantity")}><NumberInput min={0} value={newQty} onChange={setNewQty} /></FormField>
            <FormField label={t("notes")}><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></FormField>
            <div className="pt-2"><Button type="submit">{t("confirm_adjustment")}</Button></div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
