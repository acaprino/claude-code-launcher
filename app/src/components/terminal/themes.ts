import type { ITheme } from "@xterm/xterm";
import type { ThemeColors } from "../../types";

/**
 * Convert ThemeColors to xterm.js ITheme.
 * Uses hex colors directly — xterm supports them natively.
 */
export function themeColorsToXterm(c: ThemeColors): ITheme {
  return {
    background: c.bg,
    foreground: c.text,
    cursor: c.cursor,
    cursorAccent: c.bg,
    selectionBackground: c.selection,
    selectionForeground: c.text,

    // Standard ANSI palette (0-7)
    black: c.crust,
    red: c.red,
    green: c.green,
    yellow: c.yellow,
    blue: c.accent,
    magenta: c.overlay1,
    cyan: c.overlay0,
    white: c.text,

    // Bright ANSI palette (8-15)
    brightBlack: c.overlay0,
    brightRed: c.red,
    brightGreen: c.green,
    brightYellow: c.yellow,
    brightBlue: c.accent,
    brightMagenta: c.overlay1,
    brightCyan: c.textDim,
    brightWhite: c.text,
  };
}

/**
 * Color palette extracted from ThemeColors for use in AnsiUtils.
 * Cached per theme change to avoid repeated CSS reads.
 */
export interface TerminalPalette {
  text: string;
  textDim: string;
  accent: string;
  red: string;
  green: string;
  yellow: string;
  surface: string;
  overlay0: string;
  overlay1: string;
  bg: string;
  crust: string;
}

export function themeColorsToPalette(c: ThemeColors): TerminalPalette {
  return {
    text: c.text,
    textDim: c.textDim,
    accent: c.accent,
    red: c.red,
    green: c.green,
    yellow: c.yellow,
    surface: c.surface,
    overlay0: c.overlay0,
    overlay1: c.overlay1,
    bg: c.bg,
    crust: c.crust,
  };
}
