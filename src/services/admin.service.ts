import { queryAll, queryOne, execute, getNextNumber } from '@/lib/sql';
import type { Customer, Supplier, Expense, Purchase, Notification } from '@/db/types';
import { v4 as uuid } from 'uuid';

export function getCustomers(search = ''): Customer[] {
  let sql = 'SELECT * FROM customers WHERE is_active = 1';
  const params: unknown[] = [];
  if (search) {
    sql += ' AND (first_name LIKE ? OR last_name LIKE ? OR phone LIKE ? OR code LIKE ?)';
    const t = `%${search}%`;
    params.push(t, t, t, t);
  }
  return queryAll<Customer>(sql + ' ORDER BY first_name', params);
}

export function getSuppliers(): Supplier[] {
  return queryAll<Supplier>('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name');
}

export function getExpenses(): Expense[] {
  return queryAll<Expense>('SELECT * FROM expenses ORDER BY expense_date DESC');
}

export function createExpense(category: string, amount: number, description: string, userId: string): void {
  execute(
    'INSERT INTO expenses (id, expense_number, category, amount, expense_date, description, created_by, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uuid(), getNextNumber('EXP', 'expenses', 'expense_number'), category, amount, new Date().toISOString().slice(0, 10), description, userId, new Date().toISOString()]
  );
}

export function getPurchases(): Purchase[] {
  return queryAll<Purchase>(
    `SELECT p.*, s.name as supplier_name FROM purchases p JOIN suppliers s ON p.supplier_id = s.id ORDER BY p.purchase_date DESC`
  );
}

export function getNotifications(): Notification[] {
  return queryAll<Notification>('SELECT * FROM notifications ORDER BY created_at DESC LIMIT 50');
}

export function markNotificationRead(id: string): void {
  execute('UPDATE notifications SET is_read = 1 WHERE id = ?', [id]);
}

export function getFinanceSummary() {
  const monthStart = new Date().toISOString().slice(0, 7) + '-01';
  const sales = queryOne<{ total: number }>('SELECT COALESCE(SUM(total),0) as total FROM sales WHERE sale_date >= ? AND status = "completed"', [monthStart]);
  const purchases = queryOne<{ total: number }>('SELECT COALESCE(SUM(total),0) as total FROM purchases WHERE purchase_date >= ?', [monthStart]);
  const expenses = queryOne<{ total: number }>('SELECT COALESCE(SUM(amount),0) as total FROM expenses WHERE expense_date >= ?', [monthStart]);
  const cogs = queryOne<{ total: number }>(
    `SELECT COALESCE(SUM(sl.cost_price * sl.quantity),0) as total FROM sale_lines sl JOIN sales s ON sl.sale_id = s.id WHERE s.sale_date >= ?`,
    [monthStart]
  );
  return {
    revenue: sales?.total ?? 0,
    purchases: purchases?.total ?? 0,
    expenses: expenses?.total ?? 0,
    cogs: cogs?.total ?? 0,
    profit: (sales?.total ?? 0) - (cogs?.total ?? 0) - (expenses?.total ?? 0),
  };
}

export function backupDatabase(): string {
  const data = localStorage.getItem('ubumwe_rms_db');
  if (!data) return '';
  const filename = `ubumwe-backup-${new Date().toISOString().slice(0, 10)}.json`;
  const blob = new Blob([JSON.stringify({ version: '1.0', date: new Date().toISOString(), data })], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
  return filename;
}

export function restoreDatabase(jsonData: string): boolean {
  try {
    const parsed = JSON.parse(jsonData);
    if (parsed.data) {
      localStorage.setItem('ubumwe_rms_db', parsed.data);
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

export function getAllUsers() {
  return queryAll('SELECT id, username, email, full_name, role, is_active FROM users ORDER BY full_name');
}
