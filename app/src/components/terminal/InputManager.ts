/**
 * InputManager — handles all keyboard input in xterm.js.
 * Operates in 4 modes: normal, processing, permission, ask.
 */

import type { Terminal } from "@xterm/xterm";
import type { TerminalPalette } from "./themes";
import type { PermissionSuggestion, AskQuestionItem } from "../../types";
import { fg, BOLD, DIM, RESET, ICON, ERASE_LINE, cursorColumn } from "./AnsiUtils";

export type InputMode = "normal" | "processing" | "ask" | "permission";

export interface InputManagerCallbacks {
  onSubmit: (text: string) => void;
  onInterrupt: () => void;
  onPermissionRespond: (toolUseId: string, allow: boolean, suggestions?: PermissionSuggestion[]) => void;
  onAskRespond: (answers: Record<string, string>) => void;
  onAutocomplete: (input: string) => Promise<string[]>;
}

export class InputManager {
  private mode: InputMode = "processing"; // start as processing until inputRequired
  private buffer = "";
  private cursorPos = 0;
  private history: string[] = [];
  private historyIdx = -1;
  private historyStash = ""; // stash current buffer when browsing history

  // Permission state
  private permToolUseId = "";
  private permSuggestions?: PermissionSuggestion[];

  // Ask state
  private askQuestions: AskQuestionItem[] = [];
  private askStep = 0;
  private askAnswers: Record<string, string> = {};
  private askSelected = 0; // currently highlighted option

  // Spinner state
  private spinnerInterval: ReturnType<typeof setInterval> | null = null;
  private spinnerFrame = 0;
  private spinnerStartTime = 0;

  // Autocomplete state
  private completionInFlight = false;

  // Output tracking — pauses spinner when output is happening
  private spinnerPauseTimer: ReturnType<typeof setTimeout> | null = null;
  private spinnerPaused = false;
  private streamingActive = false;

  // Disposables
  private disposables: { dispose(): void }[] = [];

  constructor(
    private terminal: Terminal,
    private palette: TerminalPalette,
    private callbacks: InputManagerCallbacks,
  ) {
    // Capture keyboard input
    this.disposables.push(
      terminal.onData((data) => this.handleData(data)),
      terminal.onKey(({ domEvent }) => this.handleKeyEvent(domEvent)),
    );
  }

  // ── Public API ──────────────────────────────────────────────────

  setMode(mode: InputMode): void {
    this.stopSpinner();
    this.mode = mode;
    if (mode === "normal") {
      this.renderPrompt();
    } else if (mode === "processing") {
      this.startSpinner();
    }
  }

  getMode(): InputMode {
    return this.mode;
  }

  /** Set up permission mode with the tool/suggestions context */
  enterPermissionMode(toolUseId: string, suggestions?: PermissionSuggestion[]): void {
    this.permToolUseId = toolUseId;
    this.permSuggestions = suggestions;
    this.setMode("permission");
  }

  /** Set up ask mode with the questions */
  enterAskMode(questions: AskQuestionItem[]): void {
    this.askQuestions = questions;
    this.askStep = 0;
    this.askAnswers = {};
    this.askSelected = 0;
    this.setMode("ask");
  }

  updatePalette(palette: TerminalPalette): void {
    this.palette = palette;
  }

  /** Called by TerminalRenderer to track streaming state */
  setStreamingActive(active: boolean): void {
    this.streamingActive = active;
    if (active) {
      // Ensure spinner is stopped during streaming
      this.stopSpinner();
      this.spinnerPaused = true;
    }
  }

  /**
   * Call this whenever the renderer is about to write output.
   * Pauses the spinner so it doesn't conflict with streaming text.
   * Spinner auto-resumes after 600ms of silence (only if not streaming).
   */
  notifyOutput(): void {
    if (this.mode !== "processing") return;
    if (!this.spinnerPaused && this.spinnerInterval) {
      this.spinnerPaused = true;
      this.stopSpinner();
    }
    if (this.spinnerPauseTimer) clearTimeout(this.spinnerPauseTimer);
    this.spinnerPauseTimer = setTimeout(() => {
      this.spinnerPauseTimer = null;
      // Don't restart spinner if streaming is active
      if (this.mode === "processing" && !this.streamingActive) {
        this.spinnerPaused = false;
        this.startSpinner();
      }
    }, 600);
  }

