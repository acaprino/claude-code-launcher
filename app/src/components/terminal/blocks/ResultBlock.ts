import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { horizontalRule } from "../AnsiUtils";

export class ResultBlock implements Block {
  readonly type = "result";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;

  constructor(
    public readonly id: string,
    public cost: number,
    public inputTokens: number,
    public outputTokens: number,
    public cacheReadTokens: number,
    public cacheWriteTokens: number,
    public turns: number,
    public durationMs: number,
    public sessionId: string,
  ) {}

  private fmtTokens(n: number): string {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
    return String(n);
  }

  render(cols: number, palette: TerminalPalette): string {
    const totalTok = this.inputTokens + this.outputTokens + this.cacheReadTokens + this.cacheWriteTokens;
    const secs = (this.durationMs / 1000).toFixed(1);
    const text = `$${this.cost.toFixed(3)} \u00b7 ${this.fmtTokens(totalTok)} tok \u00b7 ${this.turns}t \u00b7 ${secs}s`;

    return `${horizontalRule(text, cols, palette.textDim)}\r\n\r\n`;
  }
}
