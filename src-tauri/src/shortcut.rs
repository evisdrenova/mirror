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
use tauri::{async_runtime, AppHandle, Emitter};
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
                println!("Meta+Shift+S Pressed!");
                handle_capture(app_handle, &db_path);
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

pub fn handle_capture(app: &AppHandle, db_path: &PathBuf) {
    simulate_copy();
    thread::sleep(Duration::from_millis(120));

    if let Some(clip) = read_clipboard_with_retry(5, Duration::from_millis(100)) {
        debug_print_clip(&clip);

        let app_handle = app.clone();
        let conn_path = db_path.clone();

        async_runtime::spawn(async move {
            match save_clip(&app_handle, &conn_path, &clip).await {
                Ok(()) => println!("Clip saved successfully"),
                Err(e) => eprintln!("Failed to save clip: {}", e),
            }
        });
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

async fn save_clip(
    app_handle: &AppHandle,
    db_path: &PathBuf,
    clip: &Clip,
) -> Result<(), Box<dyn std::error::Error>> {
    let category = llm::call_llm(clip).await.unwrap_or_else(|e| {
        eprintln!("Failed to categorize clip: {}", e);
        "uncategorized".to_string()
    });

    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain,
                "category": category
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
                "category": category
            })
        }
    };

    let conn = Connection::open(db_path)?;

    conn.execute(
        "INSERT INTO clips(clip) VALUES (?)",
        params![json_data.to_string()],
    )?;

    app_handle.emit("clip-saved", {}).unwrap();

    Ok(())
}
