use rusqlite::{params, Connection};
use std::{
    collections::HashMap,
    path::PathBuf,
    sync::{Arc, Mutex},
};
use tauri::{AppHandle, Manager, State};
use tauri_plugin_global_shortcut::GlobalShortcutExt;
use thiserror::Error;

#[derive(Error, Debug)]
pub enum SettingsError {
    #[error("Database error: {0}")]
    Database(#[from] rusqlite::Error),
    #[error("Serialization error: {0}")]
    Serialization(#[from] serde_json::Error),
}

type Result<T, E = SettingsError> = std::result::Result<T, E>;

pub struct SettingsManager {
    settings: Mutex<HashMap<String, String>>,
    db_path: PathBuf,
}

impl SettingsManager {
    pub fn new(db_path: PathBuf) -> Self {
        Self {
            settings: Mutex::new(HashMap::new()),
            db_path,
        }
    }

    fn get_connection(&self) -> Result<Connection> {
        Connection::open(&self.db_path).map_err(SettingsError::Database)
    }

    pub fn initialize(&self) -> Result<()> {
        let conn = self.get_connection()?;

        let mut stmt = conn.prepare("SELECT key, value FROM settings")?;
        let settings_iter = stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        })?;

        let mut settings = self.settings.lock().unwrap();
        settings.clear();

        for setting_result in settings_iter {
            match setting_result {
                Ok((key, value)) => {
                    settings.insert(key, value);
                }
                Err(e) => {
                    eprintln!("Error loading setting: {}", e);
                }
            }
        }
        let defaults = vec![("global_hotkey", "CommandOrControl+Shift+S")];

        for (key, default_value) in defaults {
            if !settings.contains_key(key) {
                conn.execute(
                    "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                    params![key, default_value],
                )?;

                settings.insert(key.to_string(), default_value.to_string());
                println!("Set default for {}: {}", key, default_value);
            }
        }
        // release the lock
        drop(settings);

        Ok(())
    }

    pub fn get_setting(&self, key: &str) -> Option<String> {
        let settings = self.settings.lock().unwrap();
        settings.get(key).cloned()
    }

    pub fn set_setting(&self, key: &str, value: &str) -> Result<()> {
        let conn = self.get_connection()?;

        conn.execute(
            "INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)",
            params![key, value],
        )?;

        let mut settings = self.settings.lock().unwrap();
        settings.insert(key.to_string(), value.to_string());

        Ok(())
    }

    pub fn remove_setting(&self, key: &str) -> Result<()> {
        let conn = self.get_connection()?;

        conn.execute("DELETE FROM settings WHERE key = ?", params![key])?;

        let mut settings = self.settings.lock().unwrap();
        settings.remove(key);

        Ok(())
    }

    pub fn get_all_settings(&self) -> HashMap<String, String> {
        let settings = self.settings.lock().unwrap();
        settings.clone()
    }

    pub fn get_global_hotkey(&self) -> String {
        self.get_setting("global_hotkey")
            .unwrap_or_else(|| "CommandOrControl+Shift+C".to_string())
    }

    pub fn set_global_hotkey(&self, hotkey: &str) -> Result<()> {
        self.set_setting("global_hotkey", hotkey)
    }
}

pub struct SettingsManagerState(pub Arc<SettingsManager>);

pub fn init_settings(
    db_path: PathBuf,
    app_handle: AppHandle,
) -> std::result::Result<(), Box<dyn std::error::Error>> {
    let settings_manager = SettingsManager::new(db_path);
    settings_manager.initialize()?;

    app_handle.manage(SettingsManagerState(Arc::new(settings_manager)));

    println!("Settings initialized");
    Ok(())
}

#[tauri::command]
pub async fn get_setting(
    key: String,
    settings_manager: State<'_, SettingsManagerState>,
) -> Result<Option<String>, String> {
    let key = settings_manager.0.get_setting(&key);
    println!("the value {:?}", key);
    Ok(key)
}

#[tauri::command]
pub async fn set_setting(
    key: String,
    value: String,
    settings_manager: State<'_, SettingsManagerState>,
) -> Result<(), String> {
    settings_manager
        .0
        .set_setting(&key, &value)
        .map_err(|e| format!("Failed to set setting: {}", e))
}

#[tauri::command]
pub async fn get_all_settings(
    settings_manager: State<'_, SettingsManagerState>,
) -> Result<HashMap<String, String>, String> {
    Ok(settings_manager.0.get_all_settings())
}

#[tauri::command]
pub async fn set_global_hotkey(
    hotkey: String,
    settings_manager: State<'_, SettingsManagerState>,
    app: AppHandle,
) -> Result<(), String> {
    // Validate the hotkey string first
    if let Err(e) = crate::shortcut::parse_hotkey_string(&hotkey) {
        return Err(format!("Invalid hotkey format: {}", e));
    }

    // Save to database
    settings_manager
        .0
        .set_setting("global_hotkey", &hotkey)
        .map_err(|e| format!("Failed to save hotkey: {}", e))?;

    // Update the actual global shortcut
    update_global_shortcut(app, &hotkey)
        .map_err(|e| format!("Failed to register hotkey: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_global_hotkey(
    settings_manager: State<'_, SettingsManagerState>,
) -> Result<String, String> {
    Ok(settings_manager
        .0
        .get_setting("global_hotkey")
        .unwrap_or_else(|| "CommandOrControl+Shift+S".to_string()))
}

#[tauri::command]
pub async fn test_global_hotkey(hotkey: String) -> Result<(), String> {
    crate::shortcut::parse_hotkey_string(&hotkey).map_err(|e| format!("Invalid hotkey: {}", e))?;
    Ok(())
}

// Helper function to update the global shortcut
fn update_global_shortcut(
    app: AppHandle,
    hotkey_str: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    // Use the GlobalShortcutExt trait method for AppHandle
    let global_shortcut = app.global_shortcut();

    // Unregister all existing shortcuts
    global_shortcut.unregister_all()?;

    // Parse and register the new shortcut
    let shortcut = crate::shortcut::parse_hotkey_string(hotkey_str)?;
    global_shortcut.register(shortcut)?;

    Ok(())
}
