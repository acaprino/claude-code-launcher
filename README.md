<p align="center">
  <img src="app/public/icon.png" width="120" alt="Figtree">
</p>

<h1 align="center">Figtree</h1>

<p align="center">
  <strong>The first dedicated desktop client for the Claude Agent SDK.</strong><br>
  <sub>Your Claude Max account. Your projects. Tabbed, native, zero config.</sub>
</p>

<p align="center">
  <a href="https://github.com/acaprino/figtree/stargazers"><img src="https://img.shields.io/github/stars/acaprino/figtree?style=flat-square" alt="Stars"></a>
  <img src="https://img.shields.io/badge/version-1.0.0-blue?style=flat-square" alt="Version">
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?style=flat-square&logo=windows" alt="Platform">
  <img src="https://img.shields.io/badge/tauri-v2-24C8D8?style=flat-square&logo=tauri" alt="Tauri 2">
  <img src="https://img.shields.io/badge/license-MIT-green?style=flat-square" alt="License">
</p>

<!-- TODO: Add hero screenshot here once captured
<p align="center">
  <img src="docs/screenshots/hero.png" width="800" alt="Figtree - tabbed interface with project picker">
</p>
-->

---

## Why Figtree?

IDEs like Cursor, Windsurf, and Trae offer AI features &mdash; but they own the auth, the tokens, and the model access. If you're paying for Claude Max, you're paying twice. If you want the full Agent SDK, you're stuck in a terminal.

Figtree is the missing piece: **a native desktop app built entirely on the Claude Agent SDK**, using your own Claude account. No proprietary tokens, no API keys, no IDE lock-in. Just your projects and your agents, in a dedicated interface designed for multi-session workflows.

- **Your tokens, your account** &mdash; authenticates directly with your Claude credentials, no middleman
- **Not an IDE plugin** &mdash; a purpose-built app for Claude Agent sessions, not an afterthought bolted onto an editor
- **No more juggling terminals** &mdash; all your sessions live in tabs, with output indicators so you know which ones need attention
- **No more `cd`-ing around** &mdash; your project directories are scanned automatically, type to filter, Enter to launch
- **No more lost context** &mdash; sessions persist across restarts, resume or fork any past session
- **No mouse required** &mdash; every action has a keyboard shortcut
- **Zero config for teams** &mdash; distribute one `.exe`, everyone uses their own Claude Max subscription

---

## Features

### Multi-Tab Sessions

Run multiple concurrent AI coding sessions side by side. Tabs light up when agents produce new output. Exit codes display when sessions complete. Custom window chrome &mdash; no standard title bar.

<!-- TODO: screenshot -->

### Project Discovery

Figtree scans your project directories automatically. You see every project at a glance &mdash; which branch it's on, whether it has uncommitted changes, whether it has a `CLAUDE.md`. Add labels, sort by name or usage, type to filter. Create new projects or quick-launch any directory with F10.

<!-- TODO: screenshot -->

### Dual View

Switch between a **rich chat view** with markdown rendering, syntax highlighting, collapsible tool cards, and interactive permission prompts &mdash; or a **compact terminal view** for fast scanning. Switch without losing your session.

<!-- TODO: screenshot -->

### Session Persistence

Close Figtree, reopen it tomorrow. Your tabs and sessions are exactly where you left them. Resume or fork past sessions from the session panel (Ctrl+Shift+S). Browse all history in the session browser (Ctrl+Shift+H). Dead sessions are cleaned up automatically &mdash; no orphaned processes.

### Keyboard-First

Every feature is reachable without a mouse. Model, effort, permission mode &mdash; all switchable with a single keystroke.

| Action | Key |
|--------|-----|
| New tab | `Ctrl+T` |
| Close tab | `Ctrl+F4` |
| Launch project | `Enter` |
| Filter projects | Just type |
| Cycle model | `F4` |
| Cycle permission mode | `Tab` |
| Settings | `Ctrl+,` |

<details>
<summary>All keyboard shortcuts</summary>

#### Navigation
| Key | Action |
|-----|--------|
| `Ctrl+T` | New tab |
| `Ctrl+F4` | Close tab |
| `Ctrl+Tab` | Next tab |
| `Ctrl+Shift+Tab` | Previous tab |
| `Ctrl+1-9` | Switch to tab by number |
| `F1` | Toggle keyboard shortcuts |
| `F12` | Toggle About page |
| `Ctrl+U` | Toggle Usage page |
| `Ctrl+Shift+P` | Toggle System Prompts |
| `Ctrl+Shift+H` | Toggle Sessions browser |
| `Ctrl+Shift+S` | Toggle Session panel |

