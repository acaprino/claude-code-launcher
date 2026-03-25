import type { TerminalPalette } from "../themes";

/** Base interface for all terminal document blocks */
export interface Block {
  /** Unique block ID */
  readonly id: string;
  /** Block type discriminator */
  readonly type: string;
  /** Creation timestamp */
  readonly timestamp: number;
  /** Line number in terminal buffer where this block starts */
  startLine: number;
  /** Number of terminal lines this block occupies */
  lineCount: number;
  /** True once scrolled out of viewport — no more visual updates */
  frozen: boolean;
  /** Render block content as a string to write to xterm.js */
  render(cols: number, palette: TerminalPalette): string;
  /** Update block data. Returns true if content changed. */
  update?(data: unknown): boolean;
}
