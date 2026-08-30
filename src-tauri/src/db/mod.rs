use rusqlite::{Connection, params};
use crate::error::{AppError, AppResult};

pub fn init_database(path: &std::path::Path) -> AppResult<Connection> {
    let conn = Connection::open(path)?;
    conn.execute_batch(
        "PRAGMA journal_mode = WAL;
         PRAGMA foreign_keys = ON;
         PRAGMA synchronous = FULL;
         PRAGMA temp_store = MEMORY;
         PRAGMA mmap_size = 268435456;
         PRAGMA cache_size = -64000;
         PRAGMA page_size = 4096;",
    )?;
    run_migrations(&conn)?;
    Ok(conn)
}

pub fn run_migrations(conn: &Connection) -> AppResult<()> {
    conn.execute_batch(
        "
        CREATE TABLE IF NOT EXISTS pharmacy (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL,
            owner_name TEXT NOT NULL,
            location TEXT,
            currency TEXT NOT NULL DEFAULT 'RWF',
            setup_complete INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS suppliers (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE,
            phone TEXT,
            email TEXT,
            address TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS medicines (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            category TEXT NOT NULL DEFAULT 'General',
            description TEXT,
            low_stock_threshold INTEGER NOT NULL DEFAULT 0,
            is_archived INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
        CREATE INDEX IF NOT EXISTS idx_medicines_archived ON medicines(is_archived);

        CREATE TABLE IF NOT EXISTS batches (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
            batch_number TEXT NOT NULL,
            expiry_date TEXT NOT NULL,
            quantity INTEGER NOT NULL DEFAULT 0 CHECK (quantity >= 0),
            purchase_price REAL NOT NULL DEFAULT 0 CHECK (purchase_price >= 0),
            selling_price REAL NOT NULL DEFAULT 0 CHECK (selling_price >= 0),
            supplier_id INTEGER REFERENCES suppliers(id),
            date_added TEXT NOT NULL DEFAULT (date('now')),
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now')),
            UNIQUE(medicine_id, batch_number)
        );

        CREATE INDEX IF NOT EXISTS idx_batches_medicine ON batches(medicine_id);
        CREATE INDEX IF NOT EXISTS idx_batches_expiry ON batches(expiry_date);
        CREATE INDEX IF NOT EXISTS idx_batches_quantity ON batches(quantity);

        CREATE TABLE IF NOT EXISTS inventory_transactions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            batch_id INTEGER NOT NULL REFERENCES batches(id) ON DELETE CASCADE,
            medicine_id INTEGER NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
            transaction_type TEXT NOT NULL CHECK (transaction_type IN ('add', 'adjust', 'sale', 'expired', 'archive')),
            quantity_change INTEGER NOT NULL,
            quantity_before INTEGER NOT NULL,
            quantity_after INTEGER NOT NULL,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_inv_tx_batch ON inventory_transactions(batch_id);
        CREATE INDEX IF NOT EXISTS idx_inv_tx_medicine ON inventory_transactions(medicine_id);
        CREATE INDEX IF NOT EXISTS idx_inv_tx_created ON inventory_transactions(created_at);

        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id INTEGER,
            details TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_activity_created ON activity_logs(created_at);

        CREATE TABLE IF NOT EXISTS backups (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            filename TEXT NOT NULL UNIQUE,
            filepath TEXT NOT NULL,
            file_size INTEGER NOT NULL DEFAULT 0,
            backup_type TEXT NOT NULL DEFAULT 'manual' CHECK (backup_type IN ('manual', 'auto')),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        INSERT OR IGNORE INTO settings (key, value) VALUES ('owner_pin_hash', '');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('expiry_warning_days', '90');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('expiry_monitor_days', '180');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup_enabled', 'true');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('auto_backup_interval_hours', '24');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('language', 'en');
        CREATE INDEX IF NOT EXISTS idx_inv_tx_type ON inventory_transactions(transaction_type);
        CREATE INDEX IF NOT EXISTS idx_medicines_category ON medicines(category);

        INSERT OR IGNORE INTO settings (key, value) VALUES ('last_auto_backup', '');

        CREATE TABLE IF NOT EXISTS sales (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            receipt_number TEXT NOT NULL UNIQUE,
            total_amount REAL NOT NULL CHECK (total_amount >= 0),
            amount_paid REAL NOT NULL CHECK (amount_paid >= 0),
            change_amount REAL NOT NULL CHECK (change_amount >= 0),
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_sales_created ON sales(created_at);
        CREATE INDEX IF NOT EXISTS idx_sales_receipt ON sales(receipt_number);

        CREATE TABLE IF NOT EXISTS sale_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
            batch_id INTEGER NOT NULL REFERENCES batches(id),
            medicine_id INTEGER NOT NULL REFERENCES medicines(id),
            medicine_name TEXT NOT NULL,
            batch_number TEXT NOT NULL,
            quantity INTEGER NOT NULL CHECK (quantity > 0),
            unit_price REAL NOT NULL CHECK (unit_price >= 0),
            line_total REAL NOT NULL CHECK (line_total >= 0)
        );

        CREATE INDEX IF NOT EXISTS idx_sale_items_sale ON sale_items(sale_id);

        CREATE TABLE IF NOT EXISTS expenses (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            amount REAL NOT NULL CHECK (amount >= 0),
            expense_date TEXT NOT NULL,
            tax_relevant INTEGER NOT NULL DEFAULT 1,
            reference_number TEXT,
            notes TEXT,
            created_at TEXT NOT NULL DEFAULT (datetime('now')),
            updated_at TEXT NOT NULL DEFAULT (datetime('now'))
        );

        CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
        CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category);

        INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_enabled', 'true');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('vat_rate', '18');
        INSERT OR IGNORE INTO settings (key, value) VALUES ('prices_include_vat', 'true');
        ",
    )?;
    Ok(())
}

pub fn log_activity(
    conn: &Connection,
    action: &str,
    entity_type: Option<&str>,
    entity_id: Option<i64>,
    details: Option<&str>,
) -> AppResult<()> {
    conn.execute(
        "INSERT INTO activity_logs (action, entity_type, entity_id, details) VALUES (?1, ?2, ?3, ?4)",
        params![action, entity_type, entity_id, details],
    )?;
    Ok(())
}

pub fn get_setting(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    let result = conn.query_row(
        "SELECT value FROM settings WHERE key = ?1",
        params![key],
        |row| row.get(0),
    );
    match result {
        Ok(v) => Ok(Some(v)),
        Err(rusqlite::Error::QueryReturnedNoRows) => Ok(None),
        Err(e) => Err(e.into()),
    }
}

pub fn set_setting(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))
         ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = datetime('now')",
        params![key, value],
    )?;
    Ok(())
}

