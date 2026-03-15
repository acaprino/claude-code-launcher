# Session Selector Panel — Implementation Plan

> **For agentic workers:** Use subagent-driven execution (if subagents available) or ai-tooling:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a toggleable session panel that shows past sessions for the active project, enabling resume and fork directly from the sidebar.

**Architecture:** New `SessionPanel` component fetches sessions via existing `listAgentSessions()` IPC. The panel is rendered in App.tsx between the tab bar/sidebar and the tab-content area. Resume/fork wiring completes the existing TODO handlers in App.tsx by creating agent tabs with `resumeSessionId`/`forkSessionId` fields on the Tab type, which Terminal.tsx reads to call `resumeAgent()`/`forkAgent()` instead of `spawnAgent()`.

**Tech Stack:** React 19, TypeScript, CSS custom properties, existing Tauri IPC commands

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Create | `app/src/components/SessionPanel.tsx` | Session list panel component |
| Create | `app/src/components/SessionPanel.css` | Panel styles (vertical + horizontal modes) |
| Modify | `app/src/types.ts` | Add `resumeSessionId`, `forkSessionId` to Tab; add `session_panel_open` to Settings |
| Modify | `app/src/App.tsx` | Layout integration, toggle shortcut, resume/fork handlers |
| Modify | `app/src/App.css` | Grid layout updates for session panel column |
| Modify | `app/src/components/TabBar.tsx` | Add sessions toggle button |
| Modify | `app/src/components/TabSidebar.tsx` | Add sessions toggle button |
| Modify | `app/src/components/Terminal.tsx` | Support resume/fork on mount via new Tab fields |
| Modify | `app/src-tauri/src/projects.rs` | Add `session_panel_open` to Settings struct |

---

## Task 1: Types & Settings Backend

**Files:**
- Modify: `app/src/types.ts:8-23` (Tab interface)
- Modify: `app/src/types.ts:34-53` (Settings interface)
- Modify: `app/src-tauri/src/projects.rs:17-53` (Rust Settings struct)

- [ ] **Step 1: Add resume/fork fields to Tab type**

In `app/src/types.ts`, add two optional fields to the `Tab` interface:

```typescript
export interface Tab {
  id: string;
  type: "new-tab" | "agent" | "about" | "usage" | "system-prompt" | "sessions";
  projectPath?: string;
  projectName?: string;

  modelIdx?: number;
  effortIdx?: number;
  skipPerms?: boolean;
  autocompact?: boolean;
  temporary?: boolean;
  agentSessionId?: string;
  hasNewOutput?: boolean;
  exitCode?: number | null;
  tagline?: string;
  /** When set, Terminal will call resumeAgent() instead of spawnAgent(). Consumed on mount. */
  resumeSessionId?: string;
  /** When set, Terminal will call forkAgent() instead of spawnAgent(). Consumed on mount. */
  forkSessionId?: string;
}
```

- [ ] **Step 2: Add `session_panel_open` to Settings (TypeScript)**

In `app/src/types.ts`, add to the `Settings` interface:

```typescript
export interface Settings {
  // ... existing fields ...
  session_panel_open?: boolean;
}
```

- [ ] **Step 3: Add `session_panel_open` to Settings (Rust)**

In `app/src-tauri/src/projects.rs`, add to the `Settings` struct after the `sidebar_width` field:

```rust
    #[serde(default)]
    pub session_panel_open: bool,
```

And in the `Default` impl, add `session_panel_open: false,`.

- [ ] **Step 4: Commit**

```
feat: add resume/fork fields to Tab type and session_panel_open setting
```

---

## Task 2: Terminal Resume/Fork Support

**Files:**
- Modify: `app/src/components/Terminal.tsx:8` (import)
- Modify: `app/src/components/Terminal.tsx:145-165` (props)
- Modify: `app/src/components/Terminal.tsx:807-828` (spawn logic)

- [ ] **Step 1: Add resumeAgent and forkAgent to Terminal imports**

In `Terminal.tsx` line 8, add `resumeAgent` and `forkAgent` to the import:

