import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import { fg, DIM, RESET, ICON } from "../AnsiUtils";

const GUTTER = `  ${DIM}${ICON.gutter}${RESET} `;

export class DiffBlock implements Block {
  readonly type = "diff";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;
  status: "pending" | "success" | "fail" = "pending";
  additions = 0;
  deletions = 0;

  constructor(
    public readonly id: string,
    public tool: string,
    public filePath: string,
    public diffContent: string,
  ) {
    this.countChanges();
  }

  private countChanges(): void {
    let add = 0, del = 0;
    for (const line of this.diffContent.split("\n")) {
      if (line.startsWith("+") && !line.startsWith("+++")) add++;
      else if (line.startsWith("-") && !line.startsWith("---")) del++;
    }
    this.additions = add;
    this.deletions = del;
  }

  update(data: { success?: boolean }): boolean {
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

  render(cols: number, palette: TerminalPalette): string {
    const icon = this.statusIcon(palette);
    const fileName = this.filePath.split(/[/\\]/).pop() || this.filePath;
    const stats = this.additions || this.deletions
      ? ` ${fg(palette.green)}+${this.additions}${RESET} ${fg(palette.red)}-${this.deletions}${RESET}`
      : "";
    const header = `${GUTTER}${icon} ${this.tool} ${fileName}${stats}`;

    // Pending: just header. Resolved: header only (diff details not needed inline).
    if (this.status === "pending") {
      return `${header}\r\n`;
    }

    // Show a few diff lines on success for context, all on failure
    const maxLines = this.status === "fail" ? 20 : 6;
    const diffLines = this.diffContent.split("\n").slice(0, maxLines);
    const lines = [header];

    for (const line of diffLines) {
      const maxLen = cols - 8;
      const truncated = line.length > maxLen ? line.slice(0, maxLen - 3) + "..." : line;
      if (line.startsWith("+") && !line.startsWith("+++")) {
        lines.push(`${GUTTER}  ${fg(palette.green)}${truncated}${RESET}`);
      } else if (line.startsWith("-") && !line.startsWith("---")) {
        lines.push(`${GUTTER}  ${fg(palette.red)}${truncated}${RESET}`);
      } else {
        lines.push(`${GUTTER}  ${DIM}${truncated}${RESET}`);
      }
    }

    const totalDiffLines = this.diffContent.split("\n").length;
    if (totalDiffLines > maxLines) {
      lines.push(`${GUTTER}  ${DIM}... ${totalDiffLines - maxLines} more lines${RESET}`);
    }

    return lines.join("\r\n") + "\r\n";
  }
}
