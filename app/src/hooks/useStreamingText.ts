import { useCallback, useRef, useState } from "react";
import type { ChatMessage } from "../types";

export interface StreamingTextHandle {
  textRef: React.RefObject<string>;
  idRef: React.RefObject<string | null>;
  tick: number;
  /** Append streaming chunk, scheduling a render tick via rAF */
  append: (text: string, id: string) => void;
  /** Finalize current stream into a committed message */
  finalize: (setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => void;
  /** Clean up rAF and refs (call in effect cleanup) */
  cleanup: () => void;
}

export function useStreamingText(): StreamingTextHandle {
  const textRef = useRef("");
  const idRef = useRef<string | null>(null);
  const [tick, setTick] = useState(0);
  const rafRef = useRef(0);

  const append = useCallback((text: string, id: string) => {
    if (!idRef.current) {
      idRef.current = id;
      textRef.current = text;
    } else {
      textRef.current += text;
    }
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setTick(t => t + 1);
      });
    }
  }, []);

  const finalize = useCallback((setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>) => {
    if (!idRef.current) return;
    const id = idRef.current;
    const finalText = textRef.current;
    idRef.current = null;
    textRef.current = "";
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    setMessages(prev => [...prev, { id, role: "assistant", text: finalText, streaming: false, timestamp: Date.now() }]);
  }, []);

  const cleanup = useCallback(() => {
    idRef.current = null;
    textRef.current = "";
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
  }, []);

  return { textRef, idRef, tick, append, finalize, cleanup };
}
