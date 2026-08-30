import { useEffect, useState, useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, Package, Pill, TrendingUp, Wallet, CheckCircle2, ChevronRight } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useApp } from "@/context/AppContext";
import { api, type DashboardStats } from "@/lib/api";
import { formatCompactNumber, formatCurrency } from "@/lib/utils";

function StatCard({ title, value, icon: Icon, alert }: { title: string; value: string; icon: React.ElementType; alert?: boolean }) {
  return (
    <Card className={alert ? "border-orange-300 bg-orange-50/50 dark:border-orange-700 dark:bg-orange-950/30" : ""}>
      <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
        <CardTitle className="text-sm font-medium text-muted-foreground truncate pr-2">{title}</CardTitle>
        <Icon className={`h-4 w-4 shrink-0 ${alert ? "text-orange-600" : "text-primary"}`} />
      </CardHeader>
      <CardContent className="min-w-0">
        <div className={`font-bold truncate ${alert ? "text-orange-700 dark:text-orange-300" : ""}`} style={{ fontSize: value.length > 12 ? "1rem" : "1.5rem" }} title={value}>{value}</div>
      </CardContent>
    </Card>
  );
}

export function DashboardPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { t, refreshAlerts, pharmacy } = useApp();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    api.getDashboardStats().then(setStats).finally(() => { setLoading(false); refreshAlerts(); });
  }, [refreshAlerts]);

  useEffect(() => { load(); }, [load, location.key]);

  if (loading || !stats) {
    return <div className="flex h-64 items-center justify-center text-muted-foreground">{t("loading")}</div>;
  }

  const alerts = [
    { key: "expired", count: stats.expired_count, label: t("expired"), path: "/expiry?filter=expired", color: "text-red-700 dark:text-red-300" },
    { key: "expiring", count: stats.expiring_soon_count, label: t("expiring_soon"), path: "/expiry?filter=expiring_soon", color: "text-orange-700 dark:text-orange-300" },
    { key: "low", count: stats.low_stock_count, label: t("low_stock"), path: "/products?low_stock=1", color: "text-yellow-700 dark:text-yellow-300" },
  ].filter((a) => a.count > 0);

  const alertData = [
    { name: t("expired"), value: stats.expired_count, color: "#ef4444" },
    { name: t("expiring_soon"), value: stats.expiring_soon_count, color: "#f97316" },
    { name: t("low_stock"), value: stats.low_stock_count, color: "#eab308" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold truncate">{pharmacy?.name || t("dashboard")}</h1>
        <p className="text-muted-foreground">
          {pharmacy?.name ? t("dashboard_subtitle") : t("dashboard")}
          {pharmacy?.owner_name ? ` · ${pharmacy.owner_name}` : ""}
          {pharmacy?.location ? ` · ${pharmacy.location}` : ""}
        </p>
      </div>

      {alerts.length > 0 ? (
        <Card className="border-orange-200 bg-orange-50/80 dark:border-orange-800 dark:bg-orange-950/40">
          <CardContent className="pt-6">
            <p className="font-semibold text-orange-900 dark:text-orange-100 mb-3 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {t("important_alerts")}
            </p>
            <div className="space-y-2">
              {alerts.map((a) => (
                <button
                  key={a.key}
                  type="button"
                  onClick={() => navigate(a.path)}
                  className="flex w-full items-center justify-between rounded-lg border bg-white/80 dark:bg-background px-4 py-3 text-left hover:bg-accent transition-colors"
                >
                  <span className={`font-medium ${a.color}`}>{a.count} {a.label}</span>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">{t("tap_to_view")} <ChevronRight className="h-4 w-4" /></span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/40">
          <CardContent className="flex items-center gap-3 pt-6">
            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
            <div>
              <p className="font-semibold text-green-900 dark:text-green-100">{t("all_clear")}</p>
              <p className="text-sm text-green-800 dark:text-green-200">
                {stats.total_medicines === 0 ? t("add_first_medicine") : t("no_alerts")}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title={t("total_medicines")} value={formatCompactNumber(stats.total_medicines)} icon={Pill} />
        <StatCard title={t("total_stock")} value={formatCompactNumber(stats.total_stock_quantity)} icon={Package} />
        <StatCard title={t("inventory_value")} value={formatCurrency(stats.inventory_value, stats.currency)} icon={Wallet} />
        <StatCard title={t("expected_profit")} value={formatCurrency(stats.expected_profit, stats.currency)} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader><CardTitle>{t("alert_summary")}</CardTitle></CardHeader>
        <CardContent className="h-64">
          {alertData.every((d) => d.value === 0) ? (
            <div className="flex h-full flex-col items-center justify-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 mb-3 text-green-500" />
              <p className="font-medium">{t("all_clear")}</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={alertData}>
                <XAxis dataKey="name" /><YAxis allowDecimals={false} /><Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {alertData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
