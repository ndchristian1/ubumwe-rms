use rusqlite::{params, Connection};
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::{Pharmacy, SetupInput};

#[tauri::command]
pub fn get_setup_status(state: tauri::State<'_, crate::AppState>) -> AppResult<bool> {
    let conn = state.db.lock();
    let count: i64 = conn.query_row(
        "SELECT COUNT(*) FROM pharmacy WHERE setup_complete = 1",
        [],
        |row| row.get(0),
    )?;
    Ok(count > 0)
}

#[tauri::command]
pub fn complete_setup(
    state: tauri::State<'_, crate::AppState>,
    input: SetupInput,
) -> AppResult<Pharmacy> {
    if input.name.trim().is_empty() || input.owner_name.trim().is_empty() {
        return Err(AppError::Validation("Store name and owner name are required".into()));
    }
    let conn = state.db.lock();
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "INSERT INTO pharmacy (id, name, owner_name, location, currency, setup_complete)
         VALUES (1, ?1, ?2, ?3, ?4, 1)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           owner_name = excluded.owner_name,
           location = excluded.location,
           currency = excluded.currency,
           setup_complete = 1,
           updated_at = datetime('now')",
        params![input.name.trim(), input.owner_name.trim(), input.location, input.currency],
    )?;
    db::log_activity(&tx, "setup_complete", Some("pharmacy"), Some(1), Some(&input.name))?;
    tx.commit()?;
    get_pharmacy_inner(&conn)
}

#[tauri::command]
pub fn get_pharmacy(state: tauri::State<'_, crate::AppState>) -> AppResult<Pharmacy> {
    let conn = state.db.lock();
    get_pharmacy_inner(&conn)
}

#[tauri::command]
pub fn update_pharmacy(
    state: tauri::State<'_, crate::AppState>,
    name: String,
    owner_name: String,
    location: Option<String>,
    currency: String,
) -> AppResult<Pharmacy> {
    let conn = state.db.lock();
    conn.execute(
        "UPDATE pharmacy SET name = ?1, owner_name = ?2, location = ?3, currency = ?4, updated_at = datetime('now') WHERE id = 1",
        params![name.trim(), owner_name.trim(), location, currency],
    )?;
    db::log_activity(&conn, "update_pharmacy", Some("pharmacy"), Some(1), Some(&name))?;
    get_pharmacy_inner(&conn)
}

fn get_pharmacy_inner(conn: &Connection) -> AppResult<Pharmacy> {
    conn.query_row(
        "SELECT id, name, owner_name, location, currency, setup_complete, created_at, updated_at FROM pharmacy WHERE id = 1",
        [],
        |row| {
            Ok(Pharmacy {
                id: row.get(0)?,
                name: row.get(1)?,
                owner_name: row.get(2)?,
                location: row.get(3)?,
                currency: row.get(4)?,
                setup_complete: row.get::<_, i64>(5)? == 1,
                created_at: row.get(6)?,
                updated_at: row.get(7)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound("Retail store not configured".into()),
        other => other.into(),
    })
}
