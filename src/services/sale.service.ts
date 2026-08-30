import { queryAll, queryOne, execute, getNextNumber, executeMany } from '@/lib/sql';
import { calcTax } from '@/lib/utils';
import { getInventoryValue, getLowStockProducts } from '@/services/product.service';
import type { Sale, SaleLine, CartItem, DashboardStats } from '@/db/types';
import { v4 as uuid } from 'uuid';

export function getOrganization() {
  return queryOne<{ id: string; name: string; currency_code: string; tax_rate: number }>(
    'SELECT * FROM organization LIMIT 1'
  );
}

export function completeSale(
  items: CartItem[],
  cashierId: string,
  customerId: string | null,
  payments: { methodId: string; amount: number }[],
  discountAmount = 0
): Sale {
  const org = getOrganization();
  const taxRate = org?.tax_rate ?? 18;
  const now = new Date().toISOString();
  const saleId = uuid();
  const saleNumber = getNextNumber('SALE', 'sales', 'sale_number');

  const subtotal = items.reduce((sum, i) => sum + i.product.selling_price * i.quantity - i.discount, 0);
  const taxable = subtotal - discountAmount;
  const taxAmount = calcTax(taxable, taxRate);
  const total = taxable + taxAmount;
  const amountPaid = payments.reduce((s, p) => s + p.amount, 0);

  const statements: { sql: string; params?: unknown[] }[] = [];

  statements.push({
    sql: `INSERT INTO sales (id, sale_number, customer_id, cashier_id, sale_date, status, subtotal, discount_amount, tax_amount, total, amount_paid, change_amount, created_at)
          VALUES (?, ?, ?, ?, ?, 'completed', ?, ?, ?, ?, ?, ?, ?)`,
    params: [saleId, saleNumber, customerId, cashierId, now, subtotal, discountAmount, taxAmount, total, amountPaid, Math.max(0, amountPaid - total), now],
  });

  for (const item of items) {
    const lineId = uuid();
    const lineTotal = item.product.selling_price * item.quantity - item.discount;
    const lineTax = calcTax(lineTotal, taxRate);

    statements.push({
      sql: `INSERT INTO sale_lines (id, sale_id, product_id, product_name, product_sku, quantity, unit_price, cost_price, discount_amount, tax_amount, line_total)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      params: [lineId, saleId, item.product.id, item.product.name, item.product.sku, item.quantity, item.product.selling_price, item.product.cost_price, item.discount, lineTax, lineTotal + lineTax],
    });

    statements.push({
      sql: 'UPDATE stock_levels SET quantity_on_hand = quantity_on_hand - ?, updated_at = ? WHERE product_id = ?',
      params: [item.quantity, now, item.product.id],
    });

    statements.push({
      sql: `INSERT INTO stock_movements (id, product_id, movement_type, quantity, unit_cost, reference_type, reference_id, user_id, created_at)
            VALUES (?, ?, 'sale', ?, ?, 'sale', ?, ?, ?)`,
      params: [uuid(), item.product.id, -item.quantity, item.product.cost_price, saleId, cashierId, now],
    });
  }

  for (const payment of payments) {
    statements.push({
      sql: 'INSERT INTO sale_payments (id, sale_id, payment_method_id, amount, created_at) VALUES (?, ?, ?, ?, ?)',
      params: [uuid(), saleId, payment.methodId, payment.amount, now],
    });
  }

  executeMany(statements);
  return getSaleById(saleId)!;
}

export function getSaleById(id: string): Sale | null {
  const sale = queryOne<Sale>(
    `SELECT s.*, u.full_name as cashier_name, c.first_name || ' ' || COALESCE(c.last_name, '') as customer_name
     FROM sales s
     JOIN users u ON s.cashier_id = u.id
     LEFT JOIN customers c ON s.customer_id = c.id
     WHERE s.id = ?`,
    [id]
  );
  if (!sale) return null;
  sale.lines = queryAll<SaleLine>('SELECT * FROM sale_lines WHERE sale_id = ?', [id]);
  return sale;
}

export function getRecentSales(limit = 10): Sale[] {
  return queryAll<Sale>(
    `SELECT s.*, u.full_name as cashier_name FROM sales s
     JOIN users u ON s.cashier_id = u.id
     ORDER BY s.created_at DESC LIMIT ?`,
    [limit]
  );
}

export function getDashboardStats(): DashboardStats {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 7) + '-01';

  const todaySales = queryOne<{ total: number; count: number }>(
    `SELECT COALESCE(SUM(total), 0) as total, COUNT(*) as count FROM sales WHERE sale_date LIKE ? AND status = 'completed'`,
    [`${today}%`]
  );

  const monthlyRevenue = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(total), 0) as total FROM sales WHERE sale_date >= ? AND status = 'completed'`,
    [monthStart]
  );

  const cogs = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(sl.cost_price * sl.quantity), 0) as total
     FROM sale_lines sl JOIN sales s ON sl.sale_id = s.id
     WHERE s.sale_date >= ? AND s.status = 'completed'`,
    [monthStart]
  );

  const expenses = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(amount), 0) as total FROM expenses WHERE expense_date >= ?',
    [monthStart]
  );

  return {
    todaySales: todaySales?.total ?? 0,
    monthlyRevenue: monthlyRevenue?.total ?? 0,
    profit: (monthlyRevenue?.total ?? 0) - (cogs?.total ?? 0) - (expenses?.total ?? 0),
    expenses: expenses?.total ?? 0,
    inventoryValue: getInventoryValue(),
    lowStockCount: getLowStockProducts().length,
    todayTransactions: todaySales?.count ?? 0,
  };
}

export function getTopProducts(limit = 5) {
  return queryAll<{ name: string; total_qty: number; total_revenue: number }>(
    `SELECT sl.product_name as name, SUM(sl.quantity) as total_qty, SUM(sl.line_total) as total_revenue
     FROM sale_lines sl JOIN sales s ON sl.sale_id = s.id
     WHERE s.status = 'completed'
     GROUP BY sl.product_id ORDER BY total_qty DESC LIMIT ?`,
    [limit]
  );
}

export function getPaymentMethods() {
  return queryAll<{ id: string; name: string; type: string }>(
    'SELECT * FROM payment_methods WHERE is_active = 1 ORDER BY sort_order'
  );
}

export function getSalesReport(from: string, to: string) {
  return queryAll<Sale>(
    `SELECT s.*, u.full_name as cashier_name FROM sales s
     JOIN users u ON s.cashier_id = u.id
     WHERE s.sale_date >= ? AND s.sale_date <= ? AND s.status = 'completed'
     ORDER BY s.sale_date DESC`,
    [from, to + 'T23:59:59']
  );
}
