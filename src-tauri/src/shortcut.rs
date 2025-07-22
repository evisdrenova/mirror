use arboard::{Clipboard, ImageData};
use base64::{engine::general_purpose, Engine as _};

use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use global_hotkey::{hotkey, GlobalHotKeyEvent};
use rusqlite::{params, Connection};
use std::{path::PathBuf, thread, time::Duration};

use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};

#[derive(Debug)]
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

    let sc = shortcut_hotkey().unwrap(); // Handle error properly in real code

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