#### Settings (New Tab Page)
| Key | Action |
|-----|--------|
| `Tab` | Cycle permission mode |
| `F2` | Cycle effort level |
| `F3` | Cycle sort order |
| `F4` | Cycle model |

#### Actions
| Key | Action |
|-----|--------|
| `F5` | Create new project |
| `F6` | Open project in Explorer |
| `F8` | Label selected project |
| `F10` | Quick launch (any directory) |
| `Ctrl+,` | Open settings |
| `Enter` | Launch selected project |

#### Agent Tab
| Key | Action |
|-----|--------|
| `Ctrl+C` | Copy selection or interrupt agent |
| `Ctrl+V` | Paste (text or image) |

</details>

### 14+ Themes

Dark, light, and retro variants. Switchable via Ctrl+, settings. Themes apply to everything &mdash; window chrome, tabs, project list, chat, and terminal.

<details>
<summary>Included themes</summary>

Cyberpunk 2077, DaisyUI Retro, Dracula, Gandalf, Kanagawa, Light Arctic, Light Paper, Light Sakura, Light Solarized, Lofi, Matrix, Nord, Synthwave, Tokyo Night

Custom themes can be added by placing a JSON file in `data/themes/`.

</details>

### Agent Features

- Slash commands (`/`) and @agent mentions with autocomplete
- File attachments and image paste (Ctrl+V)
- Subagent task tracking with progress notifications
- Interrupt running agents (Ctrl+C)
- Live model and permission mode switching mid-session
- System prompts with YAML frontmatter

---

## Models & Permissions

| Model | ID | Context |
|-------|-----|---------|
| Sonnet | `claude-sonnet-4-6` | Standard |
| Opus | `claude-opus-4-6` | Standard |
| Haiku | `claude-haiku-4-5` | Standard |
| Sonnet 1M | `claude-sonnet-4-6[1m]` | Extended |
| Opus 1M | `claude-opus-4-6[1m]` | Extended |

| Permission Mode | Description |
|-----------------|-------------|
| Plan | Agent can only read and analyze |
| Accept edits | Auto-accepts file edits, prompts for other tools |
| Skip all | Bypasses all permission prompts |

---

## Getting Started

### Prerequisites

- **Windows 11** (or Windows 10 with WebView2)
- **Rust** toolchain ([rustup](https://rustup.rs/))
- **Node.js** 18+ and npm
- **Claude Code** (`npm i -g @anthropic-ai/claude-code`)

### Build & Run

```bash
git clone https://github.com/acaprino/figtree.git
cd figtree/app

npm install

# Development (hot-reload)
cargo tauri dev

# Production build
cargo tauri build
```

Release builds use LTO, single codegen unit, `opt-level = 3`, and symbol stripping for minimal binary size.

---

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| Model | Sonnet | Claude model variant |
| Effort | High | Reasoning effort level |
| Permission mode | Plan | Tool permission behavior |
| Sort | Alpha | Project sort order |
| Theme | Dracula | UI theme |
| Font | Cascadia Code, 14px | Terminal font |
| View style | Chat | Chat or terminal view |
| Project dirs | `D:\Projects` | Directories to scan |

---

## Tech Stack

Built with **Tauri 2** (Rust backend) + **React 19** (TypeScript frontend) + a **Node.js sidecar** running the Claude Agent SDK. Communication flows as JSON-lines over stdin/stdout, with Win32 Job Objects ensuring clean process cleanup even on crashes.

<details>
<summary>Architecture diagram</summary>

```
+---------------------------------------------+
|  Frontend                                   |
|  React 19 . TypeScript 5.7 . Vite 6        |
|  react-markdown . @tanstack/react-virtual   |
+---------------------------------------------+
|  IPC Layer                                  |
|  Tauri 2 Commands . Tauri Channels          |
+---------------------------------------------+
|  Backend                                    |
|  Rust 2021 . Tokio . Win32 APIs             |
|  Sidecar Management . JSON-lines Bridge     |
|  Project Scanner . Settings Persistence     |
+---------------------------------------------+
|  Sidecar                                    |
|  Node.js . @anthropic-ai/claude-agent-sdk   |
+---------------------------------------------+
```

For detailed architecture, module reference, and IPC protocol, see [`docs/TECHNICAL.md`](docs/TECHNICAL.md).

</details>

---

## Contributing

Contributions welcome. [Open an issue](https://github.com/acaprino/figtree/issues) first to discuss what you'd like to change.

---

## License

[MIT](LICENSE)

---

<p align="center">
  <sub>The only dedicated desktop client for Claude Agent SDK. No IDE tax. No token middleman.</sub><br>
  <sub>Built with Tauri 2, React 19, and Rust. Windows native. Keyboard-first.</sub>
</p>
