mod commands;
mod database;
mod llm;
mod shortcut;

use crate::shortcut::shortcut_hotkey;
use std::path::PathBuf;
use tauri::Manager;
use tauri_plugin_global_shortcut::GlobalShortcutExt;

#[derive(Clone)]
pub struct AppState {
    pub db_path: PathBuf,
}

#[cfg_attr(mobile, tauri::mobile_entry_poPcartint)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    let app_handle = app.app_handle();
                    shortcut::handle_shortcut(app_handle, shortcut, event);
                })
                .build(),
        )
        .setup(|app| {
            let dotenv_loaded = dotenvy::dotenv().is_ok();
            let has_openai_key = env::var("OPENAI_API_KEY")
                .map(|v| !v.trim().is_empty())
                .unwrap_or(false);

            if !dotenv_loaded {
                eprintln!(".env not found");
            }
            if !has_openai_key {
                eprintln!("OPENAI_API_KEY missing.");
            }

            let db_path = database::init_database(app.app_handle().clone())?;
            app.manage(AppState {
                db_path: db_path.clone(),
            });

            let shortcutwrapper = shortcut_hotkey()?;
            app.global_shortcut().register(shortcutwrapper)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_items,
            commands::submit_clip,
            commands::close_toolbar_window
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
