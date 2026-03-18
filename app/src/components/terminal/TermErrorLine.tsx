import { memo } from "react";

interface Props {
  code: string;
  message: string;
}

const LABELS: Record<string, string> = {
  rate_limit: "RATE_LIMIT",
  overloaded_error: "OVERLOADED",
  context_length_exceeded: "CONTEXT_FULL",
  max_tokens: "CONTEXT_FULL",
};

export default memo(function TermErrorLine({ code, message }: Props) {
  const label = LABELS[code] || "ERROR";
  return (
    <div className="tv-error">
      <span className="tv-error-label">{label}</span>
      <span className="tv-error-sep">[{code}]</span>
      <span className="tv-error-msg">{message}</span>
    </div>
  );
});
