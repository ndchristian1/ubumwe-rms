import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const pharmacy = sqliteTable("pharmacy", {
  id: integer("id").primaryKey(),
  name: text("name").notNull(),
  ownerName: text("owner_name").notNull(),
  location: text("location"),
  currency: text("currency").notNull().default("RWF"),
  setupComplete: integer("setup_complete").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const medicines = sqliteTable("medicines", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category").notNull().default("General"),
  description: text("description"),
  lowStockThreshold: integer("low_stock_threshold").notNull().default(10),
  isArchived: integer("is_archived").notNull().default(0),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const batches = sqliteTable("batches", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  medicineId: integer("medicine_id").notNull(),
  batchNumber: text("batch_number").notNull(),
  expiryDate: text("expiry_date").notNull(),
  quantity: integer("quantity").notNull().default(0),
  purchasePrice: real("purchase_price").notNull().default(0),
  sellingPrice: real("selling_price").notNull().default(0),
  supplierId: integer("supplier_id"),
  dateAdded: text("date_added").notNull(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const inventoryTransactions = sqliteTable("inventory_transactions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  batchId: integer("batch_id").notNull(),
  medicineId: integer("medicine_id").notNull(),
  transactionType: text("transaction_type").notNull(),
  quantityChange: integer("quantity_change").notNull(),
  quantityBefore: integer("quantity_before").notNull(),
  quantityAfter: integer("quantity_after").notNull(),
  notes: text("notes"),
  createdAt: text("created_at").notNull(),
});

export const suppliers = sqliteTable("suppliers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  address: text("address"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const activityLogs = sqliteTable("activity_logs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: integer("entity_id"),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

export const backups = sqliteTable("backups", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  filename: text("filename").notNull(),
  filepath: text("filepath").notNull(),
  fileSize: integer("file_size").notNull().default(0),
  backupType: text("backup_type").notNull().default("manual"),
  createdAt: text("created_at").notNull(),
});

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: text("updated_at").notNull(),
});
