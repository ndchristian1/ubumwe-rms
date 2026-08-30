import { useMemo } from 'react';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { getProducts, getLowStockProducts, getInventoryValue } from '@/services/product.service';
import { queryAll } from '@/lib/sql';
import { getPurchases } from '@/services/admin.service';

export function InventoryPage() {
  const products = useMemo(() => getProducts(), []);
  const lowStock = useMemo(() => getLowStockProducts(), []);
  const value = useMemo(() => getInventoryValue(), []);
  const movements = useMemo(() => queryAll(
    `SELECT sm.*, p.name as product_name, u.full_name as user_name
     FROM stock_movements sm JOIN products p ON sm.product_id = p.id
     LEFT JOIN users u ON sm.user_id = u.id ORDER BY sm.created_at DESC LIMIT 50`
  ), []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Inventory</h2>
      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Total Products" value={String(products.length)} />
        <StatCard label="Inventory Value" value={formatCurrency(value)} tone="success" />
        <StatCard label="Low Stock Items" value={String(lowStock.length)} tone={lowStock.length > 0 ? 'warning' : 'default'} />
      </div>
      <Card>
        <CardHeader title="Stock Levels" />
        <CardBody className="p-0">
          <DataTable data={products as unknown as Record<string, unknown>[]} columns={[
            { key: 'sku', header: 'SKU', className: 'font-mono text-xs' },
            { key: 'name', header: 'Product' },
            { key: 'quantity_on_hand', header: 'On Hand' },
            { key: 'min_stock', header: 'Min' },
            { key: 'cost_price', header: 'Unit Cost', render: (r) => formatCurrency(r.cost_price as number) },
            { key: 'value', header: 'Value', render: (r) => formatCurrency((r.cost_price as number) * (r.quantity_on_hand as number)) },
          ]} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Recent Stock Movements" />
        <CardBody className="p-0">
          <DataTable data={movements as Record<string, unknown>[]} columns={[
            { key: 'created_at', header: 'Date', render: (r) => new Date(r.created_at as string).toLocaleString() },
            { key: 'product_name', header: 'Product' },
            { key: 'movement_type', header: 'Type' },
            { key: 'quantity', header: 'Qty', render: (r) => {
              const q = r.quantity as number;
              return <span className={q < 0 ? 'text-red-400' : 'text-brand-500'}>{q > 0 ? '+' : ''}{q}</span>;
            }},
            { key: 'user_name', header: 'By' },
          ]} emptyMessage="No movements yet." />
        </CardBody>
      </Card>
    </div>
  );
}

export function PurchasesPage() {
  const purchases = useMemo(() => getPurchases(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Purchases</h2>
      <Card><CardBody className="p-0">
        <DataTable data={purchases as unknown as Record<string, unknown>[]} columns={[
          { key: 'purchase_number', header: 'PO #' },
          { key: 'supplier_name', header: 'Supplier' },
          { key: 'purchase_date', header: 'Date' },
          { key: 'status', header: 'Status' },
          { key: 'total', header: 'Total', render: (r) => formatCurrency(r.total as number) },
          { key: 'amount_paid', header: 'Paid', render: (r) => formatCurrency(r.amount_paid as number) },
        ]} emptyMessage="No purchases yet." />
      </CardBody></Card>
    </div>
  );
}
