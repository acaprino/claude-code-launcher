import { memo } from "react";
import type { PermissionSuggestion } from "../../types";

interface Props {
  tool: string;
  description: string;
  suggestions?: PermissionSuggestion[];
  resolved?: boolean;
  allowed?: boolean;
  onRespond: (allow: boolean, suggestions?: PermissionSuggestion[]) => void;
}

/** Color-coded type icon for permission requests */
function permIcon(tool: string): { icon: string; colorClass: string } {
  if (tool === "Read" || tool === "Glob" || tool === "Grep") return { icon: "\uD83D\uDCC4", colorClass: "perm-type-read" };
  if (tool === "Write" || tool === "Edit") return { icon: "\u270F\uFE0F", colorClass: "perm-type-write" };
  if (tool === "Bash") return { icon: "\u26A1", colorClass: "perm-type-exec" };
  if (tool === "WebFetch" || tool === "WebSearch") return { icon: "\uD83C\uDF10", colorClass: "perm-type-web" };
  return { icon: "\u2699\uFE0F", colorClass: "" };
}

export default memo(function PermissionCard({ tool, description, suggestions, resolved, allowed, onRespond }: Props) {
  const { icon, colorClass } = permIcon(tool);

  if (resolved) {
    return (
      <div className={`perm-card resolved ${allowed ? "allowed" : "denied"}`}>
        <span className="perm-card-icon">{allowed ? "\u2713" : "\u2717"}</span>
        <span className="perm-card-label">{allowed ? "Allowed" : "Denied"}: {tool}: {description}</span>
      </div>
    );
  }

  return (
    <div className={`perm-card pending ${colorClass}`}>
      <div className="perm-card-question">
        <span className="perm-card-type-icon">{icon}</span>
        {" "}Allow <strong>{tool}</strong>: {description}?
      </div>
      <div className="perm-card-actions">
        <button className="perm-btn perm-btn--yes" onClick={() => onRespond(true)}>Yes</button>
        {suggestions && suggestions.length > 0 && (
          <button className="perm-btn perm-btn--session" onClick={() => onRespond(true, suggestions)}>
            Yes, for session
          </button>
        )}
        <button className="perm-btn perm-btn--no" onClick={() => onRespond(false)}>No</button>
      </div>
    </div>
  );
});
