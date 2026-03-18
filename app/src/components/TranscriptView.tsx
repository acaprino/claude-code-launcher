import { memo, useEffect, useState, useRef, useCallback } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { getAgentMessages } from "../hooks/useAgentSession";
import "./TranscriptView.css";

interface TranscriptEntry {
  id: string;
  role: "user" | "assistant" | "tool" | "result";
  text: string;
  tool?: string;
}

interface Props {
  sessionId: string;
  tabId: string;
  isActive: boolean;
  onRequestClose: (tabId: string) => void;
}

/** Extract readable entries from raw SDK messages. */
function parseMessages(raw: { type: string; message: unknown }[]): TranscriptEntry[] {
  const entries: TranscriptEntry[] = [];
  let idx = 0;

  for (const msg of raw) {
    const m = msg.message as Record<string, unknown>;
    if (!m) continue;

    if (msg.type === "human") {
      const content = m.content;
      let text = "";
      if (typeof content === "string") {
        text = content;
      } else if (Array.isArray(content)) {
        text = content
          .filter((c: Record<string, unknown>) => c.type === "text")
          .map((c: Record<string, unknown>) => c.text as string)
          .join("\n");
      }
      if (text) {
        entries.push({ id: `t-${idx++}`, role: "user", text });
      }
    } else if (msg.type === "assistant") {
      const content = m.content;
      if (Array.isArray(content)) {
        // Extract text blocks
        const textParts: string[] = [];
        for (const block of content) {
          const b = block as Record<string, unknown>;
          if (b.type === "text" && b.text) {
            textParts.push(b.text as string);
          } else if (b.type === "tool_use") {
            const inputStr = typeof b.input === "string"
              ? b.input
              : JSON.stringify(b.input, null, 2);
            const preview = inputStr.split("\n")[0].slice(0, 80);
            entries.push({
              id: `t-${idx++}`,
              role: "tool",
              text: preview,
              tool: b.name as string,
            });
          }
        }
        if (textParts.length > 0) {
          entries.push({ id: `t-${idx++}`, role: "assistant", text: textParts.join("\n") });
        }
      }
    } else if (msg.type === "result") {
      const cost = (m as Record<string, unknown>).cost_usd;
      const turns = (m as Record<string, unknown>).num_turns;
      if (cost !== undefined) {
        entries.push({
          id: `t-${idx++}`,
          role: "result",
          text: `Cost: $${Number(cost).toFixed(4)} | Turns: ${turns ?? "?"}`,
        });
      }
    }
  }
  return entries;
}

export default memo(function TranscriptView({ sessionId, tabId, isActive, onRequestClose }: Props) {
  const [entries, setEntries] = useState<TranscriptEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!sessionId) return;
    setLoading(true);
    getAgentMessages(sessionId)
      .then((raw) => {
        const msgs = (raw as { messages?: unknown[] })?.messages;
        if (Array.isArray(msgs)) {
          setEntries(parseMessages(msgs as { type: string; message: unknown }[]));
        } else {
          setEntries([]);
        }
        setError(null);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [sessionId]);

  const virtualizer = useVirtualizer({
    count: entries.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => 48,
    overscan: 10,
  });

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!isActive) return;
    if (e.key === "Escape") {
      e.preventDefault();
      onRequestClose(tabId);
    }
  }, [isActive, tabId, onRequestClose]);

  useEffect(() => {
    if (!isActive) return;
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isActive, handleKeyDown]);

  if (loading) {
    return <div className="transcript-view"><div className="transcript-loading">Loading transcript...</div></div>;
  }

  if (error) {
    return <div className="transcript-view"><div className="transcript-error">{error}</div></div>;
  }

  if (entries.length === 0) {
    return <div className="transcript-view"><div className="transcript-empty">No messages in this session.</div></div>;
  }

  return (
    <div className="transcript-view">
      <div className="transcript-header">
        <span className="transcript-title">Session Transcript</span>
        <span className="transcript-id">{sessionId.slice(0, 12)}...</span>
        <span className="transcript-count">{entries.length} messages</span>
      </div>
      <div ref={containerRef} className="transcript-scroll">
        <div style={{ height: virtualizer.getTotalSize(), width: "100%", position: "relative" }}>
          {virtualizer.getVirtualItems().map((row) => {
            const entry = entries[row.index];
            return (
              <div
                key={entry.id}
                data-index={row.index}
                ref={virtualizer.measureElement}
                className={`transcript-entry transcript-${entry.role}`}
                style={{ position: "absolute", top: 0, left: 0, width: "100%", transform: `translateY(${row.start}px)` }}
              >
                <span className="transcript-role">{entry.role === "tool" ? `$ ${entry.tool}` : entry.role}</span>
                <div className="transcript-text">{entry.text}</div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
});
