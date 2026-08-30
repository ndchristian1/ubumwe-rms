import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText, Plus, Pencil, Trash2, ChevronDown, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Select, Textarea } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import {
  api,
  type Expense,
  type ProfitTaxSummary,
  type PurchaseTaxRow,
  type SalesTaxRow,
  type TaxOverview,
  type TaxSettings,
} from "@/lib/api";
import { downloadCsv, downloadPdf } from "@/lib/downloads";
import { formatCurrency, toDateInputValue, cn } from "@/lib/utils";
import { friendlyError } from "@/lib/errors";

const PERIODS = ["daily", "weekly", "monthly", "custom"] as const;
const SECTIONS = ["overview", "sales", "purchases", "expenses"] as const;
type Period = (typeof PERIODS)[number];
type Section = (typeof SECTIONS)[number];

type TaxQuery = { period: Period; start?: string; end?: string };

const EXPENSE_CATEGORIES = ["Rent", "Utilities", "Salaries", "Transport", "Marketing", "Maintenance", "Insurance", "Taxes & Fees", "Other"];

const emptyExpenseForm = () => ({
  category: "Rent",
  amount: "",
  expense_date: new Date().toISOString().slice(0, 10),
  tax_relevant: true,
  reference_number: "",
  notes: "",
});

function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delayMs);
    return () => clearTimeout(timer);
  }, [value, delayMs]);
  return debounced;
}

