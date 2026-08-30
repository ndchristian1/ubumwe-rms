use std::sync::Arc;
use parking_lot::Mutex;
use rusqlite::Connection;
use tauri::Manager;


mod commands;
mod db;
mod error;
mod models;

pub struct AppState {
    pub db: Arc<Mutex<Connection>>,
    pub data_dir: std::path::PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .setup(|app| {
            let data_dir = app
                .path()
                .app_data_dir()
                .expect("Failed to resolve app data directory");

            std::fs::create_dir_all(&data_dir).expect("Failed to create app data directory");

            let db_path = data_dir.join("ubumwe.db");
            let backups_dir = data_dir.join("backups");
            let conn = commands::backup::open_database_with_recovery(&db_path, &backups_dir)
                .expect("Failed to initialize database");

            let db = Arc::new(Mutex::new(conn));
            commands::backup::schedule_auto_backup(db.clone(), data_dir.clone());

            app.manage(AppState {
                db,
                data_dir,
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::pharmacy::get_setup_status,
            commands::pharmacy::complete_setup,
            commands::pharmacy::get_pharmacy,
            commands::pharmacy::update_pharmacy,
            commands::dashboard::get_dashboard_stats,
            commands::medicines::list_medicines,
            commands::medicines::get_medicine,
            commands::medicines::create_medicine,
            commands::medicines::update_medicine,
            commands::medicines::archive_medicine,
            commands::medicines::delete_medicine,
            commands::batches::list_batches,
            commands::batches::create_batch,
            commands::batches::update_batch,
            commands::inventory::list_transactions,
            commands::inventory::add_stock,
            commands::inventory::adjust_stock,
            commands::expiry::list_expiry_items,
            commands::suppliers::list_suppliers,
            commands::suppliers::create_supplier,
            commands::suppliers::update_supplier,
            commands::reports::inventory_report,
            commands::reports::expiry_report,
            commands::reports::profit_report,
            commands::reports::stock_movement_report,
            commands::reports::period_analysis,
            commands::settings::get_settings,
            commands::settings::update_settings,
            commands::settings::update_language,
            commands::settings::verify_pin,
            commands::settings::set_pin,
            commands::backup::create_backup,
            commands::backup::list_backups,
            commands::backup::restore_backup,
            commands::backup::delete_backup,
            commands::activity::list_activity_logs,
            commands::pos::search_pos_medicines,
            commands::pos::complete_sale,
            commands::pos::list_sales,
            commands::pos::get_sale,
            commands::tax::get_tax_settings,
            commands::tax::update_tax_settings,
            commands::tax::tax_overview,
            commands::tax::sales_tax_report,
            commands::tax::purchase_tax_report,
            commands::tax::list_expenses,
            commands::tax::create_expense,
            commands::tax::update_expense,
            commands::tax::delete_expense,
            commands::tax::profit_tax_summary,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
