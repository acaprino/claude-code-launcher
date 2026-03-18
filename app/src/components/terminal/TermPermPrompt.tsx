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

export default memo(function TermPermPrompt({ tool, description, suggestions, resolved, allowed, onRespond }: Props) {
  if (resolved) {
    return (
      <div className={`tv-perm tv-perm--resolved ${allowed ? "tv-perm--allowed" : "tv-perm--denied"}`}>
        <span className="tv-perm-icon">{allowed ? "\u2713" : "\u2717"}</span>
        <span className="tv-perm-label">{allowed ? "Allowed" : "Denied"}: {tool}: {description}</span>
      </div>
    );
  }

  return (
    <div className="tv-perm tv-perm--pending">
      <span className="tv-perm-q">Allow <strong>{tool}</strong>: {description}?</span>
      <span className="tv-perm-actions">
        <button className="tv-perm-btn tv-perm-btn--yes" onClick={() => onRespond(true)}>[<u>Y</u>]es</button>
        {suggestions && suggestions.length > 0 && (
          <button className="tv-perm-btn tv-perm-btn--all" onClick={() => onRespond(true, suggestions)}>[<u>A</u>]ll</button>
        )}
        <button className="tv-perm-btn tv-perm-btn--no" onClick={() => onRespond(false)}>[<u>N</u>]o</button>
      </span>
    </div>
  );
});
