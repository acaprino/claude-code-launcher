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
  private startTime = Date.now();

  constructor(public readonly id: string, public text: string) {}

  append(_chunk: string): void {
    // No-op: thinking text is displayed by the sidebar via useBufferedText,
    // not from this block. Skipping accumulation saves memory during
    // high-frequency thinking events (~8ms intervals).
  }

  end(): void {
    this.ended = true;
  }

  render(_cols: number, palette: TerminalPalette): string {
    const elapsed = ((Date.now() - this.startTime) / 1000).toFixed(0);
    const icon = this.ended
      ? `${fg(palette.textDim)}${ICON.thinking}${RESET}`
      : `${fg(palette.accent)}${ICON.thinking}${RESET}`;
    const label = this.ended
      ? `Thought for ${elapsed}s`
      : "Thinking...";

    return `  ${icon} ${DIM}${ITALIC}${label}${RESET}\r\n`;
  }
}
