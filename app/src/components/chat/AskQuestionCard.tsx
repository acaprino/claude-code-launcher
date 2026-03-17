import { memo, useCallback, useEffect, useRef, useState } from "react";
import type { AskQuestionItem } from "../../types";

interface Props {
  questions: AskQuestionItem[];
  resolved?: boolean;
  answers?: Record<string, string>;
  onRespond: (answers: Record<string, string>) => void;
}

export default memo(function AskQuestionCard({ questions, resolved, answers, onRespond }: Props) {
  const [activeStep, setActiveStep] = useState(0);
  const [selections, setSelections] = useState<Map<number, Set<number>>>(() => new Map());
  const [customInputs, setCustomInputs] = useState<Map<number, string>>(() => new Map());
  const [focusedOption, setFocusedOption] = useState(0);
  const [customMode, setCustomMode] = useState(false);
  const customRef = useRef<HTMLInputElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const submittedRef = useRef(false);

  const q = questions[activeStep];
  const totalSteps = questions.length;

  // Focus card on mount and step change
  useEffect(() => {
    if (!resolved) cardRef.current?.focus();
  }, [activeStep, resolved]);

  // Focus custom input when entering custom mode
  useEffect(() => {
    if (customMode && customRef.current) {
      customRef.current.focus();
    }
  }, [customMode]);

  const toggleSelection = useCallback((optIdx: number) => {
    setSelections(prev => {
      const next = new Map(prev);
      const stepSet = new Set(next.get(activeStep) || []);
      if (q.multiSelect) {
        if (stepSet.has(optIdx)) stepSet.delete(optIdx);
        else stepSet.add(optIdx);
      } else {
        stepSet.clear();
        stepSet.add(optIdx);
      }
      next.set(activeStep, stepSet);
      return next;
    });
    setCustomMode(false);
  }, [activeStep, q?.multiSelect]);

  const getStepAnswer = useCallback((stepIdx: number): string => {
    const sel = selections.get(stepIdx);
    const custom = customInputs.get(stepIdx)?.trim();
    const labels: string[] = [];
    if (sel) {
      for (const idx of sel) {
        labels.push(questions[stepIdx].options[idx]?.label || "");
      }
    }
    if (custom) labels.push(custom);
    return labels.join(", ");
  }, [selections, customInputs, questions]);

  const handleNext = useCallback(() => {
    if (activeStep < totalSteps - 1) {
      setActiveStep(s => s + 1);
      setFocusedOption(0);
      setCustomMode(false);
    } else {
      // Submit all answers (guard against double-submit)
      if (submittedRef.current) return;
      submittedRef.current = true;
      const result: Record<string, string> = {};
      for (let i = 0; i < questions.length; i++) {
        result[String(i)] = getStepAnswer(i);
      }
      onRespond(result);
    }
  }, [activeStep, totalSteps, questions, getStepAnswer, onRespond]);

  const handlePrev = useCallback(() => {
    if (activeStep > 0) {
      setActiveStep(s => s - 1);
      setFocusedOption(0);
      setCustomMode(false);
    }
  }, [activeStep]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (resolved) return;

    if (customMode) {
      if (e.key === "Escape") {
        e.preventDefault();
        setCustomMode(false);
        cardRef.current?.focus();
      } else if (e.key === "Enter") {
        e.preventDefault();
        handleNext();
      }
      return;
    }

    const totalOptions = q.options.length + 1; // +1 for "Other"

    switch (e.key) {
      case "ArrowUp":
      case "k":
        e.preventDefault();
        setFocusedOption(f => (f - 1 + totalOptions) % totalOptions);
        break;
      case "ArrowDown":
      case "j":
        e.preventDefault();
        setFocusedOption(f => (f + 1) % totalOptions);
        break;
      case "ArrowLeft":
        e.preventDefault();
        handlePrev();
        break;
      case "ArrowRight":
        e.preventDefault();
        handleNext();
        break;
      case " ":
      case "Enter":
        e.preventDefault();
        if (focusedOption < q.options.length) {
          toggleSelection(focusedOption);
          if (!q.multiSelect) handleNext();
        } else {
          // "Other" option
          setCustomMode(true);
        }
        break;
      case "Tab":
        e.preventDefault();
        if (e.shiftKey) handlePrev();
        else handleNext();
        break;
      default:
        // Number keys 1-N for quick selection
        if (/^[1-9]$/.test(e.key)) {
          const idx = parseInt(e.key) - 1;
          if (idx < q.options.length) {
            toggleSelection(idx);
            if (!q.multiSelect) handleNext();
          }
        }
        break;
    }
  }, [resolved, customMode, q, focusedOption, handleNext, handlePrev, toggleSelection]);

  // ── Resolved state ──────────────────────────────────────────────
  if (resolved && answers) {
    return (
      <div className="ask-card resolved">
        <span className="ask-card-icon">{"\u2713"}</span>
        <span className="ask-card-summary">
          {questions.map((q, i) => {
            const answer = answers[String(i)] || "";
            return (
              <span key={i} className="ask-card-answer">
                <span className="ask-card-answer-header">{q.header}</span>
                <span className="ask-card-answer-value">{answer || "(skipped)"}</span>
                {i < questions.length - 1 && <span className="ask-card-answer-sep">{"\u00b7"}</span>}
              </span>
            );
          })}
        </span>
      </div>
    );
  }

  // ── Pending state: terminal-style wizard ────────────────────────
  const stepSelections = selections.get(activeStep) || new Set<number>();
  const customInput = customInputs.get(activeStep) || "";

  return (
    <div
      className="ask-card pending"
      ref={cardRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* Horizontal step tabs */}
      <div className="ask-card-tabs">
        <span className="ask-card-tabs-arrow">{activeStep > 0 ? "\u2190" : " "}</span>
        {questions.map((step, i) => {
          const isDone = i < activeStep || (selections.get(i)?.size || 0) > 0 || (customInputs.get(i)?.trim() || "");
          const isCurrent = i === activeStep;
          return (
            <button
              key={i}
              className={`ask-card-tab${isCurrent ? " active" : ""}${isDone ? " done" : ""}`}
              onClick={() => { setActiveStep(i); setFocusedOption(0); setCustomMode(false); }}
              tabIndex={-1}
            >
              <span className="ask-card-tab-check">
                {isCurrent ? "[X]" : isDone ? "\u2713" : "[ ]"}
              </span>
              {" "}{step.header}
            </button>
          );
        })}
        <span className="ask-card-tabs-arrow">{activeStep < totalSteps - 1 ? "\u2192" : " "}</span>
      </div>

      {/* Question */}
      <div className="ask-card-question">{q.question}</div>

      {/* Options list */}
      <div className="ask-card-options" role="listbox">
        {q.options.map((opt, i) => {
          const isSelected = stepSelections.has(i);
          const isFocused = focusedOption === i && !customMode;
          return (
            <div
              key={i}
              className={`ask-card-option${isFocused ? " focused" : ""}${isSelected ? " selected" : ""}`}
              role="option"
              aria-selected={isSelected}
              onClick={() => {
                toggleSelection(i);
                if (!q.multiSelect) handleNext();
              }}
              onMouseEnter={() => setFocusedOption(i)}
            >
              <span className="ask-card-option-cursor">{isFocused ? ">" : " "}</span>
              <span className="ask-card-option-num">{i + 1}.</span>
              <span className="ask-card-option-check">
                {q.multiSelect
                  ? (isSelected ? "[X]" : "[ ]")
                  : (isSelected ? "(\u2022)" : "( )")}
              </span>
              <span className="ask-card-option-label">{opt.label}</span>
              {opt.description && (
                <span className="ask-card-option-desc">{opt.description}</span>
              )}
            </div>
          );
        })}
        {/* Other / custom input option */}
        <div
          className={`ask-card-option${focusedOption === q.options.length && !customMode ? " focused" : ""}${customMode ? " selected" : ""}`}
          role="option"
          onClick={() => setCustomMode(true)}
          onMouseEnter={() => setFocusedOption(q.options.length)}
        >
          <span className="ask-card-option-cursor">{focusedOption === q.options.length && !customMode ? ">" : " "}</span>
          <span className="ask-card-option-num">{q.options.length + 1}.</span>
          <span className="ask-card-option-check">{customMode ? "[/]" : "[ ]"}</span>
          {customMode ? (
            <input
              ref={customRef}
              className="ask-card-custom-input"
              type="text"
              value={customInput}
              onChange={e => {
                const val = e.target.value;
                setCustomInputs(prev => { const n = new Map(prev); n.set(activeStep, val); return n; });
              }}
              placeholder="Type your answer..."
              maxLength={2000}
              spellCheck={false}
              autoComplete="off"
            />
          ) : (
            <span className="ask-card-option-label">Other</span>
          )}
        </div>
      </div>

      {/* Navigation hint */}
      <div className="ask-card-nav">
        <span className="ask-card-nav-action" onClick={handleNext}>
          {activeStep < totalSteps - 1 ? "Next" : "Submit"}
        </span>
      </div>

      {/* Keyboard hints */}
      <div className="ask-card-hints">
        Enter to select
        {" \u00b7 "}
        {totalSteps > 1 && <>Tab/Arrow keys to navigate {" \u00b7 "}</>}
        1-{q.options.length} quick pick
      </div>
    </div>
  );
});
