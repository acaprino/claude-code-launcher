import { memo, useEffect, useMemo, useState } from "react";

interface Props {
  text: string;
  ended?: boolean;
}

export default memo(function TermThinkingLine({ text, ended }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const lineCount = useMemo(() => {
    if (!text) return 0;
    let count = 1;
    for (let i = 0; i < text.length; i++) if (text[i] === "\n") count++;
    return count;
  }, [text]);

  // Tick elapsed time while thinking is active
  useEffect(() => {
    if (ended) return;
    const start = Date.now();
    const id = setInterval(() => setElapsed(Math.floor((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(id);
  }, [ended]);

  return (
    <div className={`tv-thinking${ended ? " tv-thinking--ended" : ""}`}>
      <span className="tv-thinking-header" onClick={() => setExpanded(!expanded)}>
        {!ended && <span className="tv-thinking-dot" />}
        <span className="tv-thinking-tag">[thinking]</span>
        <span className="tv-thinking-count">{lineCount} line{lineCount !== 1 ? "s" : ""}</span>
        {!ended && elapsed > 0 && <span className="tv-thinking-elapsed">{elapsed}s</span>}
        <span className="tv-thinking-toggle">{expanded ? "\u25BE" : "\u25B8"}</span>
      </span>
      {expanded && text && (
        <pre className="tv-thinking-body">{text}</pre>
      )}
    </div>
  );
});
