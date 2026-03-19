import { open as shellOpen } from "@tauri-apps/plugin-shell";

// Match Windows absolute paths (D:\..., D:/...) and relative paths (.\..., ..\...)
// Must contain at least one path separator after the prefix and end at whitespace/quote/paren/EOL
const PATH_RE = /(?:[A-Za-z]:[/\\]|\.{1,2}[/\\])[\w./\\:@-]+/g;

function handlePathClick(e: React.MouseEvent, path: string) {
  e.preventDefault();
  e.stopPropagation();
  shellOpen(path).catch((err) => console.debug("[linkify] open failed:", err));
}

/** Split text into segments, wrapping file paths in clickable spans */
export function linkifyPaths(text: string, keyPrefix = ""): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  const re = new RegExp(PATH_RE.source, "g"); // fresh instance per call
  while ((match = re.exec(text)) !== null) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const path = match[0];
    parts.push(
      <span
        key={`${keyPrefix}p${match.index}`}
        className="tv-path-link"
        title={`Open ${path}`}
        onClick={(e) => handlePathClick(e, path)}
      >
        {path}
      </span>
    );
    last = match.index + match[0].length;
  }
  if (last === 0) return [text]; // no paths found — return original string
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
