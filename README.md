## Mirror

![sc](./image.png)

**Mirror** is currently only supported on Mac with windows/linux support in progress. Mirror is an AI-assisted clipboard & snippet manager built with **Tauri (Rust back-end) + React 18/Tailwind (front-end)**.
It quietly watches your clipboard, stores every text in a local SQLite database, and calls an LLM to **auto-categorise, summarise, and tag** each item. A lightning-fast virtualised grid lets you search, filter, and paste any past clip in a couple of keystrokes.

| Feature                  | What it does                                                                                     |
| ------------------------ | ------------------------------------------------------------------------------------------------ |
| 🧠 **Auto-AI** (opt-in)  | Sends the new clip to OpenAI (or your own LLM endpoint) for category, summary & tags.            |
| 🔍 **Instant search**    | Fuzzy-search by plain text **or** tags; 10k+ clips stay smooth thanks to TanStack React Virtual. |
| 🏷 **Auto-sorting**       | Rules engine (JSON) moves items into folders/categories as they arrive.                          |
| ⌨️ **Global hotkeys**    | `Ctrl+Shift+V` saves the text;                                                                   |
| 🌗 **Tauri desktop app** | Native tray icon, zero Electron weight, small memory footprint.                                  |

## Quick start

> **Prerequisites**
>
> - Node 18 + npm
> - Rust toolchain (stable)
> - Tauri CLI: `cargo install tauri-cli --locked`
> - (optional) `OPENAI_API_KEY` if you want AI tagging

```bash
git clone https://github.com/evisdrenova/mirror.git
cd mirror

# 1. install JS deps & Tauri binaries (~3-5 min)
npm install            # uses Vite + Radix UI stack

# 2. run in dev mode (hot-reload Rust + React)
npm run tauri dev
```

First launch creates `~/.mirror/mirror.db` and starts listening to your clipboard.

---

## Configuration

| File   | What to change   |
| ------ | ---------------- |
| `.env` | `OPENAI_API_KEY` |

---

## Roadmap

- [ ] **image support**
- [ ] **dynamic category creation**
- [ ] **sync with other backends like obsidian**
- [ ] **dark mode**
- [ ] **better responsiveness**

Contributions & bug reports are welcome—open an Issue or drop a PR!
