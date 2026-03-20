import { invoke } from "@tauri-apps/api/core";
import type { Theme } from "./types";

/** Strip characters unsafe for CSS font-family interpolation */
export function sanitizeFontName(name: string): string {
  return name.replace(/[^a-zA-Z0-9\s\-_.]/g, "");
}

/** Validate a CSS color value — allows hex, rgb/hsl, color-mix, var() */
export function sanitizeColor(value: string): string {
  if (/^#[0-9a-fA-F]{3,8}$/.test(value)) return value;
  if (/^(rgb|hsl)a?\([^;{}()]*\)$/.test(value)) return value;
  if (/^color-mix\([^;{}]*\)$/.test(value)) return value;
  if (/^var\(--[a-zA-Z0-9-]+\)$/.test(value)) return value;
  return "#000000";
}

export function applyTheme(themes: Theme[], themeIdx: number): void {
  const theme = themes[themeIdx] ?? themes[0];
  if (!theme) return; // themes not loaded yet
  const c = theme.colors;
  const root = document.documentElement;

  // Colors (validated to prevent CSS injection from malicious theme files)
  root.style.setProperty("--bg", sanitizeColor(c.bg));
  root.style.setProperty("--surface", sanitizeColor(c.surface));
  root.style.setProperty("--mantle", sanitizeColor(c.mantle));
  root.style.setProperty("--crust", sanitizeColor(c.crust));
  root.style.setProperty("--text", sanitizeColor(c.text));
  root.style.setProperty("--text-dim", sanitizeColor(c.textDim));
  root.style.setProperty("--overlay0", sanitizeColor(c.overlay0));
  root.style.setProperty("--overlay1", sanitizeColor(c.overlay1));
  root.style.setProperty("--accent", sanitizeColor(c.accent));
  root.style.setProperty("--red", sanitizeColor(c.red));
  root.style.setProperty("--green", sanitizeColor(c.green));
  root.style.setProperty("--yellow", sanitizeColor(c.yellow));

  // User message styling (theme-configurable)
  root.style.setProperty("--user-msg-bg", sanitizeColor(c.userMsgBg ?? "color-mix(in srgb, var(--surface) 30%, transparent)"));
  root.style.setProperty("--user-msg-border", sanitizeColor(c.userMsgBorder ?? "color-mix(in srgb, var(--accent) 50%, transparent)"));

  // Terminal font
  if (theme.termFont) {
    root.style.setProperty("--font-mono", `"${sanitizeFontName(theme.termFont)}", "Consolas", monospace`);
  } else {
    root.style.removeProperty("--font-mono");
  }

  // Typographic scale — derived from termFontSize (default 14)
  const base = theme.termFontSize || 14;
  root.style.setProperty("--text-2xs", `${base - 3}px`);
  root.style.setProperty("--text-xs", `${base - 2}px`);
  root.style.setProperty("--text-sm", `${base - 1}px`);
  root.style.setProperty("--text-base", `${base}px`);
  root.style.setProperty("--text-md", `${base + 2}px`);
  root.style.setProperty("--text-lg", `${base + 3}px`);
  root.style.setProperty("--text-xl", `${base + 5}px`);

  // UI / chat font
  if (theme.uiFont) {
    root.style.setProperty("--chat-font-family", `"${sanitizeFontName(theme.uiFont)}", "Segoe UI", system-ui, sans-serif`);
  } else {
    root.style.removeProperty("--chat-font-family");
  }
  if (theme.uiFontSize) {
    root.style.setProperty("--chat-font-size", `${theme.uiFontSize}px`);
  } else {
    root.style.removeProperty("--chat-font-size");
  }

  // Detect light vs dark from bg luminance
  const isLight = isLightColor(c.bg);
  root.style.colorScheme = isLight ? "light" : "dark";

  root.classList.toggle("light-theme", isLight);

  const isRetro = !!theme.retro;
  root.classList.toggle("retro", isRetro);
  invoke("set_window_corner_preference", { retro: isRetro }).catch((err) => console.debug("[themes] set_window_corner_preference failed:", err));
}

function isLightColor(hex: string): boolean {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 140;
}
