export type Role = 'admin' | 'manager' | 'cashier';

export interface User {
  id: string;
  username: string;
  email: string | null;
  full_name: string;
  role: Role;
  is_active: number;
  last_login_at: string | null;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  category_id: string | null;
  category_name?: string;
  brand_id: string | null;
  brand_name?: string;
  supplier_id: string | null;
  unit_id: string;
  unit_abbr?: string;
  cost_price: number;
  selling_price: number;
  min_stock: number;
  max_stock: number | null;
  barcode: string | null;
  status: string;
  quantity_on_hand?: number;
  profit_margin?: number;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  parent_name?: string;
  description: string | null;
  sort_order: number;
  is_active: number;
  product_count?: number;
}

export interface Brand {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: number;
}

export interface Supplier {
  id: string;
  name: string;
  code: string;
  contact_person: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  balance: number;
  is_active: number;
}

export interface Customer {
  id: string;
  code: string;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  loyalty_points: number;
  balance: number;
  is_active: number;
}

export interface CartItem {
  product: Product;
  quantity: number;
  discount: number;
}

export interface Sale {
  id: string;
  sale_number: string;
  customer_id: string | null;
  customer_name?: string;
  cashier_id: string;
  cashier_name?: string;
  sale_date: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total: number;
  amount_paid: number;
  change_amount: number;
  lines?: SaleLine[];
}

export interface SaleLine {
  id: string;
  sale_id: string;
  product_id: string;
  product_name: string;
  product_sku: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  discount_amount: number;
  tax_amount: number;
  line_total: number;
}

export interface DashboardStats {
  todaySales: number;
  monthlyRevenue: number;
  profit: number;
  expenses: number;
  inventoryValue: number;
  lowStockCount: number;
  todayTransactions: number;
}

export interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: number;
  created_at: string;
}

export interface Expense {
  id: string;
  expense_number: string;
  category: string;
  amount: number;
  expense_date: string;
  description: string | null;
}

export interface Purchase {
  id: string;
  purchase_number: string;
  supplier_id: string;
  supplier_name?: string;
  purchase_date: string;
  status: string;
  subtotal: number;
  total: number;
  amount_paid: number;
}

export interface Organization {
  id: string;
  name: string;
  currency_code: string;
  tax_rate: number;
  address: string | null;
  phone: string | null;
  email: string | null;
}
