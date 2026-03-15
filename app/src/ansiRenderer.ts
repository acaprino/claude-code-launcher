import type { AgentEvent, ThemeColors } from "./types";

// Convert hex color (#rrggbb) to ANSI 24-bit foreground escape
function fg(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `\x1b[38;2;${r};${g};${b}m`;
}

const RESET = "\x1b[0m";
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";

// Word-wrap text to fit within `cols` columns
function wordWrap(text: string, cols: number): string {
  if (cols <= 0) return text;
  const lines: string[] = [];
  for (const raw of text.split("\n")) {
    if (raw.length <= cols) {
      lines.push(raw);
      continue;
    }
    let pos = 0;
    while (pos < raw.length) {
      lines.push(raw.slice(pos, pos + cols));
      pos += cols;
    }
  }
  return lines.join("\r\n");
}

// Render a boxed block (tool use, etc.)
function box_(header: string, content: string, color: string, cols: number): string {
  const width = Math.min(cols - 2, 70);
  const top = `${color}╭─ ${header} ${"─".repeat(Math.max(0, width - header.length - 4))}╮${RESET}`;
  const contentLines = content.split("\n").map((l) => {
    const trimmed = l.slice(0, width - 2);
    return `${color}│${RESET} ${trimmed}${" ".repeat(Math.max(0, width - trimmed.length - 2))} ${color}│${RESET}`;
  });
  const bottom = `${color}╰${"─".repeat(width)}╯${RESET}`;
  return [top, ...contentLines, bottom].join("\r\n");
}

/**
 * Render an AgentEvent as ANSI text for xterm.js.
 * Returns a string ready to be written to the terminal.
 */
export function renderAgentEvent(event: AgentEvent, theme: ThemeColors, cols: number): string {
  switch (event.type) {
    case "assistant": {
      if (event.streaming) {
        // Streaming delta — convert bare \n to \r\n for xterm line feeds
        return event.text.replace(/\n/g, "\r\n");
      }
      // Complete message — wrap and add newline
      return wordWrap(event.text, cols) + "\r\n";
    }

    case "toolUse": {
      const input = typeof event.input === "string"
        ? event.input
        : JSON.stringify(event.input, null, 2);
      // Truncate long inputs
      const truncated = input.length > 500 ? input.slice(0, 500) + "..." : input;
      return "\r\n" + box_(event.tool, truncated, fg(theme.accent), cols) + "\r\n";
    }

    case "toolResult": {
      const icon = event.success
        ? `${fg(theme.green)}✓${RESET}`
        : `${fg(theme.red)}✗${RESET}`;
      const output = event.output.length > 200 ? event.output.slice(0, 200) + "..." : event.output;
      return `${icon} ${DIM}${event.tool}${RESET}${output ? ": " + output : ""}\r\n`;
    }

    case "permission": {
      return `\r\n${fg(theme.yellow)}⚠ Allow ${BOLD}${event.tool}${RESET}${fg(theme.yellow)}: ${event.description}? [Y/n]${RESET} `;
    }

    case "inputRequired": {
      return `\r\n${fg(theme.accent)}❯${RESET} `;
    }

    case "thinking": {
      // Spinner animation is handled by Terminal.tsx — don't render static text
      return "";
    }

    case "status": {
      if (!event.status || event.status === "null") return "";
      return `${DIM}[${event.model || ""}] ${event.status}${RESET}\r`;
    }

    case "progress": {
      return `${DIM}${event.message}${RESET}\r`;
    }

    case "result": {
      const safe = (n: number) => (Number.isFinite(n) ? n : 0);
      const cost = `$${safe(event.cost).toFixed(3)}`;
      const totalTokens = safe(event.inputTokens) + safe(event.outputTokens);
      const tokens = fmtTokens(totalTokens);
      const cached = safe(event.cacheReadTokens) > 0 ? ` (${fmtTokens(safe(event.cacheReadTokens))} cached)` : "";
      const turns = `${safe(event.turns)} turn${safe(event.turns) !== 1 ? "s" : ""}`;
      const duration = `${(safe(event.durationMs) / 1000).toFixed(1)}s`;
      const line = `── ${cost} │ ${tokens} tokens${cached} │ ${turns} │ ${duration} ──`;
      return `\r\n${DIM}${line}${RESET}\r\n`;
    }

    case "error": {
      const prefix = event.code === "rate_limit" ? "⏳" : "⚠";
      return `\r\n${fg(theme.red)}${prefix} ${event.message}${RESET}\r\n`;
    }

    case "exit": {
      return `\r\n${DIM}Session ended (code ${event.code})${RESET}\r\n`;
    }

    default:
      return "";
  }
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(1) + "K";
  return n.toString();
}