  dispose(): void {
    this.stopSpinner();
    if (this.spinnerPauseTimer) {
      clearTimeout(this.spinnerPauseTimer);
      this.spinnerPauseTimer = null;
    }
    for (const d of this.disposables) d.dispose();
    this.disposables = [];
  }

  // ── Data handler (printable chars, paste, special sequences) ────

  private handleData(data: string): void {
    switch (this.mode) {
      case "normal":
        this.handleNormalData(data);
        break;
      case "processing":
        // Only Ctrl+C handled via handleKeyEvent
        break;
      case "permission":
        this.handlePermissionData(data);
        break;
      case "ask":
        this.handleAskData(data);
        break;
    }
  }

  /** Key events for special keys that onData doesn't provide cleanly */
  private handleKeyEvent(e: KeyboardEvent): void {
    // Ctrl+C in any mode
    if (e.ctrlKey && e.key === "c") {
      e.preventDefault();
      if (this.mode === "normal" && this.buffer.length > 0) {
        // Clear the current line
        this.buffer = "";
        this.cursorPos = 0;
        this.terminal.write("\r\n");
        this.renderPrompt();
      } else if (this.mode === "processing" || (this.mode === "normal" && this.buffer.length === 0)) {
        this.callbacks.onInterrupt();
      }
      return;
    }
  }

  // ── Normal mode ─────────────────────────────────────────────────

  private handleNormalData(data: string): void {
    // Special sequences
    if (data === "\r" || data === "\n") {
      // Enter — submit
      this.submit();
      return;
    }

    if (data === "\x7f" || data === "\b") {
      // Backspace
      this.backspace();
      return;
    }

    if (data === "\x1b[3~") {
      // Delete key
      this.deleteChar();
      return;
    }

    if (data === "\x1b[D") {
      // Left arrow
      this.moveCursor(-1);
      return;
    }

    if (data === "\x1b[C") {
      // Right arrow
      this.moveCursor(1);
      return;
    }

    if (data === "\x1b[A") {
      // Up arrow — history
      this.historyPrev();
      return;
    }

    if (data === "\x1b[B") {
      // Down arrow — history
      this.historyNext();
      return;
    }

    if (data === "\x1b[H" || data === "\x01") {
      // Home or Ctrl+A
      this.moveCursorTo(0);
      return;
    }

    if (data === "\x1b[F" || data === "\x05") {
      // End or Ctrl+E
      this.moveCursorTo(this.buffer.length);
      return;
    }

    if (data === "\x0b") {
      // Ctrl+K — kill to end of line
      this.buffer = this.buffer.slice(0, this.cursorPos);
      this.redrawLine();
      return;
    }

    if (data === "\x15") {
      // Ctrl+U — clear line
      this.buffer = "";
      this.cursorPos = 0;
      this.redrawLine();
      return;
    }

    if (data === "\x17") {
      // Ctrl+W — delete word backwards
      this.deleteWordBack();
      return;
    }

    if (data === "\t") {
      // Tab — autocomplete
      this.handleTab();
      return;
    }

    // Filter control characters (Ctrl+C \x03, etc.)
    if (data.charCodeAt(0) < 0x20 && data.length === 1) return;

    // Ignore escape sequences
    if (data.startsWith("\x1b")) return;

    // Strip embedded ANSI escapes from pasted text
    const clean = data.replace(/\x1b\[[0-9;]*[A-Za-z]|\x1b\][^\x07]*\x07|\x1b[78]|\x1b/g, "")
      .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, ""); // strip non-printable control chars
    if (!clean) return;

