import initSqlJs, { Database } from 'sql.js';

let db: Database | null = null;

export async function initDatabase(): Promise<Database> {
  const SQL = await initSqlJs({
    locateFile: (file) => `https://sql.js.org/dist/${file}`,
  });

  const saved = localStorage.getItem('ubumwe_rms_db');
  db = saved ? new SQL.Database(Uint8Array.from(atob(saved), (c) => c.charCodeAt(0))) : new SQL.Database();

  db.run('PRAGMA foreign_keys = ON;');
  runMigrations(db);

  if (!saved) {
    const { seedDatabase } = await import('./seed');
    seedDatabase(db);
    persistDb();
  }

  return db;
}

export function getDb(): Database {
  if (!db) throw new Error('Database not initialized');
  return db;
}

export function persistDb(): void {
  if (!db) return;
  const data = db.export();
  const binary = Array.from(new Uint8Array(data))
    .map((b) => String.fromCharCode(b))
    .join('');
  localStorage.setItem('ubumwe_rms_db', btoa(binary));
}

function runMigrations(database: Database): void {
  database.run(`
    CREATE TABLE IF NOT EXISTS organization (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      legal_name TEXT,
      tax_id TEXT,
      address TEXT,
      phone TEXT,
      email TEXT,
      currency_code TEXT NOT NULL DEFAULT 'RWF',
      timezone TEXT NOT NULL DEFAULT 'Africa/Kigali',
      tax_rate REAL NOT NULL DEFAULT 18
    );

    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT,
      password_hash TEXT NOT NULL,
      pin_hash TEXT,
      full_name TEXT NOT NULL,
      phone TEXT,
      role TEXT NOT NULL DEFAULT 'cashier',
      is_active INTEGER NOT NULL DEFAULT 1,
      last_login_at TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT NOT NULL UNIQUE,
      parent_id TEXT REFERENCES categories(id),
      description TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS brands (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      slug TEXT NOT NULL UNIQUE,
      description TEXT,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS units (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      abbreviation TEXT NOT NULL UNIQUE
    );

    CREATE TABLE IF NOT EXISTS suppliers (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      contact_person TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      code TEXT NOT NULL UNIQUE,
      first_name TEXT NOT NULL,
      last_name TEXT,
      email TEXT,
      phone TEXT,
      address TEXT,
      loyalty_points INTEGER NOT NULL DEFAULT 0,
      balance REAL NOT NULL DEFAULT 0,
      is_active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      sku TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      description TEXT,
      category_id TEXT REFERENCES categories(id),
      brand_id TEXT REFERENCES brands(id),
      supplier_id TEXT REFERENCES suppliers(id),
      unit_id TEXT NOT NULL REFERENCES units(id),
      cost_price REAL NOT NULL DEFAULT 0,
      selling_price REAL NOT NULL DEFAULT 0,
      min_stock REAL NOT NULL DEFAULT 0,
      max_stock REAL,
      track_expiry INTEGER NOT NULL DEFAULT 0,
      barcode TEXT,
      image_path TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_levels (
      product_id TEXT PRIMARY KEY REFERENCES products(id),
      quantity_on_hand REAL NOT NULL DEFAULT 0,
      quantity_reserved REAL NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS stock_movements (
      id TEXT PRIMARY KEY,
      product_id TEXT NOT NULL REFERENCES products(id),
      movement_type TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_cost REAL,
      reference_type TEXT,
      reference_id TEXT,
      notes TEXT,
      user_id TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS payment_methods (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      type TEXT NOT NULL,
      is_active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS sales (
      id TEXT PRIMARY KEY,
      sale_number TEXT NOT NULL UNIQUE,
      customer_id TEXT REFERENCES customers(id),
      cashier_id TEXT NOT NULL REFERENCES users(id),
      sale_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'completed',
      subtotal REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL,
      change_amount REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_lines (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      product_name TEXT NOT NULL,
      product_sku TEXT NOT NULL,
      quantity REAL NOT NULL,
      unit_price REAL NOT NULL,
      cost_price REAL NOT NULL,
      discount_amount REAL NOT NULL DEFAULT 0,
      tax_amount REAL NOT NULL DEFAULT 0,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS sale_payments (
      id TEXT PRIMARY KEY,
      sale_id TEXT NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      payment_method_id TEXT NOT NULL REFERENCES payment_methods(id),
      amount REAL NOT NULL,
      reference_number TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchases (
      id TEXT PRIMARY KEY,
      purchase_number TEXT NOT NULL UNIQUE,
      supplier_id TEXT NOT NULL REFERENCES suppliers(id),
      purchase_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'received',
      subtotal REAL NOT NULL,
      tax_amount REAL NOT NULL DEFAULT 0,
      total REAL NOT NULL,
      amount_paid REAL NOT NULL DEFAULT 0,
      notes TEXT,
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS purchase_lines (
      id TEXT PRIMARY KEY,
      purchase_id TEXT NOT NULL REFERENCES purchases(id) ON DELETE CASCADE,
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity REAL NOT NULL,
      unit_cost REAL NOT NULL,
      line_total REAL NOT NULL
    );

    CREATE TABLE IF NOT EXISTS expenses (
      id TEXT PRIMARY KEY,
      expense_number TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL,
      amount REAL NOT NULL,
      expense_date TEXT NOT NULL,
      description TEXT,
      payment_method_id TEXT REFERENCES payment_methods(id),
      created_by TEXT NOT NULL REFERENCES users(id),
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      user_id TEXT,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id TEXT,
      details TEXT,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      entity_type TEXT,
      entity_id TEXT,
      is_read INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_products_category ON products(category_id);
    CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
    CREATE INDEX IF NOT EXISTS idx_sales_date ON sales(sale_date);
    CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON stock_movements(product_id);
  `);
}
