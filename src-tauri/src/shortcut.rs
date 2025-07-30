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
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState};
use url::Url;

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
    thread::sleep(Duration::from_millis(120));
    if let Some(clip) = read_clipboard_with_retry(5, Duration::from_millis(50)) {
        let db_path = app.state::<crate::AppState>().db_path.clone();

        let app_handle = app.clone();
        let clip_clone = clip.clone();
        tauri::async_runtime::spawn(async move {
            let category = match llm::get_llm_category(&clip_clone).await {
                Ok(suggested_category) => suggested_category,
                Err(e) => {
                    eprintln!("LLM categorization failed: {}", e);
                    "Uncategorized".to_string()
                }
            };

            let mut url_summary: String = String::new();

            match &clip_clone {
                Clip::Text { plain } => {
                    if is_url(plain) {
                        println!("this is a url");

                        match llm::get_clip_summary(&clip_clone).await {
                            Ok(suggested_summary) => url_summary = suggested_summary,
                            Err(e) => {
                                eprintln!("LLM summarization failed: {}", e);
                                url_summary = "No summary available".to_string();
                            }
                        };
                    }
                }
                _ => {}
            }

            // Now actually use the summary somewhere
            if !url_summary.is_empty() {
                println!("URL Summary: {}", url_summary);
                // Or save it to database, return it, etc.
            }

            if let Err(e) =
                save_clip(&app_handle, &db_path, &clip_clone, &category, &url_summary).await
            {
                eprintln!("Failed to save clip: {}", e);
            } else {
                println!("Clip saved to category: {}", category);
            }
        });
    } else {
        println!("[clipper] Nothing captured (no selection or copy failed).");
    }
}

