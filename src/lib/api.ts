import { invoke } from "@tauri-apps/api/core";

export interface Pharmacy {
  id: number;
  name: string;
  owner_name: string;
  location?: string;
  currency: string;
  setup_complete: boolean;
}

export interface DashboardStats {
  total_medicines: number;
  total_stock_quantity: number;
  inventory_value: number;
  expected_profit: number;
  expired_count: number;
  expiring_soon_count: number;
  low_stock_count: number;
  currency: string;
}

export interface Medicine {
  id: number;
  name: string;
  category: string;
  description?: string;
  low_stock_threshold: number;
  is_archived: boolean;
  total_quantity: number;
  batch_count: number;
  nearest_expiry?: string;
  created_at: string;
  updated_at: string;
}

export interface Batch {
  id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  supplier_id?: number;
  supplier_name?: string;
  date_added: string;
  days_until_expiry: number;
  expiry_status: string;
  profit_per_unit: number;
  expected_profit: number;
}

export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export interface ExpiryItem {
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  days_until_expiry: number;
  expiry_status: string;
  selling_price: number;
}

export interface InventoryTransaction {
  id: number;
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  transaction_type: string;
  quantity_change: number;
  quantity_before: number;
  quantity_after: number;
  notes?: string;
  created_at: string;
}

export interface BackupInfo {
  id: number;
  filename: string;
  filepath: string;
  file_size: number;
  backup_type: string;
  created_at: string;
}

export interface AppSettings {
  expiry_warning_days: number;
  expiry_monitor_days: number;
  auto_backup_enabled: boolean;
  auto_backup_interval_hours: number;
  has_pin: boolean;
  currency: string;
  language: string;
}

export interface PeriodAnalysis {
  period: string;
  start_date: string;
  end_date: string;
  total_sales: number;
  sales_count: number;
  items_sold: number;
  stock_added: number;
  medicines_added: number;
  profit_from_sales: number;
  summary: ReportRow[];
}

export interface ProfitReportItem {
  medicine_name: string;
  batch_number: string;
  quantity: number;
  purchase_price: number;
  selling_price: number;
  profit_per_unit: number;
  expected_profit: number;
}

export interface ReportRow {
  label: string;
  value: string;
  extra?: string;
}

export interface PosMedicine {
  medicine_id: number;
  medicine_name: string;
  batch_id: number;
  batch_number: string;
  selling_price: number;
  available_stock: number;
  expiry_date: string;
}

