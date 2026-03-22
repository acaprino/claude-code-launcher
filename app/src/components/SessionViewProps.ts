import type { SessionController } from "../hooks/useSessionController";

/** Props interface for TerminalView (the session rendering component). */
export interface SessionViewProps {
  tabId: string;
  modelIdx: number;
  effortIdx: number;
  permModeIdx: number;
  isActive: boolean;
  hideThinking?: boolean;
  controller: SessionController;
  onConfigChange?: (update: { modelIdx?: number; effortIdx?: number; permModeIdx?: number }) => void;
  onProcessingChange?: (isProcessing: boolean) => void;
}
