use crate::llm;
use arboard::{Clipboard, ImageData};
use base64::{engine::general_purpose, Engine};
use enigo::{
    Direction::{Click, Press, Release},
    Enigo, Key, Keyboard, Settings,
};
use global_hotkey::{hotkey, GlobalHotKeyEvent};
use image::{ImageBuffer, ImageFormat, Rgba};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::io::Cursor;
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
        data: String,
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
                handle_capture(app_handle);
            }
            _ => {}
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
            // Get category and tags from LLM
            let (category, tags) = match llm::get_llm_category(&clip_clone).await {
                Ok(category_response) => (category_response.category, category_response.tags),
                Err(e) => {
                    eprintln!("LLM categorization failed: {}", e);
                    ("other".to_string(), vec!["uncategorized".to_string()])
                }
            };

            let mut summary: String = String::new();

            match &clip_clone {
                Clip::Text { plain } => {
                    if is_url(plain) {
                        println!("this is a url");

                        match llm::get_clip_summary(&clip_clone).await {
                            Ok(suggested_summary) => summary = suggested_summary,
                            Err(e) => {
                                eprintln!("LLM summarization failed: {}", e);
                                summary = "No summary available".to_string();
                            }
                        };
                    }
                }
                Clip::Image {
                    data,
                    width,
                    height,
                } => {
                    println!("this is a clip");
                }
            }

            // Log the results
            if !summary.is_empty() {
                println!("Summary: {}", summary);
            }
            println!("Category: {}", category);
            println!("Tags: {:?}", tags);

            // Save clip with category, tags, and summary
            if let Err(e) = save_clip(
                &app_handle,
                &db_path,
                &clip_clone,
                &category,
                &summary,
                &tags,
            )
            .await
            {
                eprintln!("Failed to save clip: {}", e);
            } else {
                println!("Clip saved to category: {} with tags: {:?}", category, tags);
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
        // clipboard returns raw rgba pixels which we need to convert into a png to then base64 encode it and save it.
        let png_data = match raw_pixels_to_png(&bytes, width, height) {
            Ok(data) => data,
            Err(e) => {
                eprintln!("Failed to convert pixels to PNG: {}", e);
                return None;
            }
        };

        let base64_data = general_purpose::STANDARD.encode(&png_data);

        return Some(Clip::Image {
            data: base64_data,
            width,
            height,
        });
    }

    None
}

fn raw_pixels_to_png(
    pixels: &[u8],
    width: usize,
    height: usize,
) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img_buffer = ImageBuffer::<Rgba<u8>, _>::from_raw(width as u32, height as u32, pixels)
        .ok_or("Failed to create image buffer")?;

    let mut png_data = Vec::new();
    let mut cursor = Cursor::new(&mut png_data);

    img_buffer.write_to(&mut cursor, ImageFormat::Png)?;

    Ok(png_data)
}

pub async fn save_clip(
    app_handle: &AppHandle,
    db_path: &PathBuf,
    clip: &Clip,
    category: &str,
    summary: &str,
    tags: &[String],
) -> Result<(), Box<dyn std::error::Error>> {
    let json_data = match clip {
        Clip::Text { plain } => {
            serde_json::json!({
                "type": "text",
                "content": plain,
                "category": category,
                "summary": summary,
                "tags": tags
            })
        }
        Clip::Image {
            data,
            width,
            height,
        } => {
            // let b64 = general_purpose::STANDARD.encode(data);
            serde_json::json!({
                "type": "image",
                "content": data,
                "width": width,
                "height": height,
                "category": category,
                "summary": summary
            })
        }
    };

    // Convert tags to JSON string
    let tags_json = serde_json::to_string(tags)?;

    let conn = Connection::open(db_path)?;

    conn.execute(
        "INSERT INTO clips(clip, category, summary, tags) VALUES (?,?,?,?)",
        params![json_data.to_string(), category, summary, tags_json],
    )?;

    app_handle.emit("clip-saved", {}).unwrap();

    Ok(())
}
