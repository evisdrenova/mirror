use crate::shortcut::{save_clip, Clip};
use crate::AppState;
use base64::{engine::general_purpose, Engine};
use rusqlite::{params, Connection};
use serde::Serialize;

use tauri::{Emitter, Manager, State};

#[derive(Debug, Serialize)]
pub struct ClipItem {
    id: i64,
    clip: Clip,
    created_at: String,
    category: Option<String>,
    summary: Option<String>,
}

#[tauri::command]
pub async fn get_items(state: State<'_, AppState>) -> Result<Vec<ClipItem>, String> {
    let conn =
        Connection::open(&state.db_path).map_err(|e| format!("Failed to open database: {e}"))?;

    let mut stmt = conn
        .prepare(
            r#"

        SELECT
          id,
          clip,
          created_at,
          category,
          summary
        FROM clips
        ORDER BY created_at DESC
        "#,
        )
        .map_err(|e| format!("Failed to prepare statement: {e}"))?;

    let clip_iter = stmt
        .query_map([], |row| {
            let id = row.get(0)?;
            let clip_json: String = row.get(1)?;
            let created_at: String = row.get(2)?;
            let category: Option<String> = row.get(3).ok();
            let summary: Option<String> = row.get(4).ok();

            let clip_value: serde_json::Value = serde_json::from_str(&clip_json).map_err(|_| {
                rusqlite::Error::InvalidColumnType(
                    0,
                    "Invalid JSON".to_string(),
                    rusqlite::types::Type::Text,
                )
            })?;

            let clip = match clip_value["type"].as_str() {
                Some("text") => Clip::Text {
                    plain: clip_value["content"].as_str().unwrap_or("").to_string(),
                },
                Some("image") => {
                    let base64_data = clip_value["content"].as_str().unwrap_or("");
                    let data = general_purpose::STANDARD.decode(base64_data).map_err(|_| {
                        rusqlite::Error::InvalidColumnType(
                            0,
                            "Invalid base64".to_string(),
                            rusqlite::types::Type::Text,
                        )
                    })?;
                    let width = clip_value["width"].as_u64().unwrap_or(0) as usize;
                    let height = clip_value["height"].as_u64().unwrap_or(0) as usize;

                    Clip::Image {
                        data,
                        width,
                        height,
                    }
                }
                _ => Clip::Text {
                    plain: "Invalid clip type".to_string(),
                },
            };

            Ok(ClipItem {
                id,
                clip,
                created_at,
                category,
                summary,
            })
        })
        .map_err(|e| format!("Failed to execute query: {e}"))?;

    let mut items: Vec<ClipItem> = Vec::new();
    for item in clip_iter {
        items.push(item.map_err(|e| format!("Failed to process row: {e}"))?);
    }

    Ok(items)
}

#[tauri::command]
pub async fn submit_clip(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    user_category: String,
    summary: String,
    clip_json: String,
) -> Result<(), String> {
    let db_path = &state.db_path;

    let clip: Clip = serde_json::from_str(&clip_json)
        .map_err(|e| format!("Failed to deserialize clip: {}", e))?;

    save_clip(&app_handle, db_path, &clip, &user_category, &summary)
        .await
        .map_err(|e| format!("Failed to save clip: {}", e))?;

    // Close the popup window
    if let Some(window) = app_handle.get_webview_window("clip-toolbar") {
        window.close().ok();
    }

    Ok(())
}

// #[tauri::command]
// pub fn close_toolbar_window(app_handle: tauri::AppHandle) -> Result<(), String> {
//     if let Some(window) = app_handle.get_webview_window("clip-toolbar") {
//         window.close().map_err(|e| e.to_string())?;
//     }
//     Ok(())
// }

#[tauri::command]
pub fn delete_item(
    app_handle: tauri::AppHandle,
    state: State<'_, AppState>,
    item_id: i64,
) -> Result<(), String> {
    println!("here");
    let conn =
        Connection::open(&state.db_path).map_err(|e| format!("Failed to open database: {e}"))?;

    println!("itemid{}", item_id);

    let rows_affected = conn
        .execute("DELETE FROM clips WHERE id = ?", params![item_id])
        .map_err(|error| format!("Failed to delete item: {}", error))?;

    if rows_affected == 0 {
        return Err("Item not found".to_string());
    }

    app_handle
        .emit("clip-deleted", &item_id)
        .map_err(|e| format!("Failed to emit event: {}", e))?;

    Ok(())
}
