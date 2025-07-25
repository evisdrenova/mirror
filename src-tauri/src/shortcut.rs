use crate::llm;
use arboard::{Clipboard, ImageData};
use base64::{engine::general_purpose, Engine};
use core_graphics::event::CGEvent;
use core_graphics::event_source::{CGEventSource, CGEventSourceStateID};
use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use global_hotkey::{hotkey, GlobalHotKeyEvent};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::{path::PathBuf, thread, time::Duration};
use tauri::{
    AppHandle, Emitter, LogicalPosition, Manager, WebviewUrl, WebviewWindowBuilder, WindowEvent,
};
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
pub struct ClipContext {
    pub suggested_category: Option<String>,
    pub clip: Clip,
}

pub fn handle_shortcut(
    app_handle: &AppHandle,
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
    let _ = enigo.key(Key::Meta, Press);
    let _ = enigo.key(Key::Unicode('c'), Click);
    let _ = enigo.key(Key::Meta, Release);
}

pub fn handle_capture(app: &AppHandle) {
    simulate_copy();
    let cursor_pos = get_cursor_position();
    thread::sleep(Duration::from_millis(120));
    if let Some(clip) = read_clipboard_with_retry(5, Duration::from_millis(50)) {
        debug_print_clip(&clip);

        launch_toolbar(app, clip, cursor_pos);
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

fn launch_toolbar(app: &AppHandle, clip: Clip, cursor_pos: Option<(f64, f64)>) {
    let clip_for_llm = clip.clone();
    let clip_for_emit = clip.clone();
    // start async llm call right away
    let llm_future =
        tauri::async_runtime::spawn(async move { llm::get_llm_category(&clip_for_llm).await.ok() });

    if let Some(existing_window) = app.get_webview_window("clip-toolbar") {
        existing_window.close().ok();
    }

    let window =
        WebviewWindowBuilder::new(app, "clip-toolbar", WebviewUrl::App("toolbar.html".into()))
            .title("Add Context to Clip")
            .inner_size(280.0, 45.0)
            .resizable(true)
            .always_on_top(true)
            .skip_taskbar(true)
            .decorations(false)
            .transparent(true)
            .shadow(true)
            .visible(false)
            .build();

    if let Ok(window) = window {
        let window_for_focus = window.clone();
        window.on_window_event(move |event| {
            match event {
                WindowEvent::Focused(false) => {
                    // Window lost focus - close it
                    println!("Toolbar lost focus, closing...");
                    window_for_focus.close().ok();
                }
                _ => {}
            }
        });

        // Position window based on cursor location
        let window_clone = window.clone();
        tauri::async_runtime::spawn(async move {
            if let Some((cursor_x, cursor_y)) = cursor_pos {
                // Position window below and slightly to the right of cursor
                let window_x = cursor_x + 15.0; // Small offset to avoid covering cursor
                let window_y = cursor_y + 25.0; // Position below cursor/selected text

                // Ensure window stays on screen
                if let Ok(Some(monitor)) = window_clone.current_monitor() {
                    let monitor_size = monitor.size();
                    let monitor_pos = monitor.position();

                    // Window dimensions (f64 for calculations)
                    let window_width = 400.0;
                    let window_height = 200.0;

                    // Calculate screen bounds (convert to f64)
                    let max_x = monitor_pos.x as f64 + monitor_size.width as f64 - window_width;
                    let max_y = monitor_pos.y as f64 + monitor_size.height as f64 - window_height;

                    // Clamp to screen bounds
                    let final_x = window_x.min(max_x).max(monitor_pos.x as f64);
                    let final_y = window_y.min(max_y).max(monitor_pos.y as f64);

                    println!("Positioning window at: ({}, {})", final_x, final_y);

                    let logical_pos = LogicalPosition::new(final_x, final_y);
                    if let Err(e) = window_clone.set_position(logical_pos) {
                        eprintln!("Failed to set window position: {}", e);
                    }
                } else {
                    // Fallback positioning if monitor detection fails
                    let logical_pos = LogicalPosition::new(window_x, window_y);
                    let _ = window_clone.set_position(logical_pos);
                }
            } else {
                println!("Could not get cursor position, centering window");
                let _ = window_clone.center();
            }

            let _ = window_clone.show();
        });
        tauri::async_runtime::spawn(async move {
            let suggested_category = match llm_future.await {
                Ok(result) => result,
                Err(e) => {
                    eprintln!("LLM task failed: {}", e);
                    None
                }
            };

            let clip_context = ClipContext {
                suggested_category,
                clip: clip_for_emit,
            };

            if let Err(e) = window.emit("clip-data", &clip_context) {
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
) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain,
                "category": category,
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
            })
        }
    };

    let conn = Connection::open(db_path)?;

    conn.execute(
        "INSERT INTO clips(clip, category) VALUES (?,?)",
        params![json_data.to_string(), category],
    )?;

    app_handle.emit("clip-saved", {}).unwrap();

    Ok(())
}

#[cfg(target_os = "macos")]
pub fn get_cursor_position() -> Option<(f64, f64)> {
    let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok()?;
    let event = CGEvent::new(source).ok()?;
    let loc = event.location();
    Some((loc.x, loc.y))
}
