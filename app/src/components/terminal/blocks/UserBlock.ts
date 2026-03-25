import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { fg, BOLD, RESET, ICON, wordWrap } from "../AnsiUtils";

export class UserBlock implements Block {
  readonly type = "user";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;

  constructor(public readonly id: string, public text: string) {}

  render(cols: number, palette: TerminalPalette): string {
    const prefix = `${fg(palette.accent)}${BOLD}${ICON.prompt}${RESET} `;
    const prefixLen = 2; // "❯ "
    const lines = wordWrap(this.text, cols - prefixLen);

    const rendered = lines.map((line, i) =>
      i === 0 ? `${prefix}${line}` : `  ${line}`
    ).join("\r\n");

    return `${rendered}\r\n`;
  }
}
