import { queryAll, queryOne, execute, getNextNumber } from '@/lib/sql';
import { calcMargin } from '@/lib/utils';
import type { Product, Category, Brand } from '@/db/types';
import { v4 as uuid } from 'uuid';

export function getProducts(search = '', categoryId = ''): Product[] {
  let sql = `
    SELECT p.*, c.name as category_name, b.name as brand_name, u.abbreviation as unit_abbr,
           s.quantity_on_hand
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    LEFT JOIN brands b ON p.brand_id = b.id
    LEFT JOIN units u ON p.unit_id = u.id
    LEFT JOIN stock_levels s ON p.id = s.product_id
    WHERE p.status = 'active'
  `;
  const params: unknown[] = [];

  if (search) {
    sql += ' AND (p.name LIKE ? OR p.sku LIKE ? OR p.barcode LIKE ?)';
    const term = `%${search}%`;
    params.push(term, term, term);
  }
  if (categoryId) {
    sql += ' AND p.category_id = ?';
    params.push(categoryId);
  }
  sql += ' ORDER BY p.name';

  return queryAll<Product>(sql, params).map((p) => ({
    ...p,
    profit_margin: calcMargin(p.cost_price, p.selling_price),
  }));
}

export function getProductById(id: string): Product | null {
  const p = queryOne<Product>(
    `SELECT p.*, c.name as category_name, b.name as brand_name, u.abbreviation as unit_abbr, s.quantity_on_hand
     FROM products p
     LEFT JOIN categories c ON p.category_id = c.id
     LEFT JOIN brands b ON p.brand_id = b.id
     LEFT JOIN units u ON p.unit_id = u.id
     LEFT JOIN stock_levels s ON p.id = s.product_id
     WHERE p.id = ?`,
    [id]
  );
  return p ? { ...p, profit_margin: calcMargin(p.cost_price, p.selling_price) } : null;
}

export function getProductByBarcode(barcode: string): Product | null {
  const p = queryOne<Product>(
    `SELECT p.*, s.quantity_on_hand FROM products p
     LEFT JOIN stock_levels s ON p.id = s.product_id
     WHERE p.barcode = ? AND p.status = 'active'`,
    [barcode]
  );
  return p ? { ...p, profit_margin: calcMargin(p.cost_price, p.selling_price) } : null;
}

export function createProduct(data: Partial<Product>): Product {
  const id = uuid();
  const now = new Date().toISOString();
  const sku = data.sku || getNextNumber('SKU', 'products', 'sku');

  execute(
    `INSERT INTO products (id, sku, name, description, category_id, brand_id, supplier_id, unit_id,
      cost_price, selling_price, min_stock, max_stock, barcode, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?, ?)`,
    [
      id, sku, data.name, data.description ?? null, data.category_id ?? null,
      data.brand_id ?? null, data.supplier_id ?? null, data.unit_id,
      data.cost_price ?? 0, data.selling_price ?? 0, data.min_stock ?? 0,
      data.max_stock ?? null, data.barcode ?? null, now, now,
    ]
  );
  execute('INSERT INTO stock_levels (product_id, quantity_on_hand, updated_at) VALUES (?, ?, ?)', [id, 0, now]);
  return getProductById(id)!;
}

export function updateProduct(id: string, data: Partial<Product>): void {
  const now = new Date().toISOString();
  execute(
    `UPDATE products SET name=?, description=?, category_id=?, brand_id=?, supplier_id=?,
     cost_price=?, selling_price=?, min_stock=?, max_stock=?, barcode=?, updated_at=?
     WHERE id=?`,
    [
      data.name, data.description ?? null, data.category_id ?? null, data.brand_id ?? null,
      data.supplier_id ?? null, data.cost_price, data.selling_price, data.min_stock,
      data.max_stock ?? null, data.barcode ?? null, now, id,
    ]
  );
}

export function getCategories(): Category[] {
  return queryAll<Category>(
    `SELECT c.*, p.name as parent_name,
      (SELECT COUNT(*) FROM products pr WHERE pr.category_id = c.id) as product_count
     FROM categories c LEFT JOIN categories p ON c.parent_id = p.id
     ORDER BY c.sort_order, c.name`
  );
}

export function getBrands(): Brand[] {
  return queryAll<Brand>('SELECT * FROM brands ORDER BY name');
}

export function getLowStockProducts(): Product[] {
  return queryAll<Product>(
    `SELECT p.*, s.quantity_on_hand FROM products p
     JOIN stock_levels s ON p.id = s.product_id
     WHERE s.quantity_on_hand <= p.min_stock AND p.status = 'active'
     ORDER BY s.quantity_on_hand`
  );
}

export function getInventoryValue(): number {
  const r = queryOne<{ total: number }>(
    'SELECT COALESCE(SUM(p.cost_price * s.quantity_on_hand), 0) as total FROM products p JOIN stock_levels s ON p.id = s.product_id'
  );
  return r?.total ?? 0;
}

export function getUnits() {
  return queryAll<{ id: string; name: string; abbreviation: string }>('SELECT * FROM units ORDER BY name');
}
