import { useMemo } from 'react';
import { StatCard, Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { getDashboardStats, getRecentSales, getTopProducts } from '@/services/sale.service';
import { getLowStockProducts } from '@/services/product.service';
import { TrendingUp, AlertTriangle } from 'lucide-react';

export function DashboardPage() {
  const stats = useMemo(() => getDashboardStats(), []);
  const recentSales = useMemo(() => getRecentSales(8), []);
  const topProducts = useMemo(() => getTopProducts(5), []);
  const lowStock = useMemo(() => getLowStockProducts(), []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Dashboard</h2>
        <p className="text-slate-400">Live business analytics</p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard label="Today's Sales" value={formatCurrency(stats.todaySales)} tone="success" />
        <StatCard label="Monthly Revenue" value={formatCurrency(stats.monthlyRevenue)} />
        <StatCard label="Profit" value={formatCurrency(stats.profit)} tone={stats.profit >= 0 ? 'success' : 'danger'} />
        <StatCard label="Expenses" value={formatCurrency(stats.expenses)} tone="warning" />
        <StatCard label="Inventory Value" value={formatCurrency(stats.inventoryValue)} />
        <StatCard label="Low Stock" value={String(stats.lowStockCount)} tone={stats.lowStockCount > 0 ? 'warning' : 'default'} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Recent Sales" subtitle="Latest transactions" />
          <CardBody className="p-0">
            <DataTable
              data={recentSales as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'sale_number', header: 'Sale #' },
                { key: 'cashier_name', header: 'Cashier' },
                { key: 'total', header: 'Total', render: (r) => formatCurrency(r.total as number) },
                { key: 'created_at', header: 'Date', render: (r) => formatDateTime(r.created_at as string) },
              ]}
              emptyMessage="No sales yet. Complete a sale in POS."
            />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Top Products" subtitle="Best sellers" />
          <CardBody className="p-0">
            <DataTable
              data={topProducts as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'name', header: 'Product' },
                { key: 'total_qty', header: 'Qty Sold' },
                { key: 'total_revenue', header: 'Revenue', render: (r) => formatCurrency(r.total_revenue as number) },
              ]}
              emptyMessage="No sales data yet."
            />
          </CardBody>
        </Card>
      </div>

      {lowStock.length > 0 && (
        <Card>
          <CardHeader
            title="Low Stock Alerts"
            subtitle={`${lowStock.length} products need restocking`}
            action={<AlertTriangle className="text-amber-400" size={20} />}
          />
          <CardBody className="p-0">
            <DataTable
              data={lowStock as unknown as Record<string, unknown>[]}
              columns={[
                { key: 'sku', header: 'SKU', className: 'font-mono text-xs' },
                { key: 'name', header: 'Product' },
                { key: 'quantity_on_hand', header: 'Stock', render: (r) => <span className="text-amber-400">{String(r.quantity_on_hand)}</span> },
                { key: 'min_stock', header: 'Min Stock' },
              ]}
            />
          </CardBody>
        </Card>
      )}

      <div className="flex items-center gap-2 rounded-lg border border-brand-500/30 bg-brand-500/10 p-4 text-sm text-brand-500">
        <TrendingUp size={18} />
        <span>Press <kbd className="rounded bg-slate-800 px-1.5 py-0.5 font-mono text-xs">F1</kbd> to open Point of Sale</span>
      </div>
    </div>
  );
}
