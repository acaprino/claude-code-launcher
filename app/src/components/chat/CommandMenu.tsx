import { memo, useState, useEffect, useRef } from "react";

export interface Command {
  name: string;
  description: string;
  action: string; // "execute" runs immediately, "insert" puts text in input
}

const DEFAULT_COMMANDS: Command[] = [
  { name: "/clear", description: "Clear chat messages", action: "execute" },
  { name: "/compact", description: "Summarize conversation", action: "insert" },
  { name: "/model", description: "Switch model", action: "insert" },
  { name: "/effort", description: "Switch effort level", action: "insert" },
  { name: "/help", description: "Show help", action: "execute" },
  { name: "/sessions", description: "Browse sessions", action: "execute" },
  { name: "/theme", description: "Change theme", action: "execute" },
  { name: "/sidebar", description: "Toggle right sidebar", action: "execute" },
];

interface Props {
  filter: string;
  onSelect: (command: Command) => void;
  onDismiss: () => void;
}

export default memo(function CommandMenu({ filter, onSelect, onDismiss }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = DEFAULT_COMMANDS.filter((c) =>
    c.name.toLowerCase().includes(filter.toLowerCase()) ||
    c.description.toLowerCase().includes(filter.toLowerCase())
  );

  // Reset selection when filter changes
  useEffect(() => { setSelectedIdx(0); }, [filter]);

  // Keyboard navigation
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

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.children[selectedIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (filtered.length === 0) return null;

  return (
    <div className="command-menu" ref={listRef}>
      {filtered.map((cmd, i) => (
        <div
          key={cmd.name}
          className={`command-item${i === selectedIdx ? " selected" : ""}`}
          onClick={() => onSelect(cmd)}
          onMouseEnter={() => setSelectedIdx(i)}
        >
          <span className="command-name">{cmd.name}</span>
          <span className="command-desc">{cmd.description}</span>
        </div>
      ))}
    </div>
  );
});
