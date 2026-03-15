# Session Selector Panel — Design Spec

## Overview
A toggleable vertical/horizontal panel showing past sessions for the active project, enabling resume and fork operations.

## Layout

### Vertical tabs mode
- Panel appears as a **second vertical column** between TabSidebar and tab content
- Resizable via drag handle (same mechanics as existing sidebar)
- Default width: 260px, min: 180px, max: 400px

### Horizontal tabs mode
- Panel appears as a **horizontal bar below TabBar**
- Fixed height: ~200px, collapsible
- Sessions listed as compact rows

## Activation
- **Keyboard**: `Ctrl+Shift+S` toggles panel
- **GUI button**: History/clock icon in TabBar (horizontal) and TabSidebar (vertical)
- **State**: Persisted in settings as `sessionPanelOpen: bool`
- Panel loads sessions for the **active tab's project**. Changing active tab updates the list.
- On non-agent tabs: panel shows "Select an agent tab" placeholder.

## Session Entry Content
Each row displays:
- **Summary/title** — bold, truncated to 1 line
- **First prompt** — dim text, truncated to 1 line
- **Relative date** — right-aligned ("2h ago", "3 days ago")
- **Action icons** — visible on hover: Resume (play), Fork (branch)

## Interactions

### Mouse
- **Click**: Resume session in current tab
- **Ctrl+Click**: Resume session in new tab
- **Right-click**: Context menu → Resume / Fork / Resume in New Tab / Fork in New Tab

### Keyboard (when panel has focus)
- **Arrow keys**: Navigate session list
- **Enter**: Resume in current tab
- **Ctrl+Enter**: Resume in new tab
- **F**: Fork in current tab
- **Ctrl+F**: Fork in new tab (note: does NOT conflict — only active when panel has focus)
- **Type to filter**: Case-insensitive on summary + first prompt
- **Backspace**: Delete last filter char
- **Esc**: Clear filter, or close panel if filter empty

## Component: `SessionPanel.tsx`
- New component following SessionBrowser patterns but more compact
- Uses `listAgentSessions(projectPath)` to fetch sessions from sidecar
- Lazy loading: fetch on first open, cache with refresh on re-toggle
- `React.memo` wrapper consistent with all other components

## App.tsx Integration
- New setting: `sessionPanelOpen: boolean` (default: `false`)
- Layout: panel inserted between sidebar/tabbar and content area
- Toggle button added to both TabBar and TabSidebar

## Resume/Fork Wiring
Complete the existing TODO handlers in App.tsx:

### Resume flow
1. User triggers resume with `sessionId` + `cwd`
2. Create or update tab → type: "agent", set project metadata
3. Terminal mounts → calls `resumeAgent(tabId, sessionId, cwd, model, effort)` instead of `spawnAgent()`
4. Rust sends `{ cmd: "resume", tabId, sessionId, cwd, model, effort }` to sidecar
5. Sidecar calls `query()` with `options.resume = sessionId`

### Fork flow
Same as resume but sidecar additionally sets `options.forkSession = true`.

### "In new tab" variant
Creates a fresh agent tab before triggering resume/fork.

## Settings Persistence
Add to `Settings` struct in `projects.rs`:
```rust
#[serde(default)]
pub session_panel_open: bool,
```

## Keyboard Shortcut Registration
Add `Ctrl+Shift+S` to App.tsx global keydown handler alongside existing shortcuts.