    this.insertText(clean);
  }

  private submit(): void {
    const text = this.buffer.trim();
    this.terminal.write("\r\n");
    this.buffer = "";
    this.cursorPos = 0;
    this.historyIdx = -1;
    if (text) {
      // Add to history (avoid duplicates at top)
      if (this.history.length === 0 || this.history[this.history.length - 1] !== text) {
        this.history.push(text);
        if (this.history.length > 100) this.history.shift();
      }
      this.setMode("processing"); // Immediately switch — don't wait for React effect
      this.callbacks.onSubmit(text);
    }
  }

  private insertText(text: string): void {
    this.buffer = this.buffer.slice(0, this.cursorPos) + text + this.buffer.slice(this.cursorPos);
    this.cursorPos += text.length;
    this.redrawLine();
  }

  private backspace(): void {
    if (this.cursorPos <= 0) return;
    this.buffer = this.buffer.slice(0, this.cursorPos - 1) + this.buffer.slice(this.cursorPos);
    this.cursorPos--;
    this.redrawLine();
  }

  private deleteChar(): void {
    if (this.cursorPos >= this.buffer.length) return;
    this.buffer = this.buffer.slice(0, this.cursorPos) + this.buffer.slice(this.cursorPos + 1);
    this.redrawLine();
  }

  private deleteWordBack(): void {
    if (this.cursorPos <= 0) return;
    let pos = this.cursorPos - 1;
    // Skip trailing spaces
    while (pos > 0 && this.buffer[pos] === " ") pos--;
    // Skip word chars
    while (pos > 0 && this.buffer[pos - 1] !== " ") pos--;
    this.buffer = this.buffer.slice(0, pos) + this.buffer.slice(this.cursorPos);
    this.cursorPos = pos;
    this.redrawLine();
  }

  private moveCursor(delta: number): void {
    const newPos = Math.max(0, Math.min(this.buffer.length, this.cursorPos + delta));
    if (newPos !== this.cursorPos) {
      this.cursorPos = newPos;
      this.terminal.write(cursorColumn(this.cursorPos + 3)); // +3 for "❯ " prompt (2 chars + 1-based column)
    }
  }

  private moveCursorTo(pos: number): void {
    this.cursorPos = Math.max(0, Math.min(this.buffer.length, pos));
    this.terminal.write(cursorColumn(this.cursorPos + 3));
  }

  private historyPrev(): void {
    if (this.history.length === 0) return;
    if (this.historyIdx === -1) {
      this.historyStash = this.buffer;
      this.historyIdx = this.history.length - 1;
    } else if (this.historyIdx > 0) {
      this.historyIdx--;
    } else {
      return;
    }
    this.buffer = this.history[this.historyIdx];
    this.cursorPos = this.buffer.length;
    this.redrawLine();
  }

  private historyNext(): void {
    if (this.historyIdx === -1) return;
    if (this.historyIdx < this.history.length - 1) {
      this.historyIdx++;
      this.buffer = this.history[this.historyIdx];
    } else {
      this.historyIdx = -1;
      this.buffer = this.historyStash;
    }
    this.cursorPos = this.buffer.length;
    this.redrawLine();
  }

  private async handleTab(): Promise<void> {
    if (this.completionInFlight) return;
    const input = this.buffer.slice(0, this.cursorPos);
    if (!input.trim()) return;

    // Extract the last token (after last space)
    const lastSpace = input.lastIndexOf(" ");
    const token = lastSpace >= 0 ? input.slice(lastSpace + 1) : input;
    if (!token) return;

    this.completionInFlight = true;
    try {
      const suggestions = await this.callbacks.onAutocomplete(token);
      if (suggestions.length === 0) return;
      if (suggestions.length === 1) {
        // Single match — complete inline
        const completion = suggestions[0].slice(token.length);
        this.insertText(completion);
      } else {
        // Multiple matches — show below prompt
        this.terminal.write("\r\n");
        const cols = this.terminal.cols;
        const maxLen = Math.max(...suggestions.map(s => s.length)) + 2;
        const perRow = Math.max(1, Math.floor(cols / maxLen));
        for (let i = 0; i < suggestions.length; i++) {
          this.terminal.write(`${DIM}${suggestions[i].padEnd(maxLen)}${RESET}`);
          if ((i + 1) % perRow === 0 && i + 1 < suggestions.length) {
            this.terminal.write("\r\n");
          }
        }
        this.terminal.write("\r\n");
        // Find common prefix for partial completion
        const common = commonPrefix(suggestions);
        if (common.length > token.length) {
          this.insertText(common.slice(token.length));
        }
        this.renderPrompt();
      }
    } catch {
      // Autocomplete failed silently
    } finally {
      this.completionInFlight = false;
    }
  }

  // ── Prompt rendering ────────────────────────────────────────────

  renderPrompt(): void {
    const prompt = `${fg(this.palette.accent)}${BOLD}${ICON.prompt}${RESET} `;
    this.terminal.write(`\r${ERASE_LINE}${prompt}${this.buffer}`);
    // Position cursor correctly
    if (this.cursorPos < this.buffer.length) {
      this.terminal.write(cursorColumn(this.cursorPos + 3));
    }
  }

  private redrawLine(): void {
    const prompt = `${fg(this.palette.accent)}${BOLD}${ICON.prompt}${RESET} `;
    this.terminal.write(`\r${ERASE_LINE}${prompt}${this.buffer}`);
    if (this.cursorPos < this.buffer.length) {
      this.terminal.write(cursorColumn(this.cursorPos + 3));
    }
  }

  // ── Processing mode (spinner) ───────────────────────────────────

  private startSpinner(): void {
    this.spinnerFrame = 0;
    this.spinnerStartTime = Date.now();
    this.renderSpinner();
    this.spinnerInterval = setInterval(() => {
      this.spinnerFrame = (this.spinnerFrame + 1) % ICON.spinner.length;
      this.renderSpinner();
    }, 100);
  }

  private renderSpinner(): void {
    const elapsed = Math.floor((Date.now() - this.spinnerStartTime) / 1000);
    const frame = ICON.spinner[this.spinnerFrame];
    this.terminal.write(
      `\r${ERASE_LINE}  ${fg(this.palette.accent)}${frame}${RESET} ${DIM}Working... ${elapsed}s${RESET}`
    );
  }

  private stopSpinner(): void {
    if (this.spinnerInterval) {
      clearInterval(this.spinnerInterval);
      this.spinnerInterval = null;
      // Clear the spinner line
      this.terminal.write(`\r${ERASE_LINE}`);
    }
  }

  // ── Permission mode ─────────────────────────────────────────────

  private handlePermissionData(data: string): void {
    const key = data.toLowerCase();
    if (key === "y" || data === "\r") {
      this.callbacks.onPermissionRespond(this.permToolUseId, true);
      this.setMode("processing");
    } else if (key === "n" || data === "\x1b") {
      this.callbacks.onPermissionRespond(this.permToolUseId, false);
      this.setMode("processing");
    } else if (key === "a" && this.permSuggestions?.length) {
      this.callbacks.onPermissionRespond(this.permToolUseId, true, this.permSuggestions);
      this.setMode("processing");
    }
  }

  // ── Ask mode ────────────────────────────────────────────────────

  private handleAskData(data: string): void {
    const q = this.askQuestions[this.askStep];
    if (!q) return;

    // Number keys select option
    const num = parseInt(data, 10);
    if (num >= 1 && num <= q.options.length) {
      this.askSelected = num - 1;
      this.askAnswers[String(this.askStep)] = q.options[this.askSelected].label;
      this.advanceAskStep();
      return;
    }

    // Enter confirms current selection
    if (data === "\r" || data === "\n") {
      if (q.options.length > 0) {
        this.askAnswers[String(this.askStep)] = q.options[this.askSelected].label;
      }
      this.advanceAskStep();
      return;
    }

    // Arrow keys navigate options
    if (data === "\x1b[A" && this.askSelected > 0) {
      this.askSelected--;
      return;
    }
    if (data === "\x1b[B" && this.askSelected < q.options.length - 1) {
      this.askSelected++;
      return;
    }
  }

  private advanceAskStep(): void {
    this.askStep++;
    if (this.askStep >= this.askQuestions.length) {
      // All questions answered
      this.callbacks.onAskRespond(this.askAnswers);
      this.setMode("processing");
    } else {
      this.askSelected = 0;
    }
  }
}

// ── Helpers ──────────────────────────────────────────────────────

function commonPrefix(strings: string[]): string {
  if (strings.length === 0) return "";
  let prefix = strings[0];
  for (let i = 1; i < strings.length; i++) {
    while (!strings[i].startsWith(prefix)) {
      prefix = prefix.slice(0, -1);
      if (!prefix) return "";
    }
  }
  return prefix;
}