pub fn is_url(text: &str) -> bool {
    match Url::parse(text) {
        Ok(url) => {
            matches!(url.scheme(), "http" | "https")
        }
        Err(_) => false,
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

// use std::sync::atomic::{AtomicBool, Ordering};
// static MAIN_WAS_VISIBLE: AtomicBool = AtomicBool::new(false);

// fn launch_toolbar(app: &AppHandle, clip: Clip, cursor_pos: Option<(f64, f64)>) {
//     let clip_for_llm = clip.clone();
//     let clip_for_emit = clip.clone();

//     // start async llm call right away
//     let llm_future =
//         tauri::async_runtime::spawn(async move { llm::get_llm_category(&clip_for_llm).await.ok() });

//     // Close any existing toolbar window
//     // if let Some(main_window) = app.get_webview_window("main") {
//     //     let was_visible = main_window.is_visible().unwrap_or(false);
//     //     MAIN_WAS_VISIBLE.store(was_visible, Ordering::Relaxed);

//     //     if was_visible {
//     //         main_window.hide().ok();
//     //     }
//     // }

//     let main_window_info = if let Some(main_window) = app.get_webview_window("main") {
//         Some((
//             main_window.is_visible().unwrap_or(false),
//             main_window.is_focused().unwrap_or(false),
//             main_window.is_minimized().unwrap_or(false),
//         ))
//     } else {
//         None
//     };

//     let window =
//         WebviewWindowBuilder::new(app, "clip-toolbar", WebviewUrl::App("toolbar.html".into()))
//             .title("Add Context to Clip")
//             .inner_size(280.0, 45.0)
//             .resizable(true)
//             .always_on_top(true)
//             .skip_taskbar(true)
//             .decorations(false)
//             .transparent(true)
//             .shadow(true)
//             .visible(false)
//             .focused(false)
//             .accept_first_mouse(true)
//             .build();

//     if let Ok(window) = window {
//         let window_for_focus = window.clone();
//         window.on_window_event(move |event| {
//             match event {
//                 WindowEvent::Focused(false) => {
//                     // Window lost focus - close it
//                     println!("Toolbar lost focus, closing...");
//                     window_for_focus.close().ok();
//                 }
//                 _ => {}
//             }
//         });

//         // let app_handle = app.clone();
//         // window.on_window_event(move |ev| {
//         //     if let WindowEvent::CloseRequested { .. } = ev {
//         //         if MAIN_WAS_VISIBLE.load(Ordering::Relaxed) {
//         //             if let Some(main) = app_handle.get_webview_window("main") {
//         //                 let _ = main.show();
//         //                 let _ = main.set_focus();
//         //             }
//         //         }
//         //     }
//         // });

//         // Position window based on cursor location
//         let window_clone = window.clone();
//         let app_clone = app.clone();
//         tauri::async_runtime::spawn(async move {
//             if let Some((cursor_x, cursor_y)) = cursor_pos {
//                 // Position window below and slightly to the right of cursor
//                 let window_x = cursor_x + 15.0; // Small offset to avoid covering cursor
//                 let window_y = cursor_y + 25.0; // Position below cursor/selected text

//                 // Ensure window stays on screen
//                 if let Ok(Some(monitor)) = window_clone.current_monitor() {
//                     let monitor_size = monitor.size();
//                     let monitor_pos = monitor.position();

//                     // Window dimensions (f64 for calculations)
//                     let window_width = 400.0;
//                     let window_height = 200.0;

//                     // Calculate screen bounds (convert to f64)
//                     let max_x = monitor_pos.x as f64 + monitor_size.width as f64 - window_width;
//                     let max_y = monitor_pos.y as f64 + monitor_size.height as f64 - window_height;

//                     // Clamp to screen bounds
//                     let final_x = window_x.min(max_x).max(monitor_pos.x as f64);
//                     let final_y = window_y.min(max_y).max(monitor_pos.y as f64);

//                     println!("Positioning window at: ({}, {})", final_x, final_y);

//                     let logical_pos = LogicalPosition::new(final_x, final_y);
//                     if let Err(e) = window_clone.set_position(logical_pos) {
//                         eprintln!("Failed to set window position: {}", e);
//                     }
//                 } else {
//                     // Fallback positioning if monitor detection fails
//                     let logical_pos = LogicalPosition::new(window_x, window_y);
//                     window_clone.set_position(logical_pos).ok();
//                 }
//             } else {
//                 println!("Could not get cursor position, centering window");
//                 window_clone.center().ok();
//             }

//             // Show and focus only the popup window
//             window_clone.show().ok();
//             window_clone.set_focus().ok();

//             if let (Some(main_window), Some((was_visible, was_focused, was_minimized))) =
//                 (app_clone.get_webview_window("main"), main_window_info)
//             {
//                 // If main window was brought forward unintentionally, push it back
//                 if was_visible {
//                     // Use a trick: temporarily minimize and restore if it wasn't originally minimized
//                     if !was_minimized && !was_focused {
//                         // Send it to back by minimizing and then showing without focus
//                         main_window.minimize().ok();
//                         tokio::time::sleep(tokio::time::Duration::from_millis(50)).await;
//                         main_window.show().ok();
//                         // Don't set focus - let it stay in background
//                     }
//                 }
//             }
//         });

//         tauri::async_runtime::spawn(async move {
//             let suggested_category = match llm_future.await {
//                 Ok(result) => result,
//                 Err(e) => {
//                     eprintln!("LLM task failed: {}", e);
//                     None
//                 }
//             };

//             let clip_context = ClipContext {
//                 suggested_category,
//                 clip: clip_for_emit,
//             };
//             println!("sending clip data");

//             if let Err(e) = window.emit("clip-data", &clip_context) {
//                 eprintln!("Failed to emit clip data: {}", e);
//             }
//         });
//     }
// }

pub async fn save_clip(
    app_handle: &AppHandle,
    db_path: &PathBuf,
    clip: &Clip,
    category: &str,
    summary: &str,
) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain,
                "category": category,
                "summary": summary
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
                "summary": summary
            })
        }
    };

    let conn = Connection::open(db_path)?;

    conn.execute(
        "INSERT INTO clips(clip, category, summary) VALUES (?,?,?)",
        params![json_data.to_string(), category, summary],
    )?;

    app_handle.emit("clip-saved", {}).unwrap();

    Ok(())
}

// #[cfg(target_os = "macos")]
// pub fn get_cursor_position() -> Option<(f64, f64)> {
//     let source = CGEventSource::new(CGEventSourceStateID::HIDSystemState).ok()?;
//     let event = CGEvent::new(source).ok()?;
//     let loc = event.location();
//     Some((loc.x, loc.y))
// }
