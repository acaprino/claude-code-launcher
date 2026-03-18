import type { SessionController } from "../hooks/useSessionController";

/** Shared props interface for ChatView and TerminalView. */
export interface SessionViewProps {
  tabId: string;
  modelIdx: number;
  effortIdx: number;
  isActive: boolean;
  inputStyle?: "chat" | "terminal";
  hideThinking?: boolean;
  controller: SessionController;
}
