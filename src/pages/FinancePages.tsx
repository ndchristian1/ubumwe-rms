import { useState, useMemo } from 'react';
import { Card, CardHeader, CardBody, StatCard } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { formatCurrency } from '@/lib/utils';
import { getExpenses, createExpense, getFinanceSummary } from '@/services/admin.service';
import { getSalesReport } from '@/services/sale.service';
import { useAuthStore } from '@/stores/auth.store';
import { Plus } from 'lucide-react';

export function ExpensesPage() {
  const [refresh, setRefresh] = useState(0);
  const [showForm, setShowForm] = useState(false);
  const [category, setCategory] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { user } = useAuthStore();
  const expenses = useMemo(() => getExpenses(), [refresh]);

  const handleAdd = () => {
    if (!user || !category || !amount) return;
    createExpense(category, parseFloat(amount), description, user.id);
    setShowForm(false);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Expenses</h2>
        <Button onClick={() => setShowForm(true)}><Plus size={18} className="mr-2 inline" />Add Expense</Button>
      </div>
      <Card><CardBody className="p-0">
        <DataTable data={expenses as unknown as Record<string, unknown>[]} columns={[
          { key: 'expense_number', header: 'Ref' },
          { key: 'category', header: 'Category' },
          { key: 'amount', header: 'Amount', render: (r) => formatCurrency(r.amount as number) },
          { key: 'expense_date', header: 'Date' },
          { key: 'description', header: 'Description', render: (r) => (r.description as string) || '—' },
        ]} emptyMessage="No expenses recorded." />
      </CardBody></Card>
      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-96"><CardHeader title="New Expense" /><CardBody className="space-y-4">
            <Input placeholder="Category (e.g. Rent, Utilities)" value={category} onChange={(e) => setCategory(e.target.value)} />
            <Input type="number" placeholder="Amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Input placeholder="Description" value={description} onChange={(e) => setDescription(e.target.value)} />
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
              <Button className="flex-1" onClick={handleAdd}>Save</Button>
            </div>
          </CardBody></Card>
        </div>
      )}
    </div>
  );
}

export function FinancePage() {
  const summary = useMemo(() => getFinanceSummary(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Finance</h2>
      <p className="text-slate-400">Monthly overview</p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="Revenue" value={formatCurrency(summary.revenue)} tone="success" />
        <StatCard label="COGS" value={formatCurrency(summary.cogs)} />
        <StatCard label="Purchases" value={formatCurrency(summary.purchases)} />
        <StatCard label="Expenses" value={formatCurrency(summary.expenses)} tone="warning" />
        <StatCard label="Net Profit" value={formatCurrency(summary.profit)} tone={summary.profit >= 0 ? 'success' : 'danger'} />
      </div>
    </div>
  );
}

export function ReportsPage() {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const today = new Date().toISOString().slice(0, 10);
  const sales = useMemo(() => getSalesReport(monthStart, today), []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reports</h2>
      <p className="text-slate-400">Sales report — current month</p>
      <Card><CardBody className="p-0">
        <DataTable data={sales as unknown as Record<string, unknown>[]} columns={[
          { key: 'sale_number', header: 'Sale #' },
          { key: 'cashier_name', header: 'Cashier' },
          { key: 'sale_date', header: 'Date', render: (r) => new Date(r.sale_date as string).toLocaleDateString() },
          { key: 'subtotal', header: 'Subtotal', render: (r) => formatCurrency(r.subtotal as number) },
          { key: 'tax_amount', header: 'Tax', render: (r) => formatCurrency(r.tax_amount as number) },
          { key: 'total', header: 'Total', render: (r) => formatCurrency(r.total as number) },
        ]} emptyMessage="No sales this month." />
      </CardBody></Card>
    </div>
  );
}
