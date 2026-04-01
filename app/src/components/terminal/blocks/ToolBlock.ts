import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { fg, DIM, RESET, ICON, sanitizeAgentText } from "../AnsiUtils";

const GUTTER = `  ${DIM}${ICON.gutter}${RESET} `;

export class ToolBlock implements Block {
  readonly type = "tool";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;
  status: "pending" | "success" | "fail" = "pending";
  output?: string;
  readonly toolUseId?: string;

  constructor(
    public readonly id: string,
    public tool: string,
    public input: unknown,
    toolUseId?: string,
  ) {
    this.toolUseId = toolUseId;
  }

  update(data: { output?: string; success?: boolean }): boolean {
    if (data.output !== undefined) this.output = data.output;
    if (data.success !== undefined) this.status = data.success ? "success" : "fail";
    return true;
  }

  private statusIcon(palette: TerminalPalette): string {
    switch (this.status) {
      case "pending": return `${DIM}${ICON.bullet}${RESET}`;
      case "success": return `${fg(palette.green)}${ICON.bullet} ${ICON.success}${RESET}`;
      case "fail": return `${fg(palette.red)}${ICON.bullet} ${ICON.fail}${RESET}`;
    }
  }

  private inputSummary(): string {
    if (!this.input || typeof this.input !== "object") return "";
    const obj = this.input as Record<string, unknown>;
    const path = (obj.file_path as string) || (obj.path as string) || (obj.command as string) || "";
    if (path) {
      const short = path.length > 60 ? "..." + path.slice(-57) : path;
      return sanitizeAgentText(short);
    }
    return "";
  }

  render(_cols: number, palette: TerminalPalette): string {
    const icon = this.statusIcon(palette);
    const summary = this.inputSummary();
    const toolLabel = summary ? `${this.tool} ${DIM}${summary}${RESET}` : this.tool;

    const lines: string[] = [`${GUTTER}${icon} ${toolLabel}`];

    // Show output only on error (max 5 lines)
    if (this.status === "fail" && this.output) {
      const sanitized = sanitizeAgentText(this.output);
      const errLines = sanitized.split("\n").slice(0, 5);
      for (const line of errLines) {
        lines.push(`${GUTTER}  ${fg(palette.red)}${line}${RESET}`);
      }
    }

    return lines.join("\r\n") + "\r\n";
  }
}