export interface CartItemInput {
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface Sale {
  id: number;
  receipt_number: string;
  total_amount: number;
  amount_paid: number;
  change_amount: number;
  created_at: string;
}

export interface SaleItem {
  id: number;
  sale_id: number;
  batch_id: number;
  medicine_id: number;
  medicine_name: string;
  batch_number: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export interface SaleDetail {
  sale: Sale;
  items: SaleItem[];
}

export interface TaxSettings {
  vat_enabled: boolean;
  vat_rate: number;
  prices_include_vat: boolean;
  currency: string;
}

export interface TaxOverview {
  period: string;
  start_date: string;
  end_date: string;
  currency: string;
  vat_enabled: boolean;
  vat_rate: number;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  gross_profit: number;
  estimated_taxable_income: number;
  vat_collected: number;
  vat_paid_on_purchases: number;
  estimated_vat_payable: number;
}

export interface SalesTaxRow {
  sale_id: number;
  date: string;
  receipt_number: string;
  customer: string;
  total_amount: number;
  tax_amount: number;
  net_amount: number;
  payment_method: string;
}

export interface PurchaseTaxRow {
  batch_id: number;
  purchase_date: string;
  supplier_name: string;
  medicine_name: string;
  reference_number: string;
  purchase_amount: number;
  tax_paid: number;
  total_cost: number;
}

export interface Expense {
  id: number;
  category: string;
  amount: number;
  expense_date: string;
  tax_relevant: boolean;
  reference_number?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ProfitTaxSummary {
  period: string;
  start_date: string;
  end_date: string;
  currency: string;
  revenue: number;
  cost_of_goods_sold: number;
  gross_profit: number;
  operating_expenses: number;
  net_profit: number;
  vat_collected: number;
  vat_paid: number;
  estimated_vat_payable: number;
  estimated_taxable_income: number;
}

export const api = {
  getSetupStatus: () => invoke<boolean>("get_setup_status"),
  completeSetup: (input: { name: string; owner_name: string; location?: string; currency: string }) =>
    invoke<Pharmacy>("complete_setup", { input }),
  getPharmacy: () => invoke<Pharmacy>("get_pharmacy"),
  updatePharmacy: (name: string, owner_name: string, location: string | undefined, currency: string) =>
    invoke<Pharmacy>("update_pharmacy", { name, ownerName: owner_name, location, currency }),
  getDashboardStats: () => invoke<DashboardStats>("get_dashboard_stats"),
  listMedicines: (params: { search?: string; category?: string; include_archived?: boolean; low_stock_only?: boolean; page?: number; page_size?: number }) =>
    invoke<Paginated<Medicine>>("list_medicines", { ...params, lowStockOnly: params.low_stock_only }),
  createMedicine: (input: Record<string, unknown>) => invoke<Medicine>("create_medicine", { input }),
  updateMedicine: (input: Record<string, unknown>) => invoke<Medicine>("update_medicine", { input }),
  archiveMedicine: (id: number) => invoke<void>("archive_medicine", { id }),
  deleteMedicine: (id: number, pin: string) => invoke<void>("delete_medicine", { id, pin }),
  listBatches: (medicine_id?: number) => invoke<Batch[]>("list_batches", { medicineId: medicine_id }),
  createBatch: (input: Record<string, unknown>) => invoke<Batch>("create_batch", { input }),
  updateBatch: (input: {
    id: number;
    batch_number: string;
    expiry_date: string;
    purchase_price: number;
    selling_price: number;
    supplier_id?: number;
  }) => invoke<Batch>("update_batch", { input }),
  listTransactions: (params: { medicine_id?: number; page?: number; page_size?: number }) =>
    invoke<Paginated<InventoryTransaction>>("list_transactions", params),
  addStock: (input: { batch_id: number; quantity: number; notes?: string }) =>
    invoke<InventoryTransaction>("add_stock", { input }),
  adjustStock: (input: { batch_id: number; new_quantity: number; notes?: string }) =>
    invoke<InventoryTransaction>("adjust_stock", { input }),
  listExpiryItems: (status_filter?: string) => invoke<ExpiryItem[]>("list_expiry_items", { statusFilter: status_filter }),
  listSuppliers: () => invoke<{ id: number; name: string }[]>("list_suppliers"),
  getSettings: () => invoke<AppSettings>("get_settings"),
  updateSettings: (input: Record<string, unknown>, pin?: string) => invoke<AppSettings>("update_settings", { input, pin }),
  updateLanguage: (language: string) => invoke<void>("update_language", { language }),
  verifyPin: (pin: string) => invoke<boolean>("verify_pin", { pin }),
  setPin: (pin: string, current_pin?: string) => invoke<void>("set_pin", { pin, currentPin: current_pin }),
  createBackup: () => invoke<BackupInfo>("create_backup"),
  listBackups: () => invoke<BackupInfo[]>("list_backups"),
  restoreBackup: (backup_id: number, pin: string) => invoke<void>("restore_backup", { backupId: backup_id, pin }),
  deleteBackup: (backup_id: number, pin: string) => invoke<void>("delete_backup", { backupId: backup_id, pin }),
  inventoryReport: () => invoke<ReportRow[]>("inventory_report"),
  expiryReport: () => invoke<ReportRow[]>("expiry_report"),
  profitReport: () => invoke<ProfitReportItem[]>("profit_report"),
  stockMovementReport: (days?: number) => invoke<ReportRow[]>("stock_movement_report", { days }),
  periodAnalysis: (period: string) => invoke<PeriodAnalysis>("period_analysis", { period }),
  searchPosMedicines: (search?: string, limit?: number) => invoke<PosMedicine[]>("search_pos_medicines", { search, limit }),
  completeSale: (input: { items: CartItemInput[]; total_amount: number; amount_paid: number }) =>
    invoke<SaleDetail>("complete_sale", { input }),
  listSales: (page?: number, page_size?: number) => invoke<Paginated<Sale>>("list_sales", { page, pageSize: page_size }),
  getSale: (sale_id: number) => invoke<SaleDetail>("get_sale", { saleId: sale_id }),
  getTaxSettings: () => invoke<TaxSettings>("get_tax_settings"),
  updateTaxSettings: (input: { vat_enabled: boolean; vat_rate: number; prices_include_vat: boolean }) =>
    invoke<TaxSettings>("update_tax_settings", { input }),
  taxOverview: (period: string, start_date?: string, end_date?: string) =>
    invoke<TaxOverview>("tax_overview", { period, startDate: start_date, endDate: end_date }),
  salesTaxReport: (period: string, start_date?: string, end_date?: string, search?: string) =>
    invoke<SalesTaxRow[]>("sales_tax_report", { period, startDate: start_date, endDate: end_date, search }),
  purchaseTaxReport: (period: string, start_date?: string, end_date?: string, search?: string) =>
    invoke<PurchaseTaxRow[]>("purchase_tax_report", { period, startDate: start_date, endDate: end_date, search }),
  listExpenses: (period?: string, start_date?: string, end_date?: string) =>
    invoke<Expense[]>("list_expenses", { period, startDate: start_date, endDate: end_date }),
  createExpense: (input: {
    category: string;
    amount: number;
    expense_date: string;
    tax_relevant: boolean;
    reference_number?: string;
    notes?: string;
  }) => invoke<Expense>("create_expense", { input }),
  updateExpense: (input: {
    id: number;
    category: string;
    amount: number;
    expense_date: string;
    tax_relevant: boolean;
    reference_number?: string;
    notes?: string;
  }) => invoke<Expense>("update_expense", { input }),
  deleteExpense: (id: number) => invoke<void>("delete_expense", { id }),
  profitTaxSummary: (period: string, start_date?: string, end_date?: string) =>
    invoke<ProfitTaxSummary>("profit_tax_summary", { period, startDate: start_date, endDate: end_date }),
};
