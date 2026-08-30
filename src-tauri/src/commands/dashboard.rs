use crate::db;
use crate::error::AppResult;
use crate::models::DashboardStats;

const SELLABLE_BATCH: &str = "m.is_archived = 0 AND b.quantity > 0 AND date(b.expiry_date) >= date('now')";

#[tauri::command]
pub fn get_dashboard_stats(state: tauri::State<'_, crate::AppState>) -> AppResult<DashboardStats> {
    let conn = state.db.lock();
    let warning_days: i64 = db::get_setting(&conn, "expiry_warning_days")?
        .and_then(|v| v.parse().ok())
        .unwrap_or(90);

    let total_medicines: i64 = conn.query_row(
        "SELECT COUNT(*) FROM medicines WHERE is_archived = 0",
        [],
        |row| row.get(0),
    )?;

    let total_stock_quantity: i64 = conn.query_row(
        &format!(
            "SELECT COALESCE(SUM(b.quantity), 0) FROM batches b
             JOIN medicines m ON m.id = b.medicine_id WHERE {SELLABLE_BATCH}"
        ),
        [],
        |row| row.get(0),
    )?;

    let inventory_value: f64 = conn.query_row(
        &format!(
            "SELECT COALESCE(SUM(b.quantity * b.purchase_price), 0) FROM batches b
             JOIN medicines m ON m.id = b.medicine_id WHERE {SELLABLE_BATCH}"
        ),
        [],
        |row| row.get(0),
    )?;

    let expected_profit: f64 = conn.query_row(
        &format!(
            "SELECT COALESCE(SUM(b.quantity * (b.selling_price - b.purchase_price)), 0) FROM batches b
             JOIN medicines m ON m.id = b.medicine_id WHERE {SELLABLE_BATCH}"
        ),
        [],
        |row| row.get(0),
    )?;

    let (expired_count, expiring_soon_count) = db::count_expiry_alerts(&conn, warning_days)?;

    let low_stock_count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM (
            SELECT m.id, COALESCE(SUM(b.quantity), 0) as total_qty, m.low_stock_threshold
            FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id
            WHERE m.is_archived = 0 GROUP BY m.id
            HAVING total_qty > 0 AND total_qty <= m.low_stock_threshold
        )",
        [],
        |row| row.get(0),
    )?;

    let currency = db::get_setting(&conn, "currency")?
        .or_else(|| {
            conn.query_row("SELECT currency FROM pharmacy WHERE id = 1", [], |row| row.get(0))
                .ok()
        })
        .unwrap_or_else(|| "RWF".to_string());

    Ok(DashboardStats {
        total_medicines,
        total_stock_quantity,
        inventory_value,
        expected_profit,
        expired_count,
        expiring_soon_count,
        low_stock_count,
        currency,
    })
}
