use crate::db;
use crate::error::{AppError, AppResult};
use crate::models::{AppSettings, UpdateSettingsInput};

#[tauri::command]
pub fn get_settings(state: tauri::State<'_, crate::AppState>) -> AppResult<AppSettings> {
    let conn = state.db.lock();
    let expiry_warning_days: i64 = db::get_setting(&conn, "expiry_warning_days")?.and_then(|v| v.parse().ok()).unwrap_or(90);
    let expiry_monitor_days: i64 = db::get_setting(&conn, "expiry_monitor_days")?.and_then(|v| v.parse().ok()).unwrap_or(180);
    let auto_backup_enabled = db::get_setting(&conn, "auto_backup_enabled")?.map(|v| v == "true").unwrap_or(true);
    let auto_backup_interval_hours: i64 = db::get_setting(&conn, "auto_backup_interval_hours")?.and_then(|v| v.parse().ok()).unwrap_or(24);
    let pin_hash = db::get_setting(&conn, "owner_pin_hash")?.unwrap_or_default();
    let language = db::get_setting(&conn, "language")?.unwrap_or_else(|| "en".to_string());
    let currency = conn
        .query_row("SELECT currency FROM pharmacy WHERE id = 1", [], |r| r.get(0))
        .unwrap_or_else(|_| "RWF".to_string());

    Ok(AppSettings {
        expiry_warning_days,
        expiry_monitor_days,
        auto_backup_enabled,
        auto_backup_interval_hours,
        has_pin: !pin_hash.trim().is_empty(),
        currency,
        language,
    })
}
#[tauri::command]
pub fn update_language(state: tauri::State<'_, crate::AppState>, language: String) -> AppResult<()> {
    let allowed = ["en", "rw", "fr", "sw"];
    if !allowed.contains(&language.as_str()) {
        return Err(AppError::Validation("Language not supported".into()));
    }
    let conn = state.db.lock();
    db::set_setting(&conn, "language", &language)?;
    Ok(())
}

#[tauri::command]
pub fn update_settings(
    state: tauri::State<'_, crate::AppState>,
    input: UpdateSettingsInput,
    pin: Option<String>,
) -> AppResult<AppSettings> {
    {
        let conn = state.db.lock();
        db::require_pin_if_set(&conn, pin.as_deref())?;
        db::set_setting(&conn, "expiry_warning_days", &input.expiry_warning_days.to_string())?;
        db::set_setting(&conn, "expiry_monitor_days", &input.expiry_monitor_days.to_string())?;
        db::set_setting(&conn, "auto_backup_enabled", if input.auto_backup_enabled { "true" } else { "false" })?;
        db::set_setting(&conn, "auto_backup_interval_hours", &input.auto_backup_interval_hours.to_string())?;
        db::log_activity(&conn, "update_settings", Some("settings"), None, None)?;
    }

    get_settings(state)
}

#[tauri::command]
pub fn verify_pin(state: tauri::State<'_, crate::AppState>, pin: String) -> AppResult<bool> {
    let conn = state.db.lock();
    db::verify_pin(&conn, &pin)
}

#[tauri::command]
pub fn set_pin(
    state: tauri::State<'_, crate::AppState>,
    pin: String,
    current_pin: Option<String>,
) -> AppResult<()> {
    if pin.len() < 4 {
        return Err(AppError::Validation("PIN must be at least 4 digits".into()));
    }
    let conn = state.db.lock();
    db::require_pin_if_set(&conn, current_pin.as_deref())?;
    db::set_setting(&conn, "owner_pin_hash", &db::hash_pin(&pin))?;
    db::log_activity(&conn, "set_pin", Some("settings"), None, None)?;
    Ok(())
}
