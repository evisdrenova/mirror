use global_hotkey::{hotkey, GlobalHotKeyEvent};

use tauri::Result;
use tauri_plugin_global_shortcut::{Code, Modifiers, Shortcut, ShortcutState, ShortcutWrapper};

pub fn handle_shortcut(shortcut: &hotkey::HotKey, event: GlobalHotKeyEvent) -> Result<()> {
    // meta here is the command key on mac or the windows key on windows
    let sc = shortcut_hotkey()?;
    println!("{:?}", shortcut);

    if shortcut == &sc {
        match event.state() {
            ShortcutState::Pressed => {
                println!("Ctrl-N Pressed!");
            }
            ShortcutState::Released => {
                println!("Ctrl-N Released!");
            }
        }
    }

    Ok(())
}

pub fn shortcut_hotkey() -> Result<hotkey::HotKey> {
    let sc = Shortcut::new(Some(Modifiers::META | Modifiers::SHIFT), Code::KeyS);

    Ok(sc)
}

// fn read_clipboard() -> Option<Clip> {
//     let mut clipboard = arboard::Clipboard::new().ok()?;

//     if let Ok(text) = clipboard.get_text() {
//         return Some(Clip::Text {
//             plain: text.clone(),
//             html: maybe_html(&text),
//         });
//     }

//     if let Ok(img) = clipboard.get_image() {
//         return Some(Clip::Image {
//             data: img.bytes.into_owned(),
//         });
//     }
//     None
// }
