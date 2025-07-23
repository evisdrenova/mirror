use crate::llm;
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
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindowBuilder};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[derive(Debug, Serialize, Deserialize, Clone)]
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

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipMetadata {
    pub clip_json: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct ClipContext {
    pub content_preview: String,
    pub suggested_category: Option<String>,
    pub user_category: Option<String>,
    pub user_notes: Option<String>,
}

pub fn handle_shortcut(
    app_handle: &AppHandle,
    db_path: &PathBuf,
    shortcut: &hotkey::HotKey,
    event: GlobalHotKeyEvent,
) {
    let sc = shortcut_hotkey().unwrap();

    if shortcut == &sc {
        match event.state {
            ShortcutState::Pressed => {
                println!("shortcut pressed!");
                handle_capture(app_handle);
            }
            ShortcutState::Released => {
                println!("shortcut released!");
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
    // meta is the command on mac
    let _ = enigo.key(Key::Meta, Press);
    let _ = enigo.key(Key::Unicode('c'), Click);
    let _ = enigo.key(Key::Meta, Release);
}

pub fn handle_capture(app: &AppHandle) {
    simulate_copy();
    thread::sleep(Duration::from_millis(120));

    if let Some(clip) = read_clipboard_with_retry(5, Duration::from_millis(50)) {
        debug_print_clip(&clip);

        let content_preview = match &clip {
            Clip::Text { plain } => {
                if plain.len() > 100 {
                    format!("{}...", &plain[..100])
                } else {
                    plain.clone()
                }
            }
            Clip::Image { width, height, .. } => {
                format!("Image {}x{}", width, height)
            }
        };

        launch_toolbar(app, clip, content_preview);
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

fn launch_toolbar(app: &AppHandle, clip: Clip, content_preview: String) {
    // close any other pop up first
    if let Some(existing_window) = app.get_webview_window("clip-toolbar") {
        existing_window.close().ok();
    }

    // Create a small popup window
    let window =
        WebviewWindowBuilder::new(app, "clip-toolbar", WebviewUrl::App("toolbar.html".into()))
            .title("Add Context to Clip")
            .inner_size(800.0, 45.0)
            .resizable(true)
            .center()
            .always_on_top(true)
            .skip_taskbar(true)
            .decorations(false)
            .transparent(true)
            .shadow(true)
            .build();

    if let Ok(window) = window {
        // Send clip metadata to the React component
        let metadata = ClipMetadata {
            clip_json: serde_json::to_string(&clip).unwrap(),
        };

        if let Err(e) = window.emit("clip-metadata", &metadata) {
            eprintln!("Failed to emit clip metadata: {}", e);
        }

        // Get AI suggestion in background
        tauri::async_runtime::spawn(async move {
            let suggested_category = llm::get_llm_category(&clip).await.ok();

            let context = ClipContext {
                content_preview,
                suggested_category,
                user_category: None,
                user_notes: None,
            };

            // Send AI suggestion to the React component
            if let Err(e) = window.emit("clip-data", &context) {
                eprintln!("Failed to emit clip data: {}", e);
            }
        });
    }
}

pub async fn save_clip(
    app_handle: &AppHandle,
    db_path: &PathBuf,
    clip: &Clip,
    category: &str,
    notes: Option<String>,
) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain,
                "category": category,
                "notes": notes
            })
        }
        Clip::Image {
            data,
            width,
            height,
        } => {
            let b64 = general_purpose::STANDARD.encode(data);
            serde_json::json!({
                "type": "image",
                "content": b64,
                "width": width,
                "height": height,
                "category": category,
                "notes": notes
            })
        }
    };

    let conn = Connection::open(db_path)?;

    conn.execute(
        "INSERT INTO clips(clip, category, notes) VALUES (?,?,?)",
        params![json_data.to_string(), category, notes],
    )?;

    app_handle.emit("clip-saved", {}).unwrap();

    Ok(())
}

// pub async fn get_llm_category(clip: &Clip) -> Result<String, Box<dyn std::error::Error>> {
//     let category = llm::get_llm_category(clip).await.unwrap_or_else(|e| {
//         eprintln!("Failed to categorize clip: {}", e);
//         "uncategorized".to_string()
//     });

//     Ok(category)
// }