```typescript
import { spawnAgent, resumeAgent, forkAgent, sendAgentMessage, killAgent, respondPermission, saveClipboardImage } from "../hooks/useAgentSession";
```

- [ ] **Step 2: Add resume/fork props to TerminalProps**

Add two optional props to the `TerminalProps` interface:

```typescript
  /** If set, resume this session instead of spawning fresh. */
  resumeSessionId?: string;
  /** If set, fork this session instead of spawning fresh. */
  forkSessionId?: string;
```

And destructure them in the component function signature.

- [ ] **Step 3: Replace spawn logic with resume/fork branching**

Replace the `spawnAgent(...)` call block (around lines 807-828) with:

```typescript
      const launchPromise = resumeSessionId
        ? resumeAgent(tabId, resumeSessionId, projectPath, modelId, effortId, handleAgentEvent)
        : forkSessionId
          ? forkAgent(tabId, forkSessionId, projectPath, modelId, effortId, handleAgentEvent)
          : spawnAgent(tabId, projectPath, modelId, effortId, stripNonBmpAndSurrogates(systemPrompt), skipPerms, handleAgentEvent);

      launchPromise
        .then(() => {
          if (cancelled) {
            killAgent(tabId).catch(() => {});
            return;
          }
          agentStartedRef.current = true;
          onSessionCreatedRef.current(tabIdRef.current, tabId);
        })
        .catch((err) => {
          if (cancelled) return;
          onErrorRef.current(tabIdRef.current, String(err));
          xterm.write(`\r\n\x1b[91mError: ${String(err).replace(/[\x00-\x1f\x7f-\x9f]/g, "")}\x1b[0m`);
        });
```

- [ ] **Step 4: Show resume/fork indicator in logo area**

After the ANSI logo is written to xterm (in the init effect), add a status line when resuming/forking:

```typescript
      if (resumeSessionId) {
        xterm.write(`\r\n  ${fg("Resuming session...", themeColors.accent)}\r\n`);
      } else if (forkSessionId) {
        xterm.write(`\r\n  ${fg("Forking session...", themeColors.accent)}\r\n`);
      }
```

- [ ] **Step 5: Commit**

```
feat: Terminal supports resume/fork via props
```

---

## Task 3: App.tsx Resume/Fork Handlers & Panel Toggle

**Files:**
- Modify: `app/src/App.tsx:1-17` (imports)
- Modify: `app/src/App.tsx:104-136` (keyboard handler)
- Modify: `app/src/App.tsx:297-315` (SessionBrowser handlers — TODO stubs)
- Modify: `app/src/App.tsx:317-339` (Terminal rendering — pass new props)
- Modify: `app/src/App.tsx:212-348` (layout — add SessionPanel)

- [ ] **Step 1: Add session panel state and toggle**

In `AppContent()`, add the panel state derived from settings:

```typescript
  const sessionPanelOpen = settings?.session_panel_open ?? false;

  const toggleSessionPanel = useCallback(() => {
    updateSettings({ session_panel_open: !settingsRef.current?.session_panel_open });
  }, [updateSettings]);
```

- [ ] **Step 2: Add Ctrl+Shift+S shortcut**

In the global keydown handler, add before the closing of the handler:

```typescript
      } else if (e.ctrlKey && e.shiftKey && e.key === "S") {
        e.preventDefault();
        toggleSessionPanel();
      }
```

Add `toggleSessionPanel` to the effect's dependency array.

- [ ] **Step 3: Implement resume handler**

Replace the `onResumeSession` TODO stub in the SessionBrowser rendering with a real handler. Also create a shared handler for the SessionPanel to use:

```typescript
  const handleResumeSession = useCallback((sessionId: string, cwd: string, inNewTab?: boolean) => {
    const projectName = cwd.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "Terminal";
    const modelIdx = settingsRef.current?.model_idx ?? 0;
    const effortIdx = settingsRef.current?.effort_idx ?? 0;

    if (inNewTab || activeTab.type !== "agent") {
      // Create new agent tab with resume
      const tabId = addTab();
      updateTab(tabId, {
        type: "agent",
        projectPath: cwd,
        projectName,
        modelIdx,
        effortIdx,
        skipPerms: false,
        resumeSessionId: sessionId,
      });
      return;
    }

    // Resume in current tab — only if current tab is a fresh new-tab or completed agent
    updateTab(activeTabId, {
      type: "agent",
      projectPath: cwd,
      projectName,
      modelIdx,
      effortIdx,
      skipPerms: false,
      resumeSessionId: sessionId,
    });
  }, [activeTab.type, activeTabId, addTab, updateTab]);
```

- [ ] **Step 4: Implement fork handler**

Same pattern as resume:

```typescript
  const handleForkSession = useCallback((sessionId: string, cwd: string, inNewTab?: boolean) => {
    const projectName = cwd.replace(/\\/g, "/").split("/").filter(Boolean).pop() || "Terminal";
    const modelIdx = settingsRef.current?.model_idx ?? 0;
    const effortIdx = settingsRef.current?.effort_idx ?? 0;

    if (inNewTab || activeTab.type !== "agent") {
      const tabId = addTab();
      updateTab(tabId, {
        type: "agent",
        projectPath: cwd,
        projectName,
        modelIdx,
        effortIdx,
        skipPerms: false,
        forkSessionId: sessionId,
      });
      return;
    }

    updateTab(activeTabId, {
      type: "agent",
      projectPath: cwd,
      projectName,
      modelIdx,
      effortIdx,
      skipPerms: false,
      forkSessionId: sessionId,
    });
  }, [activeTab.type, activeTabId, addTab, updateTab]);
```

- [ ] **Step 5: Wire handlers to SessionBrowser**

Replace the TODO stubs:

```typescript
  onResumeSession={(sessionId, cwd) => handleResumeSession(sessionId, cwd)}
  onForkSession={(sessionId, cwd) => handleForkSession(sessionId, cwd)}
```

- [ ] **Step 6: Pass resume/fork props to Terminal**

In the Terminal rendering block, add the two new props:

```typescript
  <Terminal
    tabId={tab.id}
    projectPath={tab.projectPath!}
    // ... existing props ...
    resumeSessionId={tab.resumeSessionId}
    forkSessionId={tab.forkSessionId}
    autocompleteEnabled={settings?.autocomplete_enabled !== false}
  />
```

- [ ] **Step 7: Commit**

```
feat: wire resume/fork handlers and session panel toggle in App.tsx
```

---

## Task 4: SessionPanel Component

**Files:**
- Create: `app/src/components/SessionPanel.tsx`
- Create: `app/src/components/SessionPanel.css`

- [ ] **Step 1: Create SessionPanel.tsx**

```typescript
import { memo, useState, useEffect, useCallback, useRef } from "react";
import { listAgentSessions } from "../hooks/useAgentSession";
import type { SessionInfo } from "../types";
import "./SessionPanel.css";

interface SessionPanelProps {
  /** Project path of the active agent tab, or null if no agent tab is active */
  projectPath: string | null;
  isOpen: boolean;
  onClose: () => void;
  onResumeSession: (sessionId: string, cwd: string, inNewTab?: boolean) => void;
  onForkSession: (sessionId: string, cwd: string, inNewTab?: boolean) => void;
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  const months = Math.floor(days / 30);
  return `${months}mo ago`;
}

function SessionPanel({ projectPath, isOpen, onClose, onResumeSession, onForkSession }: SessionPanelProps) {
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [filter, setFilter] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const selectedIdxRef = useRef(selectedIdx);
  const filterRef = useRef(filter);

  useEffect(() => { selectedIdxRef.current = selectedIdx; }, [selectedIdx]);
  useEffect(() => { filterRef.current = filter; }, [filter]);

  // Fetch sessions when panel opens or project changes
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setFilter("");
    setSelectedIdx(0);
    listAgentSessions(projectPath || undefined)
      .then((list) => {
        const sorted = [...list].sort((a, b) => b.lastModified - a.lastModified);
        setSessions(sorted);
      })
      .catch(() => setSessions([]))
      .finally(() => setLoading(false));
  }, [isOpen, projectPath]);

  const filtered = filter
    ? sessions.filter((s) => {
        const q = filter.toLowerCase();
        return (
          s.summary.toLowerCase().includes(q) ||
          (s.firstPrompt || "").toLowerCase().includes(q) ||
          (s.customTitle || "").toLowerCase().includes(q)
        );
      })
    : sessions;

  // Keyboard handler
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isOpen) return;
    // Only handle when panel or its children have focus
    if (!panelRef.current?.contains(document.activeElement) && document.activeElement !== panelRef.current) return;

    const idx = selectedIdxRef.current;
    const fl = filterRef.current;
    const list = fl
      ? sessions.filter((s) => {
          const q = fl.toLowerCase();
          return s.summary.toLowerCase().includes(q) || (s.firstPrompt || "").toLowerCase().includes(q);
        })
      : sessions;

    switch (e.key) {
      case "ArrowUp":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx(Math.max(0, idx - 1));
        break;
      case "ArrowDown":
        e.preventDefault();
        e.stopPropagation();
        setSelectedIdx(Math.min(list.length - 1, idx + 1));
        break;
      case "Home":
        e.preventDefault();
        setSelectedIdx(0);
        break;
      case "End":
        e.preventDefault();
        setSelectedIdx(Math.max(0, list.length - 1));
        break;
      case "Enter":
        e.preventDefault();
        if (list[idx]) {
          onResumeSession(list[idx].id, list[idx].cwd, e.ctrlKey);
        }
        break;
      case "f":
      case "F":
        if (!e.altKey && !e.metaKey) {
          e.preventDefault();
          e.stopPropagation();
          if (list[idx]) {
            onForkSession(list[idx].id, list[idx].cwd, e.ctrlKey);
          }
        }
        break;
      case "Escape":
        e.preventDefault();
        e.stopPropagation();
        if (fl) {
          setFilter("");
        } else {
          onClose();
        }
        break;
      case "Backspace":
        e.preventDefault();
        setFilter((prev) => prev.slice(0, -1));
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey && e.key !== "f" && e.key !== "F") {
          e.preventDefault();
          setFilter((prev) => prev + e.key);
          setSelectedIdx(0);
        }
        break;
    }
  }, [isOpen, sessions, onResumeSession, onForkSession, onClose]);

  useEffect(() => {
    if (!isOpen) return;
    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [isOpen, handleKeyDown]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (!listRef.current) return;
    const el = listRef.current.querySelector(".session-item.selected");
    if (el) el.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  // Focus panel when opened
  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="session-panel" ref={panelRef} tabIndex={-1}>
      <div className="session-panel__header">
        <span className="session-panel__title">Sessions</span>
        <button className="session-panel__close" onClick={onClose} title="Close (Ctrl+Shift+S)" aria-label="Close sessions panel">
          {"\u00d7"}
        </button>
      </div>

      {filter && (
        <div className="session-panel__filter">
          <span className="session-panel__filter-icon">/</span>
          <span>{filter}</span>
        </div>
      )}

      <div className="session-panel__list" ref={listRef}>
        {!projectPath ? (
          <div className="session-panel__empty">Select an agent tab</div>
        ) : loading ? (
          <div className="session-panel__empty">Loading...</div>
        ) : filtered.length === 0 ? (
          <div className="session-panel__empty">No sessions found</div>
        ) : (
          filtered.map((session, i) => {
            const isSelected = i === selectedIdx;
            const title = session.customTitle || session.summary || "Untitled";
            const prompt = session.firstPrompt || "";

            return (
              <div
                key={session.id}
                className={`session-item ${isSelected ? "selected" : ""}`}
                onClick={(e) => onResumeSession(session.id, session.cwd, e.ctrlKey)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  // Context menu handled inline
                  const menu = document.createElement("div");
                  menu.className = "session-context-menu";
                  menu.style.left = `${e.clientX}px`;
                  menu.style.top = `${e.clientY}px`;
                  menu.innerHTML = `
                    <button data-action="resume">Resume</button>
                    <button data-action="fork">Fork</button>
                    <button data-action="resume-new">Resume in New Tab</button>
                    <button data-action="fork-new">Fork in New Tab</button>
                  `;
                  const cleanup = () => { menu.remove(); window.removeEventListener("click", cleanup); };
                  menu.addEventListener("click", (ev) => {
                    const action = (ev.target as HTMLElement).dataset.action;
                    if (action === "resume") onResumeSession(session.id, session.cwd);
                    else if (action === "fork") onForkSession(session.id, session.cwd);
                    else if (action === "resume-new") onResumeSession(session.id, session.cwd, true);
                    else if (action === "fork-new") onForkSession(session.id, session.cwd, true);
                    cleanup();
                  });
                  document.body.appendChild(menu);
                  window.addEventListener("click", cleanup);
                }}
              >
                <div className="session-item__top">
                  <span className="session-item__title" title={title}>{title}</span>
                  <span className="session-item__date">{relativeTime(session.lastModified)}</span>
                </div>
                {prompt && (
                  <div className="session-item__prompt" title={prompt}>{prompt}</div>
                )}
                <div className="session-item__actions">
                  <button
                    className="session-item__action"
                    onClick={(e) => { e.stopPropagation(); onResumeSession(session.id, session.cwd); }}
                    title="Resume"
                    aria-label="Resume session"
                  >
                    {"\u25b6"}
                  </button>
                  <button
                    className="session-item__action"
                    onClick={(e) => { e.stopPropagation(); onForkSession(session.id, session.cwd); }}
                    title="Fork"
                    aria-label="Fork session"
                  >
                    {"\u2442"}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="session-panel__footer">
        [Enter] Resume  [F] Fork  [Esc] Close
      </div>
    </div>
  );
}

export default memo(SessionPanel);
```

- [ ] **Step 2: Create SessionPanel.css**

```css
/* ── Session Panel ── */
.session-panel {
  display: flex;
  flex-direction: column;
  background: var(--mantle);
  border-right: 1px solid color-mix(in srgb, var(--overlay0) 30%, transparent);
  overflow: hidden;
  outline: none;
  min-width: 180px;
}

/* Horizontal mode: panel is a horizontal bar below tab-bar */
.app:not(.vertical-tabs) .session-panel {
  border-right: none;
  border-bottom: 1px solid color-mix(in srgb, var(--overlay0) 30%, transparent);
  max-height: 200px;
  min-height: 120px;
}

.session-panel__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-1) var(--space-2);
  border-bottom: 1px solid color-mix(in srgb, var(--overlay0) 20%, transparent);
  flex-shrink: 0;
}

.session-panel__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text-dim);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.session-panel__close {
  background: none;
  border: none;
  color: var(--text-dim);
  cursor: pointer;
  font-size: var(--text-md);
  padding: 0 var(--space-1);
  line-height: 1;
}

.session-panel__close:hover {
  color: var(--text);
}

.session-panel__filter {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
  border-bottom: 1px solid color-mix(in srgb, var(--accent) 20%, transparent);
  flex-shrink: 0;
}

.session-panel__filter-icon {
  opacity: 0.6;
}

.session-panel__list {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}

/* Horizontal mode: list scrolls horizontally */
.app:not(.vertical-tabs) .session-panel__list {
  display: flex;
  flex-direction: row;
  overflow-x: auto;
  overflow-y: hidden;
  gap: 1px;
}

.session-panel__empty {
  padding: var(--space-4) var(--space-2);
  color: var(--text-dim);
  font-size: var(--text-sm);
  text-align: center;
}

.session-item {
  padding: var(--space-2);
  cursor: pointer;
  border-bottom: 1px solid color-mix(in srgb, var(--overlay0) 10%, transparent);
  position: relative;
}

/* Horizontal mode: items are fixed-width cards */
.app:not(.vertical-tabs) .session-item {
  min-width: 220px;
  max-width: 280px;
  border-bottom: none;
  border-right: 1px solid color-mix(in srgb, var(--overlay0) 10%, transparent);
  flex-shrink: 0;
}

.session-item:hover {
  background: var(--hover-overlay-subtle);
}

.session-item.selected {
  background: var(--hover-overlay);
}

.session-item__top {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.session-item__title {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--text);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  min-width: 0;
}

.session-item__date {
  font-size: var(--text-xs);
  color: var(--text-dim);
  white-space: nowrap;
  flex-shrink: 0;
}

.session-item__prompt {
  font-size: var(--text-xs);
  color: var(--text-dim);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  margin-top: 2px;
}

.session-item__actions {
  display: none;
  gap: var(--space-1);
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
}

.session-item:hover .session-item__actions {
  display: flex;
}

.session-item__action {
  background: color-mix(in srgb, var(--surface) 80%, transparent);
  border: 1px solid color-mix(in srgb, var(--overlay0) 30%, transparent);
  color: var(--text-dim);
  cursor: pointer;
  font-size: var(--text-xs);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
  line-height: 1;
}

.session-item__action:hover {
  color: var(--accent);
  border-color: var(--accent);
}

.session-panel__footer {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
  color: var(--text-dim);
  border-top: 1px solid color-mix(in srgb, var(--overlay0) 20%, transparent);
  text-align: center;
  flex-shrink: 0;
  white-space: nowrap;
  overflow: hidden;
}

/* Context menu (spawned via DOM) */
.session-context-menu {
  position: fixed;
  z-index: var(--z-modal);
  background: var(--surface);
  border: 1px solid color-mix(in srgb, var(--overlay0) 40%, transparent);
  border-radius: var(--radius-sm);
  padding: var(--space-1) 0;
  min-width: 160px;
  box-shadow: 0 4px 12px color-mix(in srgb, var(--crust) 60%, transparent);
}

.session-context-menu button {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  padding: var(--space-1) var(--space-3);
  cursor: pointer;
  font-size: var(--text-sm);
}

.session-context-menu button:hover {
  background: var(--hover-overlay);
}

/* Theme crossfade */
.session-panel,
.session-item {
  transition: background-color 150ms ease-out, color 150ms ease-out, border-color 150ms ease-out;
}
```

- [ ] **Step 3: Commit**

```
feat: add SessionPanel component with resume/fork support
```

---

## Task 5: TabBar & TabSidebar — Toggle Button

**Files:**
- Modify: `app/src/components/TabBar.tsx:14-23` (props)
- Modify: `app/src/components/TabBar.tsx:133-147` (actions area)
- Modify: `app/src/components/TabSidebar.tsx:11-23` (props)
- Modify: `app/src/components/TabSidebar.tsx:167-181` (footer)

- [ ] **Step 1: Add `onToggleSessions` prop to TabBar**

In `TabBarProps`, add:

```typescript
  onToggleSessions: () => void;
```

Destructure it in the component. Add a button in the `tab-bar-actions` div, before the usage button:

```tsx
<button className="tab-bar-action" onClick={onToggleSessions} title="Sessions (Ctrl+Shift+S)" aria-label="Sessions">
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1a5 5 0 1 0 5 5H6V1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <line x1="6" y1="6" x2="6" y2="2.5" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="6" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
</button>
```

- [ ] **Step 2: Add `onToggleSessions` prop to TabSidebar**

Same pattern. In `TabSidebarProps`, add:

```typescript
  onToggleSessions: () => void;
```

Destructure it. Add a button in `tab-sidebar__footer`, before the usage button:

```tsx
<button className="tab-bar-action" onClick={onToggleSessions} title="Sessions (Ctrl+Shift+S)" aria-label="Sessions">
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
    <path d="M6 1a5 5 0 1 0 5 5H6V1z" stroke="currentColor" strokeWidth="1.2" fill="none"/>
    <line x1="6" y1="6" x2="6" y2="2.5" stroke="currentColor" strokeWidth="1.2"/>
    <line x1="6" y1="6" x2="9" y2="6" stroke="currentColor" strokeWidth="1.2"/>
  </svg>
</button>
```

- [ ] **Step 3: Commit**

```
feat: add sessions toggle button to TabBar and TabSidebar
```

---

## Task 6: App.tsx Layout Integration

**Files:**
- Modify: `app/src/App.tsx:1-17` (imports)
- Modify: `app/src/App.tsx:212-349` (JSX layout)
- Modify: `app/src/App.css:100-126` (grid layout)

- [ ] **Step 1: Import SessionPanel**

Add to App.tsx imports:

```typescript
import SessionPanel from "./components/SessionPanel";
```

- [ ] **Step 2: Compute activeProjectPath**

Add a memoized value after the existing state:

```typescript
  const activeProjectPath = activeTab.type === "agent" ? (activeTab.projectPath ?? null) : null;
```

- [ ] **Step 3: Update vertical tabs layout**

In the vertical tabs branch, add SessionPanel between TabSidebar and tab-content. Pass `onToggleSessions={toggleSessionPanel}` to TabSidebar:

```tsx
{verticalTabs ? (
  <>
    <TitleBar />
    <TabSidebar
      tabs={tabs}
      activeTabId={activeTabId}
      sidebarWidth={sidebarWidth}
      onActivate={activateTab}
      onClose={closeTab}
      onAdd={addTabAndResetFilter}
      onSaveToProjects={handleSaveToProjects}
      onToggleAbout={toggleAboutTab}
      onToggleUsage={toggleUsageTab}
      onToggleSessions={toggleSessionPanel}
      onResizeWidth={handleResizeWidth}
      onResizing={setIsResizing}
    />
    {sessionPanelOpen && (
      <SessionPanel
        projectPath={activeProjectPath}
        isOpen={sessionPanelOpen}
        onClose={toggleSessionPanel}
        onResumeSession={handleResumeSession}
        onForkSession={handleForkSession}
      />
    )}
  </>
) : (
  <>
    <TabBar
      tabs={tabs}
      activeTabId={activeTabId}
      onActivate={activateTab}
      onClose={closeTab}
      onAdd={addTabAndResetFilter}
      onSaveToProjects={handleSaveToProjects}
      onToggleAbout={toggleAboutTab}
      onToggleUsage={toggleUsageTab}
      onToggleSessions={toggleSessionPanel}
    />
    {sessionPanelOpen && (
      <SessionPanel
        projectPath={activeProjectPath}
        isOpen={sessionPanelOpen}
        onClose={toggleSessionPanel}
        onResumeSession={handleResumeSession}
        onForkSession={handleForkSession}
      />
    )}
  </>
)}
```

- [ ] **Step 4: Update CSS grid for vertical tabs with session panel**

In `App.css`, update the vertical-tabs grid to accommodate the session panel. Add a CSS custom property for the session panel width:

```css
:root {
  /* ... existing vars ... */
  --session-panel-width: 260px;
}
```

Update the vertical-tabs grid:

```css
.app.vertical-tabs {
  display: grid;
  grid-template-rows: var(--title-bar-height) 1fr;
  grid-template-columns: var(--sidebar-width) 1fr;
}

.app.vertical-tabs.session-panel-open {
  grid-template-columns: var(--sidebar-width) var(--session-panel-width) 1fr;
}
```

- [ ] **Step 5: Add `session-panel-open` class to app div**

Update the `appClassName` computation:

```typescript
  const appClassName = `app${verticalTabs ? " vertical-tabs" : ""}${sessionPanelOpen ? " session-panel-open" : ""}`;
```

- [ ] **Step 6: Commit**

```
feat: integrate SessionPanel into App layout with grid support
```

---

## Task 7: CLAUDE.md & Shortcuts Documentation

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update keyboard shortcuts section**

Add under Global shortcuts:

```
- **Ctrl+Shift+S**: Toggle session panel
```

Add under Key Paths:

```
- `app/src/components/SessionPanel.tsx` - Session selector panel (resume/fork)
```

- [ ] **Step 2: Commit**

```
docs: add session panel to CLAUDE.md shortcuts and key paths
```