pub fn hash_pin(pin: &str) -> String {
    use sha2::{Digest, Sha256};
    let mut hasher = Sha256::new();
    hasher.update(pin.as_bytes());
    hex::encode(hasher.finalize())
}

pub fn verify_pin(conn: &Connection, pin: &str) -> AppResult<bool> {
    let stored = get_setting(conn, "owner_pin_hash")?.unwrap_or_default();
    if stored.trim().is_empty() {
        return Ok(false);
    }
    Ok(stored == hash_pin(pin))
}

pub fn require_pin(conn: &Connection, pin: Option<&str>) -> AppResult<()> {
    let stored = get_setting(conn, "owner_pin_hash")?.unwrap_or_default();
    if stored.is_empty() {
        return Err(AppError::Unauthorized(
            "Please set an owner PIN in Settings before doing this action.".into(),
        ));
    }
    match pin {
        Some(p) if !p.is_empty() && hash_pin(p) == stored => Ok(()),
        Some(_) => Err(AppError::Unauthorized("Wrong PIN. Please try again.".into())),
        None => Err(AppError::Unauthorized("Please enter your owner PIN.".into())),
    }
}

pub fn require_pin_if_set(conn: &Connection, pin: Option<&str>) -> AppResult<()> {
    let stored = get_setting(conn, "owner_pin_hash")?.unwrap_or_default();
    if stored.trim().is_empty() {
        return Ok(());
    }
    let pin = pin.filter(|p| !p.trim().is_empty());
    require_pin(conn, pin)
}

pub fn expiry_status(expiry_date: &str, warning_days: i64, monitor_days: i64) -> (&'static str, i64) {
    let today = chrono::Local::now().date_naive();
    let expiry = chrono::NaiveDate::parse_from_str(expiry_date, "%Y-%m-%d")
        .unwrap_or(today);
    let days = (expiry - today).num_days();
    let status = if days < 0 {
        "expired"
    } else if days <= warning_days {
        "expiring_soon"
    } else if days <= monitor_days {
        "monitor"
    } else {
        "safe"
    };
    (status, days)
}

/// Count in-stock batches that are expired or expiring soon (matches Expiry page alerts).
pub fn count_expiry_alerts(conn: &rusqlite::Connection, warning_days: i64) -> rusqlite::Result<(i64, i64)> {
    let mut stmt = conn.prepare(
        "SELECT b.expiry_date FROM batches b
         JOIN medicines m ON m.id = b.medicine_id
         WHERE m.is_archived = 0 AND b.quantity > 0",
    )?;
    let rows = stmt.query_map([], |row| row.get::<_, String>(0))?;
    let mut expired = 0i64;
    let mut expiring_soon = 0i64;
    for expiry_date in rows.flatten() {
        let (status, _) = expiry_status(&expiry_date, warning_days, i64::MAX);
        match status {
            "expired" => expired += 1,
            "expiring_soon" => expiring_soon += 1,
            _ => {}
        }
    }
    Ok((expired, expiring_soon))
}
