use crate::db;
use crate::error::AppResult;
use crate::models::ExpiryItem;

#[tauri::command]
pub fn list_expiry_items(
    state: tauri::State<'_, crate::AppState>,
    status_filter: Option<String>,
) -> AppResult<Vec<ExpiryItem>> {
    let conn = state.db.lock();
    let warning_days: i64 = db::get_setting(&conn, "expiry_warning_days")?.and_then(|v| v.parse().ok()).unwrap_or(90);
    let monitor_days: i64 = db::get_setting(&conn, "expiry_monitor_days")?.and_then(|v| v.parse().ok()).unwrap_or(180);

    let mut stmt = conn.prepare(
        "SELECT b.id, b.medicine_id, m.name, b.batch_number, b.expiry_date, b.quantity, b.selling_price
         FROM batches b
         JOIN medicines m ON m.id = b.medicine_id
         WHERE m.is_archived = 0 AND b.quantity > 0
         ORDER BY b.expiry_date ASC",
    )?;

    let rows = stmt.query_map([], |row| {
        let expiry_date: String = row.get(4)?;
        let (status, days) = db::expiry_status(&expiry_date, warning_days, monitor_days);
        Ok((
            ExpiryItem {
                batch_id: row.get(0)?,
                medicine_id: row.get(1)?,
                medicine_name: row.get(2)?,
                batch_number: row.get(3)?,
                expiry_date,
                quantity: row.get(5)?,
                days_until_expiry: days,
                expiry_status: status.to_string(),
                selling_price: row.get(6)?,
            },
            status.to_string(),
        ))
    })?;

    let filter = status_filter.unwrap_or_default();
    let items: Vec<ExpiryItem> = rows
        .filter_map(|r| r.ok())
        .filter(|(_, status)| filter.is_empty() || *status == filter)
        .map(|(item, _)| item)
        .collect();

    Ok(items)
}
