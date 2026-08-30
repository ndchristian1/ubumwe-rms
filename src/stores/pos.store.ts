import { create } from 'zustand';
import type { CartItem, Product } from '@/db/types';

interface PosState {
  cart: CartItem[];
  customerId: string | null;
  discountAmount: number;
  addItem: (product: Product) => void;
  removeItem: (productId: string) => void;
  updateQty: (productId: string, qty: number) => void;
  setCustomer: (id: string | null) => void;
  setDiscount: (amount: number) => void;
  clearCart: () => void;
}

export const usePosStore = create<PosState>((set, get) => ({
  cart: [],
  customerId: null,
  discountAmount: 0,

  addItem: (product) => {
    const { cart } = get();
    const existing = cart.find((c) => c.product.id === product.id);
    if (existing) {
      set({ cart: cart.map((c) => c.product.id === product.id ? { ...c, quantity: c.quantity + 1 } : c) });
    } else {
      set({ cart: [...cart, { product, quantity: 1, discount: 0 }] });
    }
  },

  removeItem: (productId) => set({ cart: get().cart.filter((c) => c.product.id !== productId) }),

  updateQty: (productId, qty) => {
    if (qty <= 0) { get().removeItem(productId); return; }
    set({ cart: get().cart.map((c) => c.product.id === productId ? { ...c, quantity: qty } : c) });
  },

  setCustomer: (id) => set({ customerId: id }),
  setDiscount: (amount) => set({ discountAmount: amount }),
  clearCart: () => set({ cart: [], customerId: null, discountAmount: 0 }),
}));

export function getCartTotals(cart: CartItem[], discountAmount: number, taxRate: number) {
  const subtotal = cart.reduce((s, i) => s + i.product.selling_price * i.quantity - i.discount, 0);
  const taxable = Math.max(0, subtotal - discountAmount);
  const taxAmount = Math.round(taxable * (taxRate / 100));
  const total = taxable + taxAmount;
  return { subtotal, taxAmount, total };
}
