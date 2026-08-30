import { useMemo } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { getCustomers, getSuppliers } from '@/services/admin.service';

export function CustomersPage() {
  const customers = useMemo(() => getCustomers(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Customers</h2>
      <Card><CardBody className="p-0">
        <DataTable data={customers as unknown as Record<string, unknown>[]} columns={[
          { key: 'code', header: 'Code', className: 'font-mono text-xs' },
          { key: 'first_name', header: 'First Name' },
          { key: 'last_name', header: 'Last Name' },
          { key: 'phone', header: 'Phone' },
          { key: 'loyalty_points', header: 'Points' },
          { key: 'balance', header: 'Balance', render: (r) => formatCurrency(r.balance as number) },
        ]} />
      </CardBody></Card>
    </div>
  );
}

export function SuppliersPage() {
  const suppliers = useMemo(() => getSuppliers(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Suppliers</h2>
      <Card><CardBody className="p-0">
        <DataTable data={suppliers as unknown as Record<string, unknown>[]} columns={[
          { key: 'code', header: 'Code', className: 'font-mono text-xs' },
          { key: 'name', header: 'Supplier' },
          { key: 'contact_person', header: 'Contact' },
          { key: 'phone', header: 'Phone' },
          { key: 'balance', header: 'Balance', render: (r) => formatCurrency(r.balance as number) },
        ]} />
      </CardBody></Card>
    </div>
  );
}
