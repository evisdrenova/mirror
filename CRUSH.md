# CRUSH.md

## Project Commands

# Frontend (Vite + React)
npm run dev             # Start dev server
npm run build           # Build production bundle (also runs tsc)
npm run preview         # Preview production build

# Backend (Tauri + Rust)
cargo test              # Run all Rust tests
cargo test -- --nocapture <test_name>  # Run a single Rust test
cd src-tauri && cargo test -- <test_name>  # Single test in src-tauri

# Linting & Type Checking
npx eslint "src/**/*.{ts,tsx}"   # Run ESLint (if configured)
npx tsc --noEmit                   # TypeScript type check

## Code Style Guidelines

1. Formatting: use Prettier defaults (via Vite) for JS/TS and Tailwind CSS.
2. Imports:
   - External packages first, then absolute project imports (/src), then relative imports.
   - One blank line between groups.
3. Components & Naming:
   - React components in PascalCase, files match component name.
   - Hooks and utilities in camelCase.
   - Types & interfaces in PascalCase, prefixed with `I` or descriptive names.
4. Types:
   - Always type function params and return values.
   - Prefer `unknown` over `any`; narrow before use.
5. Error Handling:
   - Use `try/catch` around async calls, log via `console.error` or display UI error states.
6. CSS & Tailwind:
   - Use utility classes, avoid inline styles.
   - Keep global styles in `globals.css` and `App.css`.

## Cursor & Copilot Rules

- No custom Cursor rules in `.cursor/rules` or `.cursorrules`.
- No Copilot rules in `.github/copilot-instructions.md`.

💘 Generated with Crush