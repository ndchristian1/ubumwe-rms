use rusqlite::{params, Connection};
use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::{CreateMedicineInput, Medicine, Paginated, UpdateMedicineInput};

#[tauri::command]
pub fn list_medicines(
    state: tauri::State<'_, crate::AppState>,
    search: Option<String>,
    category: Option<String>,
    include_archived: Option<bool>,
    low_stock_only: Option<bool>,
    page: Option<i64>,
    page_size: Option<i64>,
) -> AppResult<Paginated<Medicine>> {
    let conn = state.db.lock();
    let page = page.unwrap_or(1).max(1);
    let page_size = page_size.unwrap_or(20).clamp(1, 100);
    let offset = (page - 1) * page_size;
    let search = search.unwrap_or_default();
    let include_archived = include_archived.unwrap_or(false);
    let low_stock_only = low_stock_only.unwrap_or(false);

    let mut where_clauses = vec!["1=1".to_string()];
    if !include_archived {
        where_clauses.push("m.is_archived = 0".to_string());
    }
    if !search.is_empty() {
        where_clauses.push(format!("m.name LIKE '%{}%'", search.replace('\'', "''")));
    }
    if let Some(cat) = category.filter(|c| !c.is_empty()) {
        where_clauses.push(format!("m.category = '{}'", cat.replace('\'', "''")));
    }
    let where_sql = where_clauses.join(" AND ");

    let having_sql = if low_stock_only {
        " HAVING total_qty <= m.low_stock_threshold AND total_qty >= 0"
    } else {
        ""
    };

    let count_sql = format!(
        "SELECT COUNT(*) FROM (
            SELECT m.id, COALESCE(SUM(b.quantity), 0) as total_qty, m.low_stock_threshold
            FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id
            WHERE {}
            GROUP BY m.id{}
        )",
        where_sql, having_sql
    );
    let total: i64 = conn.query_row(&count_sql, [], |row| row.get(0))?;

    let sql = format!(
        "SELECT m.id, m.name, m.category, m.description, m.low_stock_threshold, m.is_archived,
                COALESCE(SUM(b.quantity), 0) as total_qty,
                COUNT(b.id) as batch_count,
                MIN(CASE WHEN b.quantity > 0 THEN b.expiry_date END) as nearest_expiry,
                m.created_at, m.updated_at
         FROM medicines m
         LEFT JOIN batches b ON b.medicine_id = m.id
         WHERE {}
         GROUP BY m.id{}
         ORDER BY m.name ASC
         LIMIT ?1 OFFSET ?2",
        where_sql, having_sql
    );

    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(params![page_size, offset], |row| {
            Ok(Medicine {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                description: row.get(3)?,
                low_stock_threshold: row.get(4)?,
                is_archived: row.get::<_, i64>(5)? == 1,
                total_quantity: row.get(6)?,
                batch_count: row.get(7)?,
                nearest_expiry: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })?
        .collect::<Result<Vec<_>, _>>()?;

    Ok(Paginated { items, total, page, page_size })
}

#[tauri::command]
pub fn get_medicine(state: tauri::State<'_, crate::AppState>, id: i64) -> AppResult<Medicine> {
    let conn = state.db.lock();
    get_medicine_inner(&conn, id)
}

fn get_medicine_inner(conn: &Connection, id: i64) -> AppResult<Medicine> {
    conn.query_row(
        "SELECT m.id, m.name, m.category, m.description, m.low_stock_threshold, m.is_archived,
                COALESCE(SUM(b.quantity), 0), COUNT(b.id),
                MIN(CASE WHEN b.quantity > 0 THEN b.expiry_date END),
                m.created_at, m.updated_at
         FROM medicines m LEFT JOIN batches b ON b.medicine_id = m.id
         WHERE m.id = ?1 GROUP BY m.id",
        params![id],
        |row| {
            Ok(Medicine {
                id: row.get(0)?,
                name: row.get(1)?,
                category: row.get(2)?,
                description: row.get(3)?,
                low_stock_threshold: row.get(4)?,
                is_archived: row.get::<_, i64>(5)? == 1,
                total_quantity: row.get(6)?,
                batch_count: row.get(7)?,
                nearest_expiry: row.get(8)?,
                created_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        },
    )
    .map_err(|e| match e {
        rusqlite::Error::QueryReturnedNoRows => AppError::NotFound(format!("Medicine {} not found", id)),
        other => other.into(),
    })
}

#[tauri::command]
pub fn create_medicine(
    state: tauri::State<'_, crate::AppState>,
    input: CreateMedicineInput,
) -> AppResult<Medicine> {
    validate_medicine_input(&input.name, input.quantity, input.purchase_price, input.selling_price)?;
    let conn = state.db.lock();
    let tx = conn.unchecked_transaction()?;

    let supplier_id = resolve_supplier(&tx, input.supplier_id, input.supplier_name.as_deref())?;

    tx.execute(
        "INSERT INTO medicines (name, category, description, low_stock_threshold) VALUES (?1, ?2, ?3, ?4)",
        params![input.name.trim(), input.category.trim(), input.description, input.low_stock_threshold],
    )?;
    let medicine_id = tx.last_insert_rowid();

    tx.execute(
        "INSERT INTO batches (medicine_id, batch_number, expiry_date, quantity, purchase_price, selling_price, supplier_id)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        params![
            medicine_id, input.batch_number.trim(), input.expiry_date,
            input.quantity, input.purchase_price, input.selling_price, supplier_id
        ],
    )?;
    let batch_id = tx.last_insert_rowid();

    tx.execute(
        "INSERT INTO inventory_transactions (batch_id, medicine_id, transaction_type, quantity_change, quantity_before, quantity_after, notes)
         VALUES (?1, ?2, 'add', ?3, 0, ?3, 'Initial stock')",
        params![batch_id, medicine_id, input.quantity],
    )?;

    db::log_activity(&tx, "create_medicine", Some("medicine"), Some(medicine_id), Some(&input.name))?;
    tx.commit()?;
    get_medicine_inner(&conn, medicine_id)
}

#[tauri::command]
pub fn update_medicine(
    state: tauri::State<'_, crate::AppState>,
    input: UpdateMedicineInput,
) -> AppResult<Medicine> {
    if input.name.trim().is_empty() {
        return Err(AppError::Validation("Medicine name is required".into()));
    }
    let conn = state.db.lock();
    conn.execute(
        "UPDATE medicines SET name = ?1, category = ?2, description = ?3, low_stock_threshold = ?4, updated_at = datetime('now') WHERE id = ?5",
        params![input.name.trim(), input.category.trim(), input.description, input.low_stock_threshold, input.id],
    )?;
    db::log_activity(&conn, "update_medicine", Some("medicine"), Some(input.id), Some(&input.name))?;
    get_medicine_inner(&conn, input.id)
}

#[tauri::command]
pub fn archive_medicine(state: tauri::State<'_, crate::AppState>, id: i64) -> AppResult<()> {
    let conn = state.db.lock();
    conn.execute(
        "UPDATE medicines SET is_archived = 1, updated_at = datetime('now') WHERE id = ?1",
        params![id],
    )?;
    db::log_activity(&conn, "archive_medicine", Some("medicine"), Some(id), None)?;
    Ok(())
}

#[tauri::command]
pub fn delete_medicine(
    state: tauri::State<'_, crate::AppState>,
    id: i64,
    pin: Option<String>,
) -> AppResult<()> {
    let conn = state.db.lock();
    db::require_pin(&conn, pin.as_deref())?;
    let tx = conn.unchecked_transaction()?;
    tx.execute(
        "DELETE FROM sale_items WHERE batch_id IN (SELECT id FROM batches WHERE medicine_id = ?1)",
        params![id],
    )?;
    tx.execute("DELETE FROM inventory_transactions WHERE medicine_id = ?1", params![id])?;
    tx.execute("DELETE FROM batches WHERE medicine_id = ?1", params![id])?;
    tx.execute("DELETE FROM medicines WHERE id = ?1", params![id])?;
    db::log_activity(&tx, "delete_medicine", Some("medicine"), Some(id), None)?;
    tx.commit()?;
    Ok(())
}

fn validate_medicine_input(name: &str, quantity: i64, purchase_price: f64, selling_price: f64) -> AppResult<()> {
    if name.trim().is_empty() {
        return Err(AppError::Validation("Medicine name is required".into()));
    }
    if quantity < 0 {
        return Err(AppError::Validation("Quantity cannot be negative".into()));
    }
    if purchase_price < 0.0 || selling_price < 0.0 {
        return Err(AppError::Validation("Prices cannot be negative".into()));
    }
    Ok(())
}

fn resolve_supplier(conn: &Connection, supplier_id: Option<i64>, supplier_name: Option<&str>) -> AppResult<Option<i64>> {
    if let Some(id) = supplier_id {
        return Ok(Some(id));
    }
    if let Some(name) = supplier_name.filter(|n| !n.trim().is_empty()) {
        conn.execute(
            "INSERT OR IGNORE INTO suppliers (name) VALUES (?1)",
            params![name.trim()],
        )?;
        let id: i64 = conn.query_row(
            "SELECT id FROM suppliers WHERE name = ?1",
            params![name.trim()],
            |row| row.get(0),
        )?;
        return Ok(Some(id));
    }
    Ok(None)
}
