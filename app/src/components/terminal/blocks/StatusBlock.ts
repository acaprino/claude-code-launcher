import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { fg, DIM, RESET, ICON } from "../AnsiUtils";

const GUTTER = `  ${DIM}${ICON.gutter}${RESET} `;

export class StatusBlock implements Block {
  readonly type = "status";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;

  constructor(
    public readonly id: string,
    public status: string,
    public model: string,
  ) {}

  render(_cols: number, palette: TerminalPalette): string {
    return `${GUTTER}${DIM}${fg(palette.textDim)}${this.status}${RESET}\r\n`;
  }
}
