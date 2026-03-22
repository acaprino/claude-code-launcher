import { memo, useCallback } from "react";
import { useSessionController } from "../hooks/useSessionController";
import type { SessionControllerProps } from "../hooks/useSessionController";
import TerminalView from "./TerminalView";

type ConfigUpdate = { modelIdx?: number; effortIdx?: number; permModeIdx?: number };

interface AgentViewProps extends SessionControllerProps {
  hideThinking?: boolean;
  onProcessingChange?: (isProcessing: boolean) => void;
  onConfigChange?: (tabId: string, update: ConfigUpdate) => void;
}

/**
 * Wrapper that owns the session controller so re-renders from parent
 * do NOT destroy the active agent session.
 */
export default memo(function AgentView({
  hideThinking, onProcessingChange, onConfigChange, ...controllerProps
}: AgentViewProps) {
  const controller = useSessionController(controllerProps);

  const handleConfigChange = useCallback((update: ConfigUpdate) => {
    onConfigChange?.(controllerProps.tabId, update);
  }, [onConfigChange, controllerProps.tabId]);

  return (
    <TerminalView
      tabId={controllerProps.tabId}
      modelIdx={controllerProps.modelIdx}
      effortIdx={controllerProps.effortIdx}
      permModeIdx={controllerProps.permModeIdx}
      isActive={controllerProps.isActive}
      hideThinking={hideThinking}
      controller={controller}
      onConfigChange={handleConfigChange}
      onProcessingChange={onProcessingChange}
    />
  );
});
