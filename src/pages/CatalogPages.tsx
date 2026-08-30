import { useMemo } from 'react';
import { Card, CardBody } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { getCategories, getBrands } from '@/services/product.service';

export function CategoriesPage() {
  const categories = useMemo(() => getCategories(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Categories</h2>
      <Card><CardBody className="p-0">
        <DataTable data={categories as unknown as Record<string, unknown>[]} columns={[
          { key: 'name', header: 'Name' },
          { key: 'parent_name', header: 'Parent', render: (r) => (r.parent_name as string) || '—' },
          { key: 'product_count', header: 'Products' },
          { key: 'sort_order', header: 'Order' },
        ]} />
      </CardBody></Card>
    </div>
  );
}

export function BrandsPage() {
  const brands = useMemo(() => getBrands(), []);
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Brands</h2>
      <Card><CardBody className="p-0">
        <DataTable data={brands as unknown as Record<string, unknown>[]} columns={[
          { key: 'name', header: 'Brand' },
          { key: 'slug', header: 'Slug', className: 'font-mono text-xs' },
          { key: 'description', header: 'Description', render: (r) => (r.description as string) || '—' },
        ]} />
      </CardBody></Card>
    </div>
  );
}
