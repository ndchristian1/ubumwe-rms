use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Pharmacy {
    pub id: i64,
    pub name: String,
    pub owner_name: String,
    pub location: Option<String>,
    pub currency: String,
    pub setup_complete: bool,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SetupInput {
    pub name: String,
    pub owner_name: String,
    pub location: Option<String>,
    pub currency: String,
}
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DashboardStats {
    pub total_medicines: i64,
    pub total_stock_quantity: i64,
    pub inventory_value: f64,
    pub expected_profit: f64,
    pub expired_count: i64,
    pub expiring_soon_count: i64,
    pub low_stock_count: i64,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Medicine {
    pub id: i64,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub low_stock_threshold: i64,
    pub is_archived: bool,
    pub total_quantity: i64,
    pub batch_count: i64,
    pub nearest_expiry: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Batch {
    pub id: i64,
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_number: String,
    pub expiry_date: String,
    pub quantity: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub supplier_id: Option<i64>,
    pub supplier_name: Option<String>,
    pub date_added: String,
    pub days_until_expiry: i64,
    pub expiry_status: String,
    pub profit_per_unit: f64,
    pub expected_profit: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateMedicineInput {
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub low_stock_threshold: i64,
    pub batch_number: String,
    pub expiry_date: String,
    pub quantity: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub supplier_id: Option<i64>,
    pub supplier_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateMedicineInput {
    pub id: i64,
    pub name: String,
    pub category: String,
    pub description: Option<String>,
    pub low_stock_threshold: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateBatchInput {
    pub medicine_id: i64,
    pub batch_number: String,
    pub expiry_date: String,
    pub quantity: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub supplier_id: Option<i64>,
    pub supplier_name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateBatchInput {
    pub id: i64,
    pub batch_number: String,
    pub expiry_date: String,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub supplier_id: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct InventoryTransaction {
    pub id: i64,
    pub batch_id: i64,
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_number: String,
    pub transaction_type: String,
    pub quantity_change: i64,
    pub quantity_before: i64,
    pub quantity_after: i64,
    pub notes: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockInput {
    pub batch_id: i64,
    pub quantity: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AdjustStockInput {
    pub batch_id: i64,
    pub new_quantity: i64,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Supplier {
    pub id: i64,
    pub name: String,
    pub phone: Option<String>,
    pub email: Option<String>,
    pub address: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ExpiryItem {
    pub batch_id: i64,
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_number: String,
    pub expiry_date: String,
    pub quantity: i64,
    pub days_until_expiry: i64,
    pub expiry_status: String,
    pub selling_price: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AppSettings {
    pub expiry_warning_days: i64,
    pub expiry_monitor_days: i64,
    pub auto_backup_enabled: bool,
    pub auto_backup_interval_hours: i64,
    pub has_pin: bool,
    pub currency: String,
    pub language: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateSettingsInput {
    pub expiry_warning_days: i64,
    pub expiry_monitor_days: i64,
    pub auto_backup_enabled: bool,
    pub auto_backup_interval_hours: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BackupInfo {
    pub id: i64,
    pub filename: String,
    pub filepath: String,
    pub file_size: i64,
    pub backup_type: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ActivityLog {
    pub id: i64,
    pub action: String,
    pub entity_type: Option<String>,
    pub entity_id: Option<i64>,
    pub details: Option<String>,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Paginated<T> {
    pub items: Vec<T>,
    pub total: i64,
    pub page: i64,
    pub page_size: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ReportRow {
    pub label: String,
    pub value: String,
    pub extra: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PeriodAnalysis {
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub total_sales: f64,
    pub sales_count: i64,
    pub items_sold: i64,
    pub stock_added: i64,
    pub medicines_added: i64,
    pub profit_from_sales: f64,
    pub summary: Vec<ReportRow>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitReportItem {
    pub medicine_name: String,
    pub batch_number: String,
    pub quantity: i64,
    pub purchase_price: f64,
    pub selling_price: f64,
    pub profit_per_unit: f64,
    pub expected_profit: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PosMedicine {
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_id: i64,
    pub batch_number: String,
    pub selling_price: f64,
    pub available_stock: i64,
    pub expiry_date: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CartItemInput {
    pub batch_id: i64,
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_number: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CompleteSaleInput {
    pub items: Vec<CartItemInput>,
    pub total_amount: f64,
    pub amount_paid: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Sale {
    pub id: i64,
    pub receipt_number: String,
    pub total_amount: f64,
    pub amount_paid: f64,
    pub change_amount: f64,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleItem {
    pub id: i64,
    pub sale_id: i64,
    pub batch_id: i64,
    pub medicine_id: i64,
    pub medicine_name: String,
    pub batch_number: String,
    pub quantity: i64,
    pub unit_price: f64,
    pub line_total: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SaleDetail {
    pub sale: Sale,
    pub items: Vec<SaleItem>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxSettings {
    pub vat_enabled: bool,
    pub vat_rate: f64,
    pub prices_include_vat: bool,
    pub currency: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateTaxSettingsInput {
    pub vat_enabled: bool,
    pub vat_rate: f64,
    pub prices_include_vat: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaxOverview {
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub currency: String,
    pub vat_enabled: bool,
    pub vat_rate: f64,
    pub total_sales: f64,
    pub total_purchases: f64,
    pub total_expenses: f64,
    pub gross_profit: f64,
    pub estimated_taxable_income: f64,
    pub vat_collected: f64,
    pub vat_paid_on_purchases: f64,
    pub estimated_vat_payable: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SalesTaxRow {
    pub sale_id: i64,
    pub date: String,
    pub receipt_number: String,
    pub customer: String,
    pub total_amount: f64,
    pub tax_amount: f64,
    pub net_amount: f64,
    pub payment_method: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PurchaseTaxRow {
    pub batch_id: i64,
    pub purchase_date: String,
    pub supplier_name: String,
    pub medicine_name: String,
    pub reference_number: String,
    pub purchase_amount: f64,
    pub tax_paid: f64,
    pub total_cost: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Expense {
    pub id: i64,
    pub category: String,
    pub amount: f64,
    pub expense_date: String,
    pub tax_relevant: bool,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateExpenseInput {
    pub category: String,
    pub amount: f64,
    pub expense_date: String,
    pub tax_relevant: bool,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UpdateExpenseInput {
    pub id: i64,
    pub category: String,
    pub amount: f64,
    pub expense_date: String,
    pub tax_relevant: bool,
    pub reference_number: Option<String>,
    pub notes: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProfitTaxSummary {
    pub period: String,
    pub start_date: String,
    pub end_date: String,
    pub currency: String,
    pub revenue: f64,
    pub cost_of_goods_sold: f64,
    pub gross_profit: f64,
    pub operating_expenses: f64,
    pub net_profit: f64,
    pub vat_collected: f64,
    pub vat_paid: f64,
    pub estimated_vat_payable: f64,
    pub estimated_taxable_income: f64,
}
