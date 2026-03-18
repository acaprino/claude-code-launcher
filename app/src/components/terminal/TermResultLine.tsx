import { memo } from "react";
import { fmtTokens } from "../../utils/format";

interface Props {
  cost: number;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  turns: number;
  durationMs: number;
}

export default memo(function TermResultLine({ cost, inputTokens, outputTokens, cacheReadTokens, turns, durationMs }: Props) {
  const safe = (n: number) => (Number.isFinite(n) ? n : 0);
  const totalTokens = safe(inputTokens) + safe(outputTokens);
  const cached = safe(cacheReadTokens) > 0 ? ` (${fmtTokens(safe(cacheReadTokens))} cached)` : "";

  return (
    <div className="tv-result">
      <span className="tv-result-rule" />
      <span>${safe(cost).toFixed(3)}</span>
      <span className="tv-result-sep">{"\u00b7"}</span>
      <span>{fmtTokens(totalTokens)} tok{cached}</span>
      <span className="tv-result-sep">{"\u00b7"}</span>
      <span>{safe(turns)}t</span>
      <span className="tv-result-sep">{"\u00b7"}</span>
      <span>{(safe(durationMs) / 1000).toFixed(1)}s</span>
      <span className="tv-result-rule" />
    </div>
  );
});
