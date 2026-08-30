import { useState, useEffect, useRef, useMemo } from 'react';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card, CardBody } from '@/components/ui/Card';
import { formatCurrency } from '@/lib/utils';
import { getProducts, getProductByBarcode } from '@/services/product.service';
import { completeSale, getOrganization, getPaymentMethods } from '@/services/sale.service';
import { getCustomers } from '@/services/admin.service';
import { usePosStore, getCartTotals } from '@/stores/pos.store';
import { useAuthStore } from '@/stores/auth.store';
import { Minus, Plus, Trash2, CreditCard, Banknote } from 'lucide-react';
import type { Product } from '@/db/types';

export function PosPage() {
  const [search, setSearch] = useState('');
  const [products, setProducts] = useState<Product[]>([]);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [amountPaid, setAmountPaid] = useState('');
  const [receipt, setReceipt] = useState<string | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const { cart, addItem, removeItem, updateQty, clearCart, customerId, setCustomer, discountAmount, setDiscount } = usePosStore();
  const { user } = useAuthStore();

  const org = useMemo(() => getOrganization(), []);
  const paymentMethods = useMemo(() => getPaymentMethods(), []);
  const customers = useMemo(() => getCustomers(), []);
  const { subtotal, taxAmount, total } = getCartTotals(cart, discountAmount, org?.tax_rate ?? 18);

  useEffect(() => {
    setProducts(getProducts(search));
  }, [search]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'F1') { e.preventDefault(); searchRef.current?.focus(); }
      if (e.key === 'F12' && cart.length > 0) { e.preventDefault(); setShowPayment(true); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [cart.length]);

  const handleSearch = (value: string) => {
    setSearch(value);
    if (value.length >= 8) {
      const byBarcode = getProductByBarcode(value);
      if (byBarcode) { addItem(byBarcode); setSearch(''); }
    }
  };

  const handlePay = () => {
    if (!user || !paymentMethod) return;
    const paid = parseFloat(amountPaid) || total;
    if (paid < total) return;

    const sale = completeSale(
      cart, user.id, customerId,
      [{ methodId: paymentMethod, amount: total }],
      discountAmount
    );

    setReceipt(`Sale ${sale.sale_number} completed!\nTotal: ${formatCurrency(sale.total)}\nChange: ${formatCurrency(sale.change_amount)}`);
    clearCart();
    setShowPayment(false);
    setAmountPaid('');
    setTimeout(() => setReceipt(null), 4000);
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] gap-4">
      <div className="flex flex-1 flex-col">
        <div className="mb-4">
          <Input
            ref={searchRef}
            placeholder="Search product or scan barcode... (F1)"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="text-lg"
          />
        </div>

        <div className="grid flex-1 grid-cols-2 gap-2 overflow-y-auto lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <button
              key={p.id}
              onClick={() => addItem(p)}
              className="rounded-xl border border-slate-700 bg-slate-900 p-4 text-left transition-colors hover:border-brand-500 hover:bg-slate-800"
            >
              <p className="font-medium text-white">{p.name}</p>
              <p className="font-mono text-xs text-slate-500">{p.sku}</p>
              <div className="mt-2 flex items-center justify-between">
                <span className="text-lg font-bold text-brand-500">{formatCurrency(p.selling_price)}</span>
                <span className={`text-xs ${(p.quantity_on_hand ?? 0) <= p.min_stock ? 'text-amber-400' : 'text-slate-400'}`}>
                  Stock: {p.quantity_on_hand ?? 0}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="flex w-96 flex-col">
        <Card className="flex flex-1 flex-col">
          <div className="border-b border-slate-700 px-4 py-3">
            <h3 className="font-semibold">Current Order</h3>
            <select
              value={customerId ?? ''}
              onChange={(e) => setCustomer(e.target.value || null)}
              className="mt-2 w-full rounded-lg border border-slate-600 bg-slate-800 px-3 py-1.5 text-sm"
            >
              <option value="">Walk-in Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.first_name} {c.last_name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {cart.length === 0 ? (
              <p className="py-8 text-center text-slate-500">Cart is empty</p>
            ) : (
              cart.map((item) => (
                <div key={item.product.id} className="mb-2 rounded-lg bg-slate-800 p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">{item.product.name}</p>
                      <p className="text-xs text-slate-400">{formatCurrency(item.product.selling_price)} each</p>
                    </div>
                    <button onClick={() => removeItem(item.product.id)} className="text-slate-500 hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQty(item.product.id, item.quantity - 1)} className="rounded bg-slate-700 p-1"><Minus size={14} /></button>
                      <span className="w-8 text-center font-mono">{item.quantity}</span>
                      <button onClick={() => updateQty(item.product.id, item.quantity + 1)} className="rounded bg-slate-700 p-1"><Plus size={14} /></button>
                    </div>
                    <span className="font-semibold">{formatCurrency(item.product.selling_price * item.quantity)}</span>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="border-t border-slate-700 p-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-slate-400"><span>Subtotal</span><span>{formatCurrency(subtotal)}</span></div>
              <div className="flex justify-between text-slate-400">
                <span>Discount</span>
                <input type="number" value={discountAmount || ''} onChange={(e) => setDiscount(Number(e.target.value))} className="w-20 rounded bg-slate-800 px-2 py-0.5 text-right text-white" placeholder="0" />
              </div>
              <div className="flex justify-between text-slate-400"><span>Tax ({org?.tax_rate}%)</span><span>{formatCurrency(taxAmount)}</span></div>
              <div className="flex justify-between text-xl font-bold text-white"><span>Total</span><span>{formatCurrency(total)}</span></div>
            </div>
            <Button className="mt-4 w-full" size="lg" disabled={cart.length === 0} onClick={() => { setShowPayment(true); setAmountPaid(String(total)); }}>
              Pay (F12)
            </Button>
          </div>
        </Card>

        {receipt && (
          <div className="mt-2 rounded-lg bg-brand-500/20 p-3 text-sm text-brand-500 whitespace-pre-line">{receipt}</div>
        )}
      </div>

      {showPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <Card className="w-96">
            <CardBody>
              <h3 className="mb-4 text-lg font-semibold">Payment — {formatCurrency(total)}</h3>
              <div className="mb-4 grid grid-cols-3 gap-2">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`rounded-lg border p-3 text-center text-sm ${paymentMethod === pm.id ? 'border-brand-500 bg-brand-500/20 text-brand-500' : 'border-slate-600 text-slate-300'}`}
                  >
                    {pm.type === 'cash' ? <Banknote className="mx-auto mb-1" size={20} /> : <CreditCard className="mx-auto mb-1" size={20} />}
                    {pm.name}
                  </button>
                ))}
              </div>
              <Input type="number" placeholder="Amount paid" value={amountPaid} onChange={(e) => setAmountPaid(e.target.value)} className="mb-4" />
              {parseFloat(amountPaid) >= total && (
                <p className="mb-4 text-sm text-slate-400">Change: {formatCurrency(parseFloat(amountPaid) - total)}</p>
              )}
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setShowPayment(false)}>Cancel</Button>
                <Button className="flex-1" onClick={handlePay} disabled={!paymentMethod || parseFloat(amountPaid) < total}>Complete Sale</Button>
              </div>
            </CardBody>
          </Card>
        </div>
      )}
    </div>
  );
}
