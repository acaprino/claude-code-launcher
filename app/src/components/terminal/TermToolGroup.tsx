import { memo, useState } from "react";
import type { ChatMessage } from "../../types";
import TermToolLine from "./TermToolLine";

type ToolMessage = Extract<ChatMessage, { role: "tool" }>;

interface Props {
  tools: ToolMessage[];
}

export default memo(function TermToolGroup({ tools }: Props) {
  const [expanded, setExpanded] = useState(false);

  // Count by tool name
  const counts = new Map<string, number>();
  let allDone = true;
  let anyFailed = false;
  for (const t of tools) {
    counts.set(t.tool, (counts.get(t.tool) || 0) + 1);
    if (t.success === undefined) allDone = false;
    if (t.success === false) anyFailed = true;
  }

  const statusChar = !allDone ? "\u25CB" : anyFailed ? "\u2717" : "\u2713";
  const statusClass = !allDone ? "pending" : anyFailed ? "fail" : "ok";

  const summary = Array.from(counts)
    .map(([name, count]) => count > 1 ? `${name}\u00d7${count}` : name)
    .join(", ");

  if (expanded) {
    return (
      <div className="tv-tool-group">
        <div className="tv-toolgrp-header" onClick={() => setExpanded(false)}>
          <span className="tv-tool-sigil">$</span>
          <span className="tv-toolgrp-summary">{summary}</span>
          <span className={`tv-tool-status ${statusClass}`}>{statusChar}</span>
          <span className="tv-toolgrp-toggle">{"\u25BE"}</span>
        </div>
        {tools.map(t => (
          <TermToolLine key={t.id} tool={t.tool} input={t.input} output={t.output} success={t.success} />
        ))}
      </div>
    );
  }

  return (
    <div className="tv-tool-group">
      <div className="tv-toolgrp-header" onClick={() => setExpanded(true)}>
        <span className="tv-tool-sigil">$</span>
        <span className="tv-toolgrp-summary">{summary}</span>
        <span className={`tv-tool-status ${statusClass}`}>{statusChar}</span>
        <span className="tv-toolgrp-toggle">{"\u25B8"}</span>
      </div>
    </div>
  );
});
