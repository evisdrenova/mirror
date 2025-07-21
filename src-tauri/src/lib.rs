mod database;
mod shortcut;

use tauri_plugin_global_shortcut::GlobalShortcutExt;

use crate::shortcut::shortcut_hotkey;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(move |app, shortcut, event| {
                    shortcut::handle_shortcut(shortcut, event);
                })
                .build(),
        )
        .setup(|app| {
            // let db_path = database::init_database(app.app_handle().clone())?;
            // let db_path_str = &db_path.to_string_lossy();

            let shortcutwrapper = shortcut_hotkey()?;
            app.global_shortcut().register(shortcutwrapper)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
