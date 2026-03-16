import { memo, useState, useEffect, useRef } from "react";

interface Props {
  text: string;
  ended?: boolean;
}

export default memo(function ThinkingBlock({ text, ended }: Props) {
  const [collapsed, setCollapsed] = useState(false);
  const [showDots, setShowDots] = useState(true);
  const dotsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show dots for first 500ms, then switch to text
  useEffect(() => {
    if (text.length > 0) {
      setShowDots(false);
    } else if (!dotsTimerRef.current) {
      dotsTimerRef.current = setTimeout(() => setShowDots(false), 500);
    }
    return () => {
      if (dotsTimerRef.current) clearTimeout(dotsTimerRef.current);
    };
  }, [text]);

  // Auto-collapse when thinking ends
  useEffect(() => {
    if (ended) setCollapsed(true);
  }, [ended]);

  const lineCount = text.split("\n").length;

  return (
    <div className={`thinking-block${ended ? " ended" : ""}`}>
      <div className="thinking-block-header" onClick={() => setCollapsed(!collapsed)}>
        <span className="thinking-block-icon">
          {ended ? "\uD83E\uDDE0" : "\uD83E\uDDE0"}
        </span>
        <span className="thinking-block-title">
          {collapsed ? `Thinking (${lineCount} lines)` : "Thinking"}
        </span>
        <span className="thinking-block-toggle">{collapsed ? "\u25B8" : "\u25BE"}</span>
      </div>
      {!collapsed && (
        <div className="thinking-block-body">
          {showDots && text.length === 0 ? (
            <div className="thinking-indicator">
              <span className="thinking-dot" />
              <span className="thinking-dot" />
              <span className="thinking-dot" />
            </div>
          ) : (
            <span className="thinking-block-text">{text}</span>
          )}
        </div>
      )}
    </div>
  );
});
