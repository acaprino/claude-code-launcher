import { memo, useState, useEffect, useLayoutEffect, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { AgentInfoSDK } from "../../types";

export interface Mention {
  name: string;
  display: string;
}

interface Props {
  filter: string;
  agents?: AgentInfoSDK[];
  onSelect: (mention: Mention) => void;
  onDismiss: () => void;
}

export default memo(function MentionMenu({ filter, agents = [], onSelect, onDismiss }: Props) {
  const [selectedIdx, setSelectedIdx] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [style, setStyle] = useState<React.CSSProperties>({ visibility: "hidden", position: "fixed" });

  const filtered = useMemo(() => {
    const options: Mention[] = agents.map((a) => ({
      name: `@${a.name}`,
      display: a.description,
    }));
    const lf = filter.replace(/^@/, "").toLowerCase();
    if (!lf) return options;
    const matches = options.filter(
      (m) => m.name.toLowerCase().includes(lf) || m.display.toLowerCase().includes(lf),
    );
    const starts: Mention[] = [];
    const rest: Mention[] = [];
    for (const m of matches) {
      (m.name.slice(1).toLowerCase().startsWith(lf) ? starts : rest).push(m);
    }
    return [...starts, ...rest];
  }, [agents, filter]);

  useEffect(() => { setSelectedIdx(0); }, [filter]);

  useLayoutEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    const update = () => {
      const rect = wrapper.getBoundingClientRect();
      const spaceAbove = rect.top - 8;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const maxH = Math.max(120, Math.min(Math.max(spaceAbove, spaceBelow), 400));
      if (spaceAbove >= spaceBelow) {
        setStyle({ position: "fixed", bottom: window.innerHeight - rect.top + 2, top: "auto", left: rect.left, right: "auto", width: rect.width, maxHeight: maxH });
      } else {
        setStyle({ position: "fixed", top: rect.bottom + 2, bottom: "auto", left: rect.left, right: "auto", width: rect.width, maxHeight: maxH });
      }
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [filtered.length]);

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

  const menu = (
    <div className="command-menu" ref={listRef} style={style}>
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

  return (
    <>
      <div ref={wrapperRef} style={{ height: 0, overflow: "hidden" }} />
      {createPortal(menu, document.body)}
    </>
  );
});
