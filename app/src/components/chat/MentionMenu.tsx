import { memo, useState, useEffect, useRef } from "react";
import { MODELS } from "../../types";

export interface Mention {
  name: string;
  display: string;
  modelId: string;
}

const MENTION_OPTIONS: Mention[] = MODELS.map((m) => ({
  name: `@${m.display.replace(/\s/g, "")}`,
  display: m.display,
  modelId: m.id,
}));

interface Props {
  filter: string;
  onSelect: (mention: Mention) => void;
  onDismiss: () => void;
}

export default memo(function MentionMenu({ filter, onSelect, onDismiss }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = MENTION_OPTIONS.filter((m) =>
    m.name.toLowerCase().includes(filter.toLowerCase()) ||
    m.display.toLowerCase().includes(filter.toLowerCase())
  );

  useEffect(() => { setSelectedIdx(0); }, [filter]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, filtered.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && filtered.length > 0) {
        e.preventDefault();
        onSelect(filtered[selectedIdx]);
      } else if (e.key === "Escape") {
        e.preventDefault();
        onDismiss();
      }
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [filtered, selectedIdx, onSelect, onDismiss]);

  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (filtered.length === 0) return null;

  return (
    <div className="command-menu" ref={listRef}>
      {filtered.map((m, i) => (
        <div
          key={m.name}
          className={`command-item${i === selectedIdx ? " selected" : ""}`}
          onClick={() => onSelect(m)}
          onMouseEnter={() => setSelectedIdx(i)}
        >
          <span className="command-name">{m.name}</span>
          <span className="command-desc">{m.display}</span>
        </div>
      ))}
    </div>
  );
});
