# Anvil

A Windows-only Tauri 2 desktop app for selecting and launching Claude Code CLI sessions in tabbed terminals.

## Quick Start

- Development: `cargo tauri dev` (or `dev.bat`)
- Build: `cargo tauri build`
- DevTools: `cargo tauri dev --features devtools`
- Frontend dir: `cd app && npm install`

## Tech Stack

- **Frontend**: React 19 + TypeScript 5 + Vite 6 (in `app/`)
- **Backend**: Rust + Tauri 2 (in `app/src-tauri/`)
- **Terminal**: xterm.js 5.5 with WebGL renderer
- **Themes**: 10 dark themes (Catppuccin Mocha default), selectable via F9

## Key Paths

- `app/src/components/` - TabBar, Terminal, ProjectList, StatusBar, NewTabPage, AboutPage, Modal, ErrorBoundary
- `app/src/hooks/` - useTabManager, useProjects, usePty
- `app/src/contexts/ProjectsContext.tsx` - Shared project state
- `app/src/themes.ts` - Theme application to CSS variables and xterm
- `app/src/types.ts` - Type definitions, model/effort/sort/theme constants
- `app/src-tauri/src/` - Rust backend: main.rs, pty.rs, projects.rs, commands.rs, tools.rs, session.rs, logging.rs

For detailed architecture, IPC protocol, and development guide, see `docs/TECHNICAL.md`.

## Tools (F1 to cycle)

- `claude` - Claude Code CLI (`@anthropic-ai/claude-code`)
- `gemini` - Gemini CLI (`@google/gemini-cli`); model/effort/perms hidden when selected

## Models (Tab to cycle, Claude only)

sonnet / opus / haiku / sonnet [1M] / opus [1M]

## Keyboard Shortcuts

- **Ctrl+T**: New tab
- **Ctrl+F4**: Close tab
- **Ctrl+Tab / Ctrl+Shift+Tab**: Next/previous tab
- **F1**: Cycle tool (claude/gemini)
- **Tab**: Cycle model (Claude only)
- **F2**: Cycle effort level (high/medium/low, Claude only)
- **F3**: Cycle sort order (alpha/last used/most used)
- **F4**: Toggle skip-permissions
- **F5**: Create new project
- **F6**: Open project in Explorer
- **F7**: Manage project directories
- **F8**: Label selected project
- **F9**: Theme picker
- **F10**: Quick launch (arbitrary directory)
- **F11**: Font settings
- **F12**: About page
- **Enter**: Launch selected project
- **Esc**: Clear filter / close tab
- **Backspace**: Delete last filter character
- **Type to filter**: Case-insensitive project search
- **Arrow keys / PageUp / PageDown / Home / End**: Navigate project list

## Design Tokens

CSS custom properties in `App.css` `:root`:
- Colors: `--bg`, `--surface`, `--mantle`, `--crust`, `--text`, `--text-dim`, `--overlay0`, `--overlay1`, `--accent`, `--red`, `--green`, `--yellow`
- Spacing: `--space-1` (4px) through `--space-12` (48px)
- Typography: `--text-xs` (10px) through `--text-xl` (18px)
- Radii: `--radius-sm` (4px), `--radius-md` (6px)
- Overlays: `--hover-overlay`, `--hover-overlay-subtle`
- Z-index: `--z-resize`, `--z-modal`
- Layout: `--tab-height`

## Constraints

- Windows-only. Do not add cross-platform abstractions unless asked.
- All components use `React.memo` for re-render control.
- Terminal callbacks use refs to avoid stale closures in high-frequency PTY events.
- PTY sessions are killed on tab close via `killSession()`.
- Dropped file paths are validated against safe Windows path characters before writing to PTY.
- Hidden directories (starting with `.`) are excluded from project scanning.
- Default project directory is `D:\Projects`, overridable via settings (multiple directories supported).

## Conventions

- Commit messages use conventional commits: `feat:`, `fix:`, `style:`, `perf:`, `docs:`, `refactor:`
- No linter/formatter configured - follow existing code style
- No test framework - manual testing only
