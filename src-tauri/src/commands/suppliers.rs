use rusqlite::params;
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::Supplier;

#[tauri::command]
pub fn list_suppliers(state: tauri::State<'_, crate::AppState>) -> AppResult<Vec<Supplier>> {
    let conn = state.db.lock();
    let mut stmt = conn.prepare("SELECT id, name, phone, email, address FROM suppliers ORDER BY name ASC")?;
    let items = stmt
        .query_map([], |row| {
            Ok(Supplier {
                id: row.get(0)?,
                name: row.get(1)?,
                phone: row.get(2)?,
                email: row.get(3)?,
                address: row.get(4)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;
    Ok(items)
}

#[tauri::command]
pub fn create_supplier(
    state: tauri::State<'_, crate::AppState>,
    name: String,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
) -> AppResult<Supplier> {
    if name.trim().is_empty() {
        return Err(AppError::Validation("Supplier name is required".into()));
    }
    let conn = state.db.lock();
    conn.execute(
        "INSERT INTO suppliers (name, phone, email, address) VALUES (?1, ?2, ?3, ?4)",
        params![name.trim(), phone, email, address],
    )?;
    let id = conn.last_insert_rowid();
    db::log_activity(&conn, "create_supplier", Some("supplier"), Some(id), Some(&name))?;
    Ok(Supplier { id, name: name.trim().to_string(), phone, email, address })
}

#[tauri::command]
pub fn update_supplier(
    state: tauri::State<'_, crate::AppState>,
    id: i64,
    name: String,
    phone: Option<String>,
    email: Option<String>,
    address: Option<String>,
) -> AppResult<Supplier> {
    let conn = state.db.lock();
    conn.execute(
        "UPDATE suppliers SET name = ?1, phone = ?2, email = ?3, address = ?4, updated_at = datetime('now') WHERE id = ?5",
        params![name.trim(), phone, email, address, id],
    )?;
    Ok(Supplier { id, name: name.trim().to_string(), phone, email, address })
}
