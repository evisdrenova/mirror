use crate::AppState;
use arboard::{Clipboard, ImageData};
use base64::{engine::general_purpose, Engine};
use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use global_hotkey::{hotkey, GlobalHotKeyEvent};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, thread, time::Duration};
use tauri::State;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[derive(Debug, Serialize, Deserialize)]
pub enum Clip {
    Text {
        plain: String,
    },
    Image {
        data: Vec<u8>,
        width: usize,
        height: usize,
    },
    // add in rich text format
    // add in html
}

pub fn handle_shortcut(db_path: &PathBuf, shortcut: &hotkey::HotKey, event: GlobalHotKeyEvent) {
    let conn = Connection::open(&db_path)
        .map_err(|e| {
            eprintln!("Failed to open database: {e}");
            return;
        })
        .unwrap();

    let sc = shortcut_hotkey().unwrap();

    if shortcut == &sc {
        match event.state {
            ShortcutState::Pressed => {
                println!("Meta+Shift+S Pressed!");
                handle_capture(&conn);
            }
            ShortcutState::Released => {
                println!("Meta+Shift+S Released!");
            }
        }
    }
}

pub fn shortcut_hotkey() -> Result<Shortcut, Box<dyn std::error::Error>> {
    let sc = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyS);
    Ok(sc)
}
#[cfg(target_os = "macos")]
fn simulate_copy() {
    let mut enigo = Enigo::new(&Settings::default()).unwrap();
    let _ = enigo.key(Key::Meta, Press);
    let _ = enigo.key(Key::Unicode('c'), Click);
    let _ = enigo.key(Key::Meta, Release);
}

pub fn handle_capture(conn: &Connection) {
    simulate_copy();

    thread::sleep(Duration::from_millis(120));

    if let Some(clip) = read_clipboard_with_retry(5, Duration::from_millis(100)) {
        debug_print_clip(&clip);
        match save_clip(conn, &clip) {
            Ok(()) => println!("Clip saved successfully"),
            Err(e) => eprintln!("Failed to save clip: {}", e),
        }
    } else {
        println!("[clipper] Nothing captured (no selection or copy failed).");
    }
}

fn read_clipboard_with_retry(attempts: usize, delay: Duration) -> Option<Clip> {
    let mut last_len: Option<usize> = None;

    for i in 0..attempts {
        if let Some(clip) = read_clipboard_once() {
            // compare lengths for text / byte size for image
            let cur_len = match &clip {
                Clip::Text { plain } => plain.len(),
                Clip::Image { data, .. } => data.len(),
            };

            if last_len.is_none() || last_len != Some(cur_len) || i == attempts - 1 {
                return Some(clip);
            }
            last_len = Some(cur_len);
        }

        thread::sleep(delay);
    }
    None
}

fn read_clipboard_once() -> Option<Clip> {
    let mut cb = Clipboard::new().ok()?;

    if let Ok(txt) = cb.get_text() {
        return Some(Clip::Text { plain: txt });
    }

    if let Ok(ImageData {
        bytes,
        width,
        height,
    }) = cb.get_image()
    {
        return Some(Clip::Image {
            data: bytes.into_owned(),
            width,
            height,
        });
    }

    None
}

fn debug_print_clip(clip: &Clip) {
    match clip {
        Clip::Text { plain } => {
            let preview: String = plain.chars().take(80).collect();
            println!(
                "[clipper] Captured TEXT ({} chars): \"{}{}\"",
                plain.len(),
                preview,
                if plain.len() > 80 { "…" } else { "" }
            );
        }
        Clip::Image {
            data,
            width,
            height,
        } => {
            println!(
                "[clipper] Captured IMAGE {}x{} ({} bytes).",
                width,
                height,
                data.len()
            );
        }
    }
}

fn save_clip(conn: &Connection, clip: &Clip) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain
            })
        }
        Clip::Image {
            data,
            width,
            height,
        } => {
            let b64 = general_purpose::STANDARD.encode(data);
            println!("{}", b64);
            serde_json::json!({
                "type": "image",
                "content": b64,
                "width": width,
                "height": height
            })
        }
    };

    conn.execute(
        "INSERT INTO clips(clip) VALUES (?)",
        params![json_data.to_string()],
    )?;

    println!("Saved clip");
    Ok(())
}

#[derive(Debug, Serialize)]
pub struct ClipItem {
    id: i64,
    clip: Clip,
    created_at: String,
}

#[tauri::command]
pub async fn get_items(state: State<'_, AppState>) -> Result<Vec<ClipItem>, String> {
    println!("get_items called!");
    let conn =
        Connection::open(&state.db_path).map_err(|e| format!("Failed to open database: {e}"))?;

    let mut stmt = conn
        .prepare(
            r#"
        SELECT
          id,
          clip,
          created_at
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

            let clip_value: serde_json::Value = serde_json::from_str(&clip_json).map_err(|e| {
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
            })
        })
        .map_err(|e| format!("Failed to execute query: {e}"))?;

    let mut items = Vec::new();
    for item in clip_iter {
        items.push(item.map_err(|e| format!("Failed to process row: {e}"))?);
    }

    println!("items {:?}", items);

    Ok(items)
}
