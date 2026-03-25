import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { fg, DIM, ITALIC, RESET, ICON } from "../AnsiUtils";

export class ThinkingBlock implements Block {
  readonly type = "thinking";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;
  ended = false;

  constructor(public readonly id: string, public text: string) {}

  append(chunk: string): void {
    this.text += chunk;
  }

  end(): void {
    this.ended = true;
  }

  private lineCountOfText(): number {
    return this.text.split("\n").length;
  }

  render(_cols: number, palette: TerminalPalette): string {
    const count = this.lineCountOfText();
    const icon = this.ended
      ? `${fg(palette.textDim)}${ICON.thinking}${RESET}`
      : `${fg(palette.accent)}${ICON.thinking}${RESET}`;
    const label = this.ended ? "Thought" : "Thinking...";

    return `  ${icon} ${DIM}${ITALIC}${label} (${count} lines)${RESET}\r\n`;
  }
}
