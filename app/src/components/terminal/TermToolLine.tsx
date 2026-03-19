import { memo, useMemo, useState } from "react";
import { linkifyPaths } from "../../utils/linkifyPaths";

interface Props {
  tool: string;
  input: unknown;
  output?: string;
  success?: boolean;
  isLatest?: boolean;
}

/** Extract a human-readable one-line preview from tool input */
function extractPreview(tool: string, input: unknown): string {
  if (typeof input === "string") return input.slice(0, 80);
  const obj = input as Record<string, unknown> | undefined;
  if (!obj) return "";
  switch (tool) {
    case "Bash":
      return String(obj.command || "").slice(0, 120);
    case "Read":
      return shortPath(String(obj.file_path || ""));
    case "Edit":
    case "Write":
      return shortPath(String(obj.file_path || ""));
    case "Grep":
      return `/${obj.pattern || ""}/ ${obj.path ? shortPath(String(obj.path)) : ""}`.trim();
    case "Glob":
      return String(obj.pattern || "");
    case "Agent": {
      const desc = String(obj.description || obj.prompt || "");
      return desc.slice(0, 80);
    }
    default: {
      // Try common field names
      const first = obj.file_path || obj.path || obj.command || obj.pattern || obj.query || obj.prompt || obj.description || obj.url || "";
      return String(first).slice(0, 80);
    }
  }
}

function shortPath(p: string): string {
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 2) return parts.join("/");
  return ".../" + parts.slice(-2).join("/");
}

export default memo(function TermToolLine({ tool, input, output, success, isLatest }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [outputExpanded, setOutputExpanded] = useState(false);
  const inputStr = useMemo(
    () => typeof input === "string" ? input : JSON.stringify(input, null, 2),
    [input],
  );
  const preview = useMemo(() => extractPreview(tool, input), [tool, input]);
  const pending = success === undefined;

  const outputLines = output ? output.split("\n") : [];
  const isLongOutput = outputLines.length > 20;
  const showFullOutput = !isLongOutput || outputExpanded || isLatest;

  return (
    <div className={`tv-tool${success === false ? " tv-tool--fail" : ""}`}>
      <div className="tv-tool-header" onClick={() => setExpanded(!expanded)}>
        <span className="tv-tool-sigil">$</span>
        <span className="tv-tool-name">{tool}</span>
        {!expanded && preview && <span className="tv-tool-preview">{preview}</span>}
        <span className={`tv-tool-status${pending ? " pending" : success ? " ok" : " fail"}`}>
          {pending ? "\u25CB" : success ? "\u2713" : "\u2717"}
        </span>
      </div>
      {expanded && (
        <div className="tv-tool-body">
          <pre className="tv-tool-input">{inputStr}</pre>
          {output && (
            <>
              {showFullOutput ? (
                <pre className={`tv-tool-output${success === false ? " tv-tool-output--fail" : ""}`}>{linkifyPaths(output, "tout-")}</pre>
              ) : (
                <div
                  className="tv-tool-collapsed"
                  onClick={(e) => { e.stopPropagation(); setOutputExpanded(true); }}
                >
                  {"\u25B8"} {outputLines.length} lines — click to expand
                </div>
              )}
              {showFullOutput && isLongOutput && !isLatest && (
                <div
                  className="tv-tool-collapsed"
                  onClick={(e) => { e.stopPropagation(); setOutputExpanded(false); }}
                >
                  {"\u25BE"} collapse
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
});
