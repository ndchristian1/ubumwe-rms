import { Database } from 'sql.js';
import { v4 as uuid } from 'uuid';

const now = () => new Date().toISOString();

// Simple hash for demo — production Tauri build uses Argon2id in Rust
function hashPassword(password: string): string {
  return btoa(`ubumwe:${password}`);
}

export function seedDatabase(db: Database): void {
  const orgId = uuid();
  const adminId = uuid();
  const managerId = uuid();
  const cashierId = uuid();

  db.run(
    `INSERT INTO organization (id, name, legal_name, address, phone, email, currency_code, tax_rate)
     VALUES (?, 'UBUMWE Store', 'UBUMWE Retail Ltd', 'Kigali, Rwanda', '+250 788 000 000', 'info@ubumwe.rw', 'RWF', 18)`,
    [orgId]
  );

  db.run(
    `INSERT INTO users (id, username, email, password_hash, full_name, role, created_at) VALUES
     (?, 'admin', 'admin@ubumwe.rw', ?, 'System Administrator', 'admin', ?),
     (?, 'manager', 'manager@ubumwe.rw', ?, 'Store Manager', 'manager', ?),
     (?, 'cashier', 'cashier@ubumwe.rw', ?, 'Jean Uwimana', 'cashier', ?)`,
    [
      adminId, hashPassword('admin123'), now(),
      managerId, hashPassword('manager123'), now(),
      cashierId, hashPassword('cashier123'), now(),
    ]
  );

  const units = [
    [uuid(), 'Piece', 'pc'],
    [uuid(), 'Kilogram', 'kg'],
    [uuid(), 'Liter', 'L'],
    [uuid(), 'Box', 'box'],
  ];
  units.forEach(([id, name, abbr]) => {
    db.run('INSERT INTO units (id, name, abbreviation) VALUES (?, ?, ?)', [id, name, abbr]);
  });
  const unitPc = units[0][0] as string;
  const unitKg = units[1][0] as string;

  const catGrocery = uuid();
  const catDairy = uuid();
  const catBeverages = uuid();
  db.run(
    `INSERT INTO categories (id, name, slug, parent_id, sort_order, created_at) VALUES
     (?, 'Grocery', 'grocery', NULL, 1, ?),
     (?, 'Dairy', 'dairy', ?, 1, ?),
     (?, 'Beverages', 'beverages', NULL, 2, ?)`,
    [catGrocery, now(), catDairy, catGrocery, now(), catBeverages, now()]
  );

  const brandIds = [uuid(), uuid(), uuid()];
  ['UBUMWE Select', 'Fresh Farm', 'Premium'].forEach((name, i) => {
    db.run('INSERT INTO brands (id, name, slug, created_at) VALUES (?, ?, ?, ?)', [
      brandIds[i], name, name.toLowerCase().replace(/\s+/g, '-'), now(),
    ]);
  });

  const supplierId = uuid();
  db.run(
    `INSERT INTO suppliers (id, name, code, contact_person, phone, created_at) VALUES (?, 'Kigali Wholesale Ltd', 'SUP-001', 'Paul N.', '+250 788 111 111', ?)`,
    [supplierId, now()]
  );

  const products = [
    ['RICE-5KG', 'Rice 5kg', catGrocery, brandIds[0], 4500, 6500, 120, '8901234567890'],
    ['OIL-1L', 'Cooking Oil 1L', catGrocery, brandIds[2], 2800, 4200, 85, '8901234567891'],
    ['SUGAR-1KG', 'Sugar 1kg', catGrocery, brandIds[0], 900, 1400, 200, '8901234567892'],
    ['MILK-1L', 'Fresh Milk 1L', catDairy, brandIds[1], 600, 950, 60, '8901234567893'],
    ['BREAD-WHT', 'White Bread', catGrocery, brandIds[1], 500, 800, 40, '8901234567894'],
    ['WATER-500', 'Mineral Water 500ml', catBeverages, brandIds[2], 200, 400, 300, '8901234567895'],
    ['FLOUR-2KG', 'Wheat Flour 2kg', catGrocery, brandIds[0], 1800, 2800, 75, '8901234567896'],
    ['TEA-250G', 'Black Tea 250g', catBeverages, brandIds[0], 2200, 3500, 50, '8901234567897'],
    ['BEANS-1KG', 'Red Beans 1kg', catGrocery, brandIds[1], 1200, 1800, 90, '8901234567898'],
    ['YOGURT', 'Strawberry Yogurt', catDairy, brandIds[1], 400, 700, 35, '8901234567899'],
  ];

  products.forEach(([sku, name, catId, brandId, cost, sell, stock, barcode]) => {
    const id = uuid();
    db.run(
      `INSERT INTO products (id, sku, name, category_id, brand_id, supplier_id, unit_id, cost_price, selling_price, min_stock, barcode, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 10, ?, ?, ?)`,
      [id, sku, name, catId, brandId, supplierId, sku.includes('KG') ? unitKg : unitPc, cost, sell, barcode, now(), now()]
    );
    db.run('INSERT INTO stock_levels (product_id, quantity_on_hand, updated_at) VALUES (?, ?, ?)', [id, stock, now()]);
  });

  const pmCash = uuid();
  const pmCard = uuid();
  const pmMobile = uuid();
  db.run(
    `INSERT INTO payment_methods (id, name, type, sort_order) VALUES
     (?, 'Cash', 'cash', 1),
     (?, 'Card', 'card', 2),
     (?, 'Mobile Money', 'mobile_money', 3)`,
    [pmCash, pmCard, pmMobile]
  );

  db.run(
    `INSERT INTO customers (id, code, first_name, last_name, phone, loyalty_points, created_at) VALUES
     (?, 'CUS-001', 'Alice', 'Mukamana', '+250 788 222 222', 150, ?),
     (?, 'CUS-002', 'Bob', 'Habimana', '+250 788 333 333', 80, ?)`,
    [uuid(), now(), uuid(), now()]
  );

  // Low stock notification
  db.run(
    `INSERT INTO notifications (id, type, title, message, entity_type, created_at) VALUES (?, 'low_stock', 'Low Stock Alert', 'Strawberry Yogurt is below minimum stock level', 'product', ?)`,
    [uuid(), now()]
  );
}

export { hashPassword };
