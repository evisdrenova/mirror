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

// pub fn run() {
//     tauri::Builder::default()
//         .plugin(tauri_plugin_shell::init())
//         .plugin(tauri_plugin_global_shortcut::Builder::new().build())
//         .plugin(tauri_plugin_dialog::init())
//         .setup(|app| {
//             let db_path = database_handler::init_database(app.app_handle().clone())?;
//             let db_path_str = &db_path.to_string_lossy();

//             settings::init_settings(&db_path_str, app.app_handle().clone())?;
//             file_processor::init_file_processor(&db_path_str, 4, app.app_handle().clone())?;
//             file_watcher::init_file_watcher(app, &db_path)?;
//             resource_monitor::init_resource_monitor(app)?;
//             vectordb_manager::init_vector_db(app)?;
//             // server::init_server(app)?;
//             // server::register_llm_commands(app)?;

//             Ok(())
//         })
//         .manage(FileProcessorState::default())
//         .plugin(tauri_plugin_opener::init())
//         .invoke_handler(tauri::generate_handler![
//             app_handler::get_apps_data,
//             app_handler::force_quit_application,
//             app_handler::restart_application,
//             app_handler::launch_or_switch_to_app,
//             resource_monitor::start_resource_monitoring,
//             resource_monitor::stop_resource_monitoring,
//             file_processor::process_paths_command,
//             file_processor::get_files_data,
//             file_processor::get_semantic_files_data,
//             file_processor::open_file,
//             model_registry::get_models,
//             model_registry::get_downloaded_models,
//             model_registry::start_model_download,
//             model_registry::check_model_exists,
//             server::ask_llm,
//             settings::get_settings,
//             settings::update_settings,
//             window::show_main_window,
//             contacts::get_contacts_command,
//             // contacts::request_contacts_permission_command,
//             // contacts::check_contacts_permission_command
//         ])
//         .run(tauri::generate_context!())
//         .expect("error while running tauri application");
// }

// #[tauri::command]
// pub async fn get_contacts_command() -> Result<Vec<Contact>, String> {
//     match get_contacts() {
//         Ok(contacts) => Ok(contacts),
//         Err(ContactError::PermissionDenied) => {
//             Err("Permission denied to access contacts".to_string())
//         }
//         Err(ContactError::AccessError(msg)) => Err(format!("Access error: {}", msg)),
//         Err(err) => Err(err.to_string()),
//     }
// }
