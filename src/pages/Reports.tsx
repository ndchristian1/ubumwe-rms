import { useEffect, useMemo, useState } from "react";
import { FileSpreadsheet, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { useApp } from "@/context/AppContext";
import { api, type PeriodAnalysis, type ProfitReportItem, type ReportRow } from "@/lib/api";
import { downloadCsv, downloadPdf } from "@/lib/downloads";
import { formatCurrency } from "@/lib/utils";
import { transactionLabel as txLabel } from "@/i18n/translations";
import { friendlyError } from "@/lib/errors";

const PERIOD_IDS = ["daily", "weekly", "monthly", "yearly"] as const;

export function ReportsPage() {
  const { toast } = useToast();
  const { t, pharmacy, language } = useApp();
  const [period, setPeriod] = useState("weekly");
  const [analysis, setAnalysis] = useState<PeriodAnalysis | null>(null);
  const [inventory, setInventory] = useState<ReportRow[]>([]);
  const [expiry, setExpiry] = useState<ReportRow[]>([]);
  const [profit, setProfit] = useState<ProfitReportItem[]>([]);
  const [movement, setMovement] = useState<ReportRow[]>([]);
  const [currency, setCurrency] = useState("RWF");
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.periodAnalysis(period),
      api.inventoryReport(),
      api.expiryReport(),
      api.profitReport(),
      api.stockMovementReport(30),
      api.getSettings(),
    ]).then(([pa, inv, exp, prof, mov, settings]) => {
      setAnalysis(pa);
      setInventory(inv);
      setExpiry(exp);
      setProfit(prof);
      setMovement(mov);
      setCurrency(settings.currency);
    }).finally(() => setLoading(false));
  }, [period]);

  const periodRows = useMemo(() => {
    if (!analysis) return [[t("metric"), t("value")]];
    return [[t("metric"), t("value")], ...analysis.summary.map((r) => [r.label, r.value])];
  }, [analysis, t]);

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
      const title = `${pharmacy?.name || "Ubumwe RMS"} — ${name}`;
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

  const profitRows = useMemo(
    () => [[t("medicine"), t("batch"), t("quantity"), t("expected_profit_col")], ...profit.map((p) => [
      p.medicine_name,
      p.batch_number,
      String(p.quantity),
      formatCurrency(p.expected_profit, currency),
    ])],
    [profit, currency, t],
  );

  if (loading) return <div className="p-8 text-muted-foreground">{t("loading")}</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports")}</h1>
        <p className="text-muted-foreground">{t("reports_subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("analysis")}</CardTitle>
          <CardDescription>{t("analysis_desc")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {PERIOD_IDS.map((id) => (
              <Button key={id} variant={period === id ? "default" : "outline"} size="sm" onClick={() => setPeriod(id)}>
                {t(id)}
              </Button>
            ))}
          </div>
          {analysis && (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {analysis.summary.map((r) => (
                  <div key={r.label} className="rounded-lg border p-4">
                    <p className="text-xs text-muted-foreground uppercase tracking-wide">{r.label}</p>
                    <p className="text-xl font-semibold mt-1">{r.label.includes("profit") || r.label.includes("income") ? formatCurrency(Number(r.value), currency) : r.value}</p>
                  </div>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" disabled={!!exporting} onClick={() => exportExcel(`${period} analysis`, `${period}_analysis`, periodRows)}>
                  <FileSpreadsheet className="h-3 w-3 mr-1" /> {exporting === `${period}_analysis-excel` ? t("saving") : t("download_excel")}
                </Button>
                <Button size="sm" variant="outline" disabled={!!exporting} onClick={() => exportPdfReport(`${period} Analysis`, periodRows)}>
                  <FileText className="h-3 w-3 mr-1" /> {exporting === `${period} Analysis-pdf` ? t("saving") : t("download_pdf")}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("inventory_overview")}</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_excel")} onClick={() => exportExcel(t("inventory_overview"), "inventory_report.csv", [[t("metric"), t("value")], ...inventory.map((r) => [r.label, r.value])])}>
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_pdf")} onClick={() => exportPdfReport(t("inventory_overview"), [[t("metric"), t("value")], ...inventory.map((r) => [r.label, r.value])])}>
                <FileText className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {inventory.map((r) => (
              <div key={r.label} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <CardTitle>{t("expiry_overview")}</CardTitle>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_excel")} onClick={() => exportExcel(t("expiry_overview"), "expiry_report.csv", [[t("metric"), t("value")], ...expiry.map((r) => [r.label, r.value])])}>
                <FileSpreadsheet className="h-3 w-3" />
              </Button>
              <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_pdf")} onClick={() => exportPdfReport(t("expiry_overview"), [[t("metric"), t("value")], ...expiry.map((r) => [r.label, r.value])])}>
                <FileText className="h-3 w-3" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {expiry.map((r) => (
              <div key={r.label} className="flex justify-between py-2 border-b last:border-0 text-sm">
                <span className="text-muted-foreground">{r.label}</span>
                <span className="font-medium">{r.value}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("profit_by_batch")}</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={!!exporting || profit.length === 0} title={t("download_excel")} onClick={() => exportExcel(t("profit_by_batch"), "profit_report.csv", profitRows)}>
              <FileSpreadsheet className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" disabled={!!exporting || profit.length === 0} title={t("download_pdf")} onClick={() => exportPdfReport(t("profit_by_batch"), profitRows)}>
              <FileText className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("medicine")}</TableHead>
                <TableHead>{t("batch")}</TableHead>
                <TableHead>{t("qty")}</TableHead>
                <TableHead>{t("expected_profit_col")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {profit.slice(0, 50).map((p, i) => (
                <TableRow key={i}>
                  <TableCell>{p.medicine_name}</TableCell>
                  <TableCell>{p.batch_number}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{formatCurrency(p.expected_profit, currency)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <CardTitle>{t("stock_movement")}</CardTitle>
          <div className="flex gap-1">
            <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_excel")} onClick={() => exportExcel(t("stock_movement"), "stock_movement_report.csv", [[t("type"), t("records"), t("value")], ...movement.map((r) => [txLabel(language, r.label), r.value, r.extra || ""])])}>
              <FileSpreadsheet className="h-3 w-3" />
            </Button>
            <Button size="sm" variant="outline" disabled={!!exporting} title={t("download_pdf")} onClick={() => exportPdfReport(t("stock_movement"), [[t("type"), t("records"), t("value")], ...movement.map((r) => [txLabel(language, r.label), r.value, r.extra || ""])])}>
              <FileText className="h-3 w-3" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {movement.map((r) => (
            <div key={r.label} className="flex justify-between py-2 border-b last:border-0 text-sm">
              <span className="text-muted-foreground">{txLabel(language, r.label)}</span>
              <span className="font-medium">{r.value} {t("records").toLowerCase()}{r.extra ? ` · ${r.extra}` : ""}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
