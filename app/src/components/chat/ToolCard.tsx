import { memo, useState } from "react";

interface Props {
  tool: string;
  input: unknown;
  output?: string;
  success?: boolean;
}

/** Tool type icon with semantic meaning */
function toolIcon(tool: string): string {
  if (tool === "Read") return "\uD83D\uDCC4";
  if (tool === "Write" || tool === "Edit") return "\u270F\uFE0F";
  if (tool === "Bash") return "\u26A1";
  if (tool === "Glob" || tool === "Grep") return "\uD83D\uDD0D";
  return "\u2699\uFE0F";
}

export default memo(function ToolCard({ tool, input, output, success }: Props) {
  const [expanded, setExpanded] = useState(false);
  const inputStr = typeof input === "string" ? input : JSON.stringify(input, null, 2);
  const truncatedInput = inputStr.length > 300 ? inputStr.slice(0, 300) + "..." : inputStr;
  const pending = success === undefined;

  return (
    <div className={`tool-card${success === false ? " failed" : ""}`}>
      <div className="tool-card-header" onClick={() => setExpanded(!expanded)}>
        <span className={`tool-card-icon${pending ? " spinning" : ""}`}>
          {pending ? toolIcon(tool) : success ? "\u2713" : "\u2717"}
        </span>
        <span className="tool-card-name">{tool}</span>
        {!expanded && <span className="tool-card-preview">{truncatedInput.split("\n")[0].slice(0, 60)}</span>}
        <span className="tool-card-toggle">{expanded ? "\u25BE" : "\u25B8"}</span>
      </div>
      {expanded && (
        <div className="tool-card-body">
          <pre className="tool-card-input">{inputStr}</pre>
          {output && <pre className="tool-card-output">{output}</pre>}
        </div>
      )}
    </div>
  );
});
