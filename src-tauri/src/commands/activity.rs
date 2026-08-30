use rusqlite::params;
use crate::error::AppResult;
use crate::models::{ActivityLog, Paginated};

#[tauri::command]
pub fn list_activity_logs(
    state: tauri::State<'_, crate::AppState>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<Paginated<ActivityLog>> {
    let conn = state.db.lock();
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(50).clamp(1, 100);
    let offset = (page - 1) * page_size;

    let total: i64 = conn.query_row("SELECT COUNT(*) FROM activity_logs", [], |r| r.get(0))?;
    let mut stmt = conn.prepare(
        "SELECT id, action, entity_type, entity_id, details, created_at
         FROM activity_logs ORDER BY created_at DESC LIMIT ?1 OFFSET ?2",
    )?;
    let items = stmt
        .query_map(params![page_size, offset], |row| {
            Ok(ActivityLog {
                id: row.get(0)?,
                action: row.get(1)?,
                entity_type: row.get(2)?,
                entity_id: row.get(3)?,
                details: row.get(4)?,
                created_at: row.get(5)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Paginated { items, total, page, page_size })
}