export function TaxReportsPage() {
  const { toast } = useToast();
  const { t, pharmacy } = useApp();

  const [section, setSection] = useState<Section>("overview");
  const [query, setQuery] = useState<TaxQuery>({ period: "monthly" });
  const [uiPeriod, setUiPeriod] = useState<Period>("monthly");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebouncedValue(searchInput, 400);

  const [exporting, setExporting] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loadedOnce, setLoadedOnce] = useState(false);

  const [taxSettings, setTaxSettings] = useState<TaxSettings | null>(null);
  const [vatEnabled, setVatEnabled] = useState(true);
  const [vatRate, setVatRate] = useState("18");
  const [pricesIncludeVat, setPricesIncludeVat] = useState(true);
  const [savingVat, setSavingVat] = useState(false);
  const [showVatSettings, setShowVatSettings] = useState(false);

  const [overview, setOverview] = useState<TaxOverview | null>(null);
  const [profitSummary, setProfitSummary] = useState<ProfitTaxSummary | null>(null);
  const [salesRows, setSalesRows] = useState<SalesTaxRow[]>([]);
  const [purchaseRows, setPurchaseRows] = useState<PurchaseTaxRow[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [expenseDialog, setExpenseDialog] = useState(false);
  const [editExpense, setEditExpense] = useState<Expense | null>(null);
  const [deleteExpenseTarget, setDeleteExpenseTarget] = useState<Expense | null>(null);
  const [expenseForm, setExpenseForm] = useState(emptyExpenseForm);
  const [savingExpense, setSavingExpense] = useState(false);

  const currency = overview?.currency || taxSettings?.currency || pharmacy?.currency || "RWF";
  const pickingCustom = uiPeriod === "custom" && query.period !== "custom";

  const queryKey = `${query.period}|${query.start ?? ""}|${query.end ?? ""}|${debouncedSearch}`;

  useEffect(() => {
    if (query.period === "custom" && (!query.start || !query.end)) return;

    let cancelled = false;

    (async () => {
      setError("");
      try {
        const { period: p, start, end } = query;
        const search = debouncedSearch.trim() || undefined;
        const [settings, ov, profit, expenseList, sales, purchases] = await Promise.all([
          api.getTaxSettings(),
          api.taxOverview(p, start, end),
          api.profitTaxSummary(p, start, end),
          api.listExpenses(p, start, end),
          api.salesTaxReport(p, start, end, search),
          api.purchaseTaxReport(p, start, end, search),
        ]);
        if (cancelled) return;
        setTaxSettings(settings);
        setVatEnabled(settings.vat_enabled);
        setVatRate(String(settings.vat_rate));
        setPricesIncludeVat(settings.prices_include_vat);
        setOverview(ov);
        setProfitSummary(profit);
        setExpenses(expenseList);
        setSalesRows(sales);
        setPurchaseRows(purchases);
        setLoadedOnce(true);
      } catch (err) {
        if (!cancelled) setError(friendlyError(err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [queryKey, query]);

  async function reload() {
    if (query.period === "custom" && (!query.start || !query.end)) return;
    setError("");
    try {
      const { period: p, start, end } = query;
      const search = debouncedSearch.trim() || undefined;
      const [settings, ov, profit, expenseList, sales, purchases] = await Promise.all([
        api.getTaxSettings(),
        api.taxOverview(p, start, end),
        api.profitTaxSummary(p, start, end),
        api.listExpenses(p, start, end),
        api.salesTaxReport(p, start, end, search),
        api.purchaseTaxReport(p, start, end, search),
      ]);
      setTaxSettings(settings);
      setVatEnabled(settings.vat_enabled);
      setVatRate(String(settings.vat_rate));
      setPricesIncludeVat(settings.prices_include_vat);
      setOverview(ov);
      setProfitSummary(profit);
      setExpenses(expenseList);
      setSalesRows(sales);
      setPurchaseRows(purchases);
      setLoadedOnce(true);
    } catch (err) {
      setError(friendlyError(err));
    }
  }

  function selectPeriod(id: Period) {
    setUiPeriod(id);
    if (id === "custom") return;
    setQuery({ period: id });
  }

  function applyCustomPeriod() {
    if (!customStart || !customEnd) {
      toast({ type: "error", title: t("error"), description: t("select_custom_dates") });
      return;
    }
    if (customStart > customEnd) {
      toast({ type: "error", title: t("error"), description: t("invalid_date_range") });
      return;
    }
    setUiPeriod("custom");
    setQuery({ period: "custom", start: customStart, end: customEnd });
  }

  async function saveVatSettings() {
    const rate = Number(vatRate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
      toast({ type: "error", title: t("error"), description: t("vat_rate_invalid") });
      return;
    }
    setSavingVat(true);
    try {
      const updated = await api.updateTaxSettings({ vat_enabled: vatEnabled, vat_rate: rate, prices_include_vat: pricesIncludeVat });
      setTaxSettings(updated);
      toast({ type: "success", title: t("vat_settings_saved") });
      await reload();
    } catch (err) {
      toast({ type: "error", title: t("error"), description: friendlyError(err) });
    } finally {
      setSavingVat(false);
    }
  }

  function openAddExpense() {
    setEditExpense(null);
    setExpenseForm(emptyExpenseForm());
    setExpenseDialog(true);
  }

  function openEditExpense(expense: Expense) {
    setEditExpense(expense);
    setExpenseForm({
      category: expense.category,
      amount: String(expense.amount),
      expense_date: toDateInputValue(expense.expense_date),
      tax_relevant: expense.tax_relevant,
      reference_number: expense.reference_number || "",
      notes: expense.notes || "",
    });
    setExpenseDialog(true);
  }

  async function saveExpense() {
    const amount = Number(expenseForm.amount);
    if (!expenseForm.category.trim()) {
      toast({ type: "error", title: t("error"), description: `${t("expense_category")} required.` });
      return;
    }
    if (!Number.isFinite(amount) || amount < 0) {
      toast({ type: "error", title: t("error"), description: t("invalid_amount") });
      return;
    }
    setSavingExpense(true);
    try {
      const payload = {
        category: expenseForm.category.trim(),
        amount,
        expense_date: expenseForm.expense_date,
        tax_relevant: expenseForm.tax_relevant,
        reference_number: expenseForm.reference_number.trim() || undefined,
        notes: expenseForm.notes.trim() || undefined,
      };
      if (editExpense) await api.updateExpense({ id: editExpense.id, ...payload });
      else await api.createExpense(payload);
      setExpenseDialog(false);
      toast({ type: "success", title: t("expense_saved") });
      await reload();
    } catch (err) {
      toast({ type: "error", title: t("error"), description: friendlyError(err) });
    } finally {
      setSavingExpense(false);
    }
  }

  async function confirmDeleteExpense() {
    if (!deleteExpenseTarget) return;
    try {
      await api.deleteExpense(deleteExpenseTarget.id);
      setDeleteExpenseTarget(null);
      toast({ type: "success", title: t("expense_deleted") });
      await reload();
    } catch (err) {
      toast({ type: "error", title: t("error"), description: friendlyError(err) });
    }
  }

  async function exportExcel(name: string, filename: string, rows: string[][]) {
    setExporting(`${filename}-excel`);
    try {
      const result = await downloadCsv(filename.endsWith(".csv") ? filename : `${filename}.csv`, rows);
      if (!result.ok) {
        if ("cancelled" in result) return;
        throw new Error("error" in result ? result.error : t("export_failed"));
      }
      toast({ type: "success", title: t("excel_saved"), description: `${name} ${t("saved_successfully")}` });
    } catch (err) {
      toast({ type: "error", title: t("export_failed"), description: friendlyError(err) });
    } finally {
      setExporting(null);
    }
  }

  async function exportPdfReport(name: string, rows: string[][]) {
    setExporting(`${name}-pdf`);
    try {
      const title = `${pharmacy?.name || "UBUMWE RMS"} — ${name}`;
      const result = await downloadPdf(title, rows);
      if (!result.ok) {
        if ("cancelled" in result) return;
        throw new Error("error" in result ? result.error : t("export_failed"));
      }
      toast({ type: "success", title: t("pdf_saved"), description: `${name} ${t("saved_successfully")}` });
    } catch (err) {
      toast({ type: "error", title: t("export_failed"), description: friendlyError(err) });
    } finally {
      setExporting(null);
    }
  }

  const overviewExportRows = useMemo(() => {
    if (!overview) return [[t("metric"), t("value")]];
    return [
      [t("metric"), t("value")],
      [t("period_range"), `${overview.start_date} — ${overview.end_date}`],
      [t("total_sales"), formatCurrency(overview.total_sales, currency)],
      [t("gross_profit"), formatCurrency(overview.gross_profit, currency)],
      [t("net_profit"), formatCurrency(profitSummary?.net_profit ?? 0, currency)],
      [t("vat_collected"), formatCurrency(overview.vat_collected, currency)],
      [t("estimated_vat_payable"), formatCurrency(overview.estimated_vat_payable, currency)],
    ];
  }, [overview, profitSummary, currency, t]);

  const salesExportRows = useMemo(
    () => [
      [t("date"), t("receipt_number"), t("total"), t("tax_amount"), t("payment_method")],
      ...salesRows.map((r) => [r.date.slice(0, 10), r.receipt_number, formatCurrency(r.total_amount, currency), formatCurrency(r.tax_amount, currency), r.payment_method]),
    ],
    [salesRows, currency, t],
  );

  const purchaseExportRows = useMemo(
    () => [
      [t("purchase_date"), t("supplier"), t("medicine"), t("purchase_amount"), t("tax_paid")],
      ...purchaseRows.map((r) => [r.purchase_date.slice(0, 10), r.supplier_name, r.medicine_name, formatCurrency(r.purchase_amount, currency), formatCurrency(r.tax_paid, currency)]),
    ],
    [purchaseRows, currency, t],
  );

  const expenseExportRows = useMemo(
    () => [
      [t("date"), t("expense_category"), t("amount"), t("tax_relevance"), t("notes")],
      ...expenses.map((e) => [e.expense_date.slice(0, 10), e.category, formatCurrency(e.amount, currency), e.tax_relevant ? t("yes") : t("no"), e.notes || ""]),
    ],
    [expenses, currency, t],
  );

  function ExportButtons({ name, filename, rows }: { name: string; filename: string; rows: string[][] }) {
    return (
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!exporting || rows.length <= 1} onClick={() => exportExcel(name, filename, rows)}>
          <FileSpreadsheet className="h-3 w-3 mr-1" />
          {exporting === `${filename}-excel` ? t("saving") : t("download_excel")}
        </Button>
        <Button size="sm" variant="outline" disabled={!!exporting || rows.length <= 1} onClick={() => exportPdfReport(name, rows)}>
          <FileText className="h-3 w-3 mr-1" />
          {exporting === `${name}-pdf` ? t("saving") : t("download_pdf")}
        </Button>
      </div>
    );
  }

  function sectionLabel(id: Section) {
    if (id === "overview") return t("overview");
    if (id === "sales") return t("sales_tax");
    if (id === "purchases") return t("purchase_tax");
    return t("expenses");
  }

  function money(value: number | undefined | null) {
    return formatCurrency(value ?? 0, currency);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("tax_reports")}</h1>
        <p className="text-muted-foreground">{t("tax_reports_subtitle")}</p>
      </div>

      {error && (
        <Card className="border-destructive/50">
          <CardContent className="py-4 text-sm text-destructive">{error}</CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="pt-6 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground mr-1">{t("period_range")}:</span>
            {PERIODS.map((id) => (
              <Button key={id} variant={uiPeriod === id ? "default" : "outline"} size="sm" onClick={() => selectPeriod(id)}>
                {id === "custom" ? t("custom_period") : t(id)}
              </Button>
            ))}
          </div>
          {uiPeriod === "custom" && (
            <div className="flex flex-wrap items-end gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{t("start_date")}</Label>
                <Input type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} className="w-40" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("end_date")}</Label>
                <Input type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} className="w-40" />
              </div>
              <Button size="sm" onClick={applyCustomPeriod}>{t("apply_period")}</Button>
            </div>
          )}
          {pickingCustom && (
            <p className="text-sm text-amber-600 dark:text-amber-400">{t("select_custom_dates")}</p>
          )}
          {overview && !pickingCustom && (
            <p className="text-xs text-muted-foreground">
              {overview.start_date} — {overview.end_date}
              {overview.vat_enabled ? ` · VAT ${overview.vat_rate}%` : ""}
            </p>
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2">
        {SECTIONS.map((id) => (
          <Button key={id} variant={section === id ? "default" : "outline"} size="sm" onClick={() => setSection(id)}>
            {sectionLabel(id)}
          </Button>
        ))}
      </div>

      {section === "overview" && (
        <>
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle>{t("tax_overview")}</CardTitle>
                <CardDescription>{t("tax_overview_desc")}</CardDescription>
              </div>
              {overview && <ExportButtons name={t("tax_overview")} filename="tax_overview.csv" rows={overviewExportRows} />}
            </CardHeader>
            <CardContent>
              {!loadedOnce && !overview ? (
                <p className="text-sm text-muted-foreground py-4">{t("loading_tax_data")}</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[
                    [t("total_sales"), overview?.total_sales],
                    [t("gross_profit"), overview?.gross_profit],
                    [t("net_profit"), profitSummary?.net_profit],
                    [t("estimated_vat_payable"), overview?.estimated_vat_payable],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border p-4">
                      <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="text-xl font-semibold mt-1">{money(value as number | undefined)}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{t("profit_tax_summary")}</CardTitle>
            </CardHeader>
            <CardContent>
              {profitSummary ? (
                <div className="grid gap-2 sm:grid-cols-2">
                  {[
                    [t("revenue"), profitSummary.revenue],
                    [t("cost_of_goods_sold"), profitSummary.cost_of_goods_sold],
                    [t("operating_expenses"), profitSummary.operating_expenses],
                    [t("vat_collected"), profitSummary.vat_collected],
                    [t("vat_paid"), profitSummary.vat_paid],
                    [t("estimated_taxable_income"), profitSummary.estimated_taxable_income],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="flex justify-between py-2 border-b text-sm">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="font-medium">{money(value as number)}</span>
                    </div>
                  ))}
                </div>
              ) : loadedOnce ? (
                <p className="text-sm text-muted-foreground">{t("no_tax_data")}</p>
              ) : (
                <p className="text-sm text-muted-foreground">{t("loading_tax_data")}</p>
              )}
            </CardContent>
          </Card>

          <Card className="overflow-hidden">
            <button
              type="button"
              onClick={() => setShowVatSettings((v) => !v)}
              aria-expanded={showVatSettings}
              className={cn(
                "flex w-full items-center justify-between gap-4 px-6 py-4 text-left transition-colors",
                "hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                showVatSettings && "border-b bg-accent/40",
              )}
            >
              <span className="flex items-center gap-3 min-w-0">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border bg-background shadow-sm">
                  <Settings2 className="h-4 w-4 text-primary" />
                </span>
                <span className="min-w-0">
                  <span className="block font-semibold text-sm">{t("vat_settings")}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">
                    {showVatSettings ? t("vat_settings_hide") : t("vat_settings_show")}
                  </span>
                </span>
              </span>
              <ChevronDown
                className={cn(
                  "h-5 w-5 shrink-0 text-muted-foreground transition-transform duration-200",
                  showVatSettings && "rotate-180",
                )}
              />
            </button>
            {showVatSettings && (
              <CardContent className="space-y-4 max-w-md pt-4">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={vatEnabled} onChange={(e) => setVatEnabled(e.target.checked)} />
                  {t("vat_enabled")}
                </label>
                <div>
                  <Label>{t("vat_rate")}</Label>
                  <Input type="number" min={0} max={100} step={0.1} value={vatRate} onChange={(e) => setVatRate(e.target.value)} />
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={pricesIncludeVat} onChange={(e) => setPricesIncludeVat(e.target.checked)} />
                  {t("prices_include_vat")}
                </label>
                <Button onClick={saveVatSettings} disabled={savingVat}>
                  {savingVat ? t("saving") : t("save_vat_settings")}
                </Button>
              </CardContent>
            )}
          </Card>
        </>
      )}

      {section === "sales" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("sales_tax_report")}</CardTitle>
              <Input placeholder={t("search")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="mt-2 max-w-xs" />
            </div>
            <ExportButtons name={t("sales_tax_report")} filename="sales_tax_report.csv" rows={salesExportRows} />
          </CardHeader>
          <CardContent>
            {salesRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{loadedOnce ? t("no_tax_data") : t("loading_tax_data")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("receipt_number")}</TableHead>
                    <TableHead>{t("total")}</TableHead>
                    <TableHead>{t("tax_amount")}</TableHead>
                    <TableHead>{t("payment_method")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salesRows.map((r) => (
                    <TableRow key={r.sale_id}>
                      <TableCell>{r.date.slice(0, 10)}</TableCell>
                      <TableCell>{r.receipt_number}</TableCell>
                      <TableCell>{money(r.total_amount)}</TableCell>
                      <TableCell>{money(r.tax_amount)}</TableCell>
                      <TableCell>{r.payment_method}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "purchases" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("purchase_tax_report")}</CardTitle>
              <Input placeholder={t("search")} value={searchInput} onChange={(e) => setSearchInput(e.target.value)} className="mt-2 max-w-xs" />
            </div>
            <ExportButtons name={t("purchase_tax_report")} filename="purchase_tax_report.csv" rows={purchaseExportRows} />
          </CardHeader>
          <CardContent>
            {purchaseRows.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{loadedOnce ? t("no_tax_data") : t("loading_tax_data")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("purchase_date")}</TableHead>
                    <TableHead>{t("supplier")}</TableHead>
                    <TableHead>{t("medicine")}</TableHead>
                    <TableHead>{t("purchase_amount")}</TableHead>
                    <TableHead>{t("tax_paid")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {purchaseRows.map((r) => (
                    <TableRow key={r.batch_id}>
                      <TableCell>{r.purchase_date.slice(0, 10)}</TableCell>
                      <TableCell>{r.supplier_name}</TableCell>
                      <TableCell>{r.medicine_name}</TableCell>
                      <TableCell>{money(r.purchase_amount)}</TableCell>
                      <TableCell>{money(r.tax_paid)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      {section === "expenses" && (
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle>{t("expense_tax_report")}</CardTitle>
              <CardDescription>{t("expense_tax_report_desc")}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={openAddExpense}>
                <Plus className="h-3 w-3 mr-1" /> {t("add_expense")}
              </Button>
              <ExportButtons name={t("expense_tax_report")} filename="expense_tax_report.csv" rows={expenseExportRows} />
            </div>
          </CardHeader>
          <CardContent>
            {expenses.length === 0 ? (
              <p className="text-sm text-muted-foreground py-6 text-center">{loadedOnce ? t("no_expenses") : t("loading_tax_data")}</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t("date")}</TableHead>
                    <TableHead>{t("expense_category")}</TableHead>
                    <TableHead>{t("amount")}</TableHead>
                    <TableHead>{t("tax_relevance")}</TableHead>
                    <TableHead>{t("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expenses.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{e.expense_date.slice(0, 10)}</TableCell>
                      <TableCell>{e.category}</TableCell>
                      <TableCell>{money(e.amount)}</TableCell>
                      <TableCell>{e.tax_relevant ? t("yes") : t("no")}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost" onClick={() => openEditExpense(e)}><Pencil className="h-3 w-3" /></Button>
                          <Button size="sm" variant="ghost" onClick={() => setDeleteExpenseTarget(e)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      )}

      <Dialog open={expenseDialog} onOpenChange={setExpenseDialog}>
        <DialogContent className="max-w-md gap-6">
          <DialogHeader>
            <DialogTitle>{editExpense ? t("edit_expense") : t("add_expense")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("expense_category")}</Label>
              <Select value={expenseForm.category} onChange={(e) => setExpenseForm((f) => ({ ...f, category: e.target.value }))}>
                {EXPENSE_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
            <div>
              <Label>{t("amount")}</Label>
              <Input type="number" min={0} step={0.01} value={expenseForm.amount} onChange={(e) => setExpenseForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div>
              <Label>{t("date")}</Label>
              <Input type="date" value={expenseForm.expense_date} onChange={(e) => setExpenseForm((f) => ({ ...f, expense_date: e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={expenseForm.tax_relevant} onChange={(e) => setExpenseForm((f) => ({ ...f, tax_relevant: e.target.checked }))} />
              {t("tax_relevant")}
            </label>
            <div>
              <Label>{t("reference_optional")}</Label>
              <Input value={expenseForm.reference_number} onChange={(e) => setExpenseForm((f) => ({ ...f, reference_number: e.target.value }))} />
            </div>
            <div>
              <Label>{t("notes_optional")}</Label>
              <Textarea value={expenseForm.notes} onChange={(e) => setExpenseForm((f) => ({ ...f, notes: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setExpenseDialog(false)}>{t("cancel")}</Button>
              <Button onClick={saveExpense} disabled={savingExpense}>{savingExpense ? t("saving") : t("save")}</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteExpenseTarget !== null} onOpenChange={() => setDeleteExpenseTarget(null)}>
        <DialogContent className="gap-6">
          <DialogHeader><DialogTitle>{t("delete_expense_title")}</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">{t("delete_expense_desc")}</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleteExpenseTarget(null)}>{t("cancel")}</Button>
            <Button variant="destructive" onClick={confirmDeleteExpense}>{t("delete")}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
