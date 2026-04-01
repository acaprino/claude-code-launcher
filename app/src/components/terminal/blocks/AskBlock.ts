import type { Block } from "./Block";
import type { TerminalPalette } from "../themes";
import type { AskQuestionItem } from "../../../types";
import { fg, BOLD, DIM, RESET, ICON } from "../AnsiUtils";

const GUTTER = `  ${DIM}${ICON.gutter}${RESET} `;

export class AskBlock implements Block {
  readonly type = "ask";
  readonly timestamp = Date.now();
  startLine = 0;
  lineCount = 0;
  frozen = false;
  resolved = false;
  answers?: Record<string, string>;
  currentStep = 0;

  constructor(public readonly id: string, public questions: AskQuestionItem[]) {}

  update(data: { resolved?: boolean; answers?: Record<string, string> }): boolean {
    if (data.resolved !== undefined) this.resolved = data.resolved;
    if (data.answers !== undefined) this.answers = data.answers;
    return true;
  }

  render(_cols: number, palette: TerminalPalette): string {
    const lines: string[] = [];

    if (this.resolved && this.answers) {
      for (let i = 0; i < this.questions.length; i++) {
        const q = this.questions[i];
        const a = this.answers[String(i)] || "(no answer)";
        lines.push(`${GUTTER}${fg(palette.textDim)}${q.header}:${RESET} ${a}`);
      }
      return lines.join("\r\n") + "\r\n";
    }

    const q = this.questions[this.currentStep];
    if (!q) {
      return `${GUTTER}${DIM}(waiting for answer...)${RESET}\r\n`;
    }

    lines.push(`${GUTTER}${BOLD}${q.question}${RESET}`);
    if (q.header) {
      lines.push(`${GUTTER}${fg(palette.textDim)}${q.header}${RESET}`);
    }
    lines.push(`${GUTTER}`);

    for (let i = 0; i < q.options.length; i++) {
      const opt = q.options[i];
      lines.push(`${GUTTER}${fg(palette.accent)}${i + 1}.${RESET} ${opt.label}`);
      if (opt.description) {
        lines.push(`${GUTTER}   ${DIM}${opt.description}${RESET}`);
      }
    }

    if (this.questions.length > 1) {
      lines.push(`${GUTTER}${DIM}(${this.currentStep + 1}/${this.questions.length})${RESET}`);
    }

    return lines.join("\r\n") + "\r\n";
  }
}
