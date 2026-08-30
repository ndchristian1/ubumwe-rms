import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { formatCurrency } from '@/lib/utils';
import { getProducts, getCategories, getBrands, getUnits, createProduct, updateProduct } from '@/services/product.service';
import { Plus, Search } from 'lucide-react';
import type { Product } from '@/db/types';

export function ProductsPage() {
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [refresh, setRefresh] = useState(0);

  const products = useMemo(() => getProducts(search), [search, refresh]);
  const categories = useMemo(() => getCategories(), []);
  const brands = useMemo(() => getBrands(), []);
  const units = useMemo(() => getUnits(), []);

  const [form, setForm] = useState({
    name: '', sku: '', category_id: '', brand_id: '', unit_id: units[0]?.id ?? '',
    cost_price: 0, selling_price: 0, min_stock: 10, barcode: '',
  });

  const openCreate = () => {
    setEditProduct(null);
    setForm({ name: '', sku: '', category_id: '', brand_id: '', unit_id: units[0]?.id ?? '', cost_price: 0, selling_price: 0, min_stock: 10, barcode: '' });
    setShowForm(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({
      name: p.name, sku: p.sku, category_id: p.category_id ?? '', brand_id: p.brand_id ?? '',
      unit_id: p.unit_id, cost_price: p.cost_price, selling_price: p.selling_price,
      min_stock: p.min_stock, barcode: p.barcode ?? '',
    });
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.name || !form.unit_id) return;
    if (editProduct) {
      updateProduct(editProduct.id, form as Partial<Product>);
    } else {
      createProduct(form as Partial<Product>);
    }
    setShowForm(false);
    setRefresh((r) => r + 1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Products</h2>
          <p className="text-slate-400">{products.length} active products</p>
        </div>
        <Button onClick={openCreate}><Plus size={18} className="mr-2 inline" />Add Product</Button>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <Input placeholder="Search by name, SKU, or barcode..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
      </div>

      <Card>
        <CardBody className="p-0">
          <DataTable
            data={products as unknown as Record<string, unknown>[]}
            onRowClick={(r) => openEdit(r as unknown as Product)}
            columns={[
              { key: 'sku', header: 'SKU', className: 'font-mono text-xs' },
              { key: 'name', header: 'Product' },
              { key: 'category_name', header: 'Category' },
              { key: 'cost_price', header: 'Cost', render: (r) => formatCurrency(r.cost_price as number) },
              { key: 'selling_price', header: 'Price', render: (r) => formatCurrency(r.selling_price as number) },
              { key: 'profit_margin', header: 'Margin', render: (r) => `${(r.profit_margin as number)?.toFixed(1)}%` },
              { key: 'quantity_on_hand', header: 'Stock', render: (r) => {
                const stock = r.quantity_on_hand as number;
                const min = r.min_stock as number;
                return <span className={stock <= min ? 'text-amber-400' : ''}>{stock}</span>;
              }},
              { key: 'barcode', header: 'Barcode', className: 'font-mono text-xs' },
            ]}
          />
        </CardBody>
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-full max-w-lg">
            <CardHeader title={editProduct ? 'Edit Product' : 'New Product'} />
            <CardBody className="space-y-4">
              <Input placeholder="Product name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <div className="grid grid-cols-2 gap-4">
                <Input placeholder="SKU (auto if empty)" value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
                <Input placeholder="Barcode" value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                  <option value="">Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <select value={form.brand_id} onChange={(e) => setForm({ ...form, brand_id: e.target.value })} className="rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                  <option value="">Brand</option>
                  {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <select value={form.unit_id} onChange={(e) => setForm({ ...form, unit_id: e.target.value })} className="w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-2 text-sm">
                {units.map((u) => <option key={u.id} value={u.id}>{u.name} ({u.abbreviation})</option>)}
              </select>
              <div className="grid grid-cols-3 gap-4">
                <Input type="number" placeholder="Cost price" value={form.cost_price || ''} onChange={(e) => setForm({ ...form, cost_price: Number(e.target.value) })} />
                <Input type="number" placeholder="Selling price" value={form.selling_price || ''} onChange={(e) => setForm({ ...form, selling_price: Number(e.target.value) })} />
                <Input type="number" placeholder="Min stock" value={form.min_stock || ''} onChange={(e) => setForm({ ...form, min_stock: Number(e.target.value) })} />
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowForm(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handleSave}>Save Product</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
