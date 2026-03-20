import { memo, useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { sanitizeInput } from "../../utils/sanitizeInput";
import { saveClipboardImage } from "../../hooks/useAgentSession";
import AttachmentChip from "./AttachmentChip";
import CommandMenu, { type Command } from "./CommandMenu";
import MentionMenu, { type Mention } from "./MentionMenu";
import type { Attachment, SlashCommand, AgentInfoSDK } from "../../types";
import "./ChatInput.css";

interface Props {
  onSubmit: (text: string, attachments: Attachment[]) => void;
  onCommand?: (command: Command) => void;
  processing: boolean;
  isActive: boolean;
  inputStyle?: "chat" | "terminal";
  sdkCommands?: SlashCommand[];
  sdkAgents?: AgentInfoSDK[];
  /** File paths from drag-drop on ChatView — consumed and cleared via onDroppedFilesConsumed */
  droppedFiles?: string[];
  onDroppedFilesConsumed?: () => void;
  queueLength?: number;
}

let chipCounter = 0;
function nextChipId(): string {
  return `att-${++chipCounter}`;
}

function extToType(name: string): "file" | "image" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext) ? "image" : "file";
}

export interface ChatInputHandle {
  focus(): void;
}

function ChatInputInner({ onSubmit, onCommand, processing, isActive, inputStyle = "chat", sdkCommands, sdkAgents, droppedFiles, onDroppedFilesConsumed, queueLength = 0 }: Props, ref: React.Ref<ChatInputHandle>) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [showCommandMenu, setShowCommandMenu] = useState(false);
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [menuFilter, setMenuFilter] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focus() { textareaRef.current?.focus(); },
  }), []);

  // Command history (bash-style Up/Down)
  const historyRef = useRef<string[]>([]);
  const historyIdxRef = useRef(-1); // -1 = not navigating
  const draftRef = useRef(""); // saves current input when entering history

  // Auto-focus when active or when transitioning from processing to ready
  useEffect(() => {
    if (isActive && !processing) {
      const active = document.activeElement;
      if (active?.closest(".permission-card, .ask-question-card")) return;
      textareaRef.current?.focus();
    }
  }, [isActive, processing]);

  // Auto-grow textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [text]);

  const addFiles = useCallback((paths: string[]) => {
    const newAttachments = paths.map((p) => {
      const name = p.split(/[/\\]/).pop() || p;
      const type = extToType(name);
      return {
        id: nextChipId(), path: p, name, type,
        thumbnail: type === "image" ? convertFileSrc(p) : undefined,
      } as Attachment;
    });
    setAttachments((prev) => [...prev, ...newAttachments]);
  }, []);

  // Consume dropped files from parent (ChatView drag-drop)
  useEffect(() => {
    if (droppedFiles && droppedFiles.length > 0) {
      addFiles(droppedFiles);
      onDroppedFilesConsumed?.();
    }
  }, [droppedFiles, onDroppedFilesConsumed, addFiles]);

  const hasContent = text.trim().length > 0 || attachments.length > 0;

  const handleSubmit = useCallback(() => {
    const sanitized = sanitizeInput(text.trim());
    if (!sanitized && attachments.length === 0) return;
    // Push to command history (avoid consecutive duplicates, cap at 100)
    if (sanitized) {
      const h = historyRef.current;
      if (h.length === 0 || h[h.length - 1] !== sanitized) {
        h.push(sanitized);
        if (h.length > 100) h.shift();
      }
      historyIdxRef.current = -1;
    }
    onSubmit(sanitized, attachments);
    setText("");
    setAttachments([]);
    setShowCommandMenu(false);
    setShowMentionMenu(false);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachments, onSubmit]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);
    historyIdxRef.current = -1; // reset history navigation on manual typing

    // Detect / command trigger (/ at start of text or after whitespace)
    const slashIdx = val.lastIndexOf("/");
    if (slashIdx >= 0 && (slashIdx === 0 || /\s/.test(val[slashIdx - 1]))) {
      const afterSlash = val.slice(slashIdx);
      if (!/\s/.test(afterSlash.slice(1)) || afterSlash.length <= 1) {
        setShowCommandMenu(true);
        setShowMentionMenu(false);
        setMenuFilter(afterSlash);
      } else {
        setShowCommandMenu(false);
      }
    } else if (val.includes("@")) {
      // Detect @ mention trigger
      const atIdx = val.lastIndexOf("@");
      const afterAt = val.slice(atIdx);
      if (!/\s/.test(afterAt) || afterAt.length <= 1) {
        setShowMentionMenu(true);
        setShowCommandMenu(false);
        setMenuFilter(afterAt);
      } else {
        setShowMentionMenu(false);
      }
    } else {
      setShowCommandMenu(false);
      setShowMentionMenu(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Ctrl+C: clear input line when idle (terminal behavior)
    if (e.key === "c" && e.ctrlKey && !processing && text.trim()) {
      e.preventDefault();
      setText("");
      historyIdxRef.current = -1;
      return;
    }

    // Let menus handle arrow keys and Enter when open
    if (showCommandMenu || showMentionMenu) {
      if (["ArrowUp", "ArrowDown", "Enter", "Escape"].includes(e.key)) {
        return; // Handled by CommandMenu/MentionMenu keydown listener
      }
    }

    // Command history — Up arrow (recall previous)
    if (e.key === "ArrowUp" && !showCommandMenu && !showMentionMenu) {
      const el = textareaRef.current;
      if (!el) return;
      const cursorPos = el.selectionStart;
      const textBefore = text.slice(0, cursorPos);
      if (textBefore.includes("\n")) return; // not on first line

      const h = historyRef.current;
      if (h.length === 0) return;
      e.preventDefault();

      if (historyIdxRef.current === -1) {
        draftRef.current = text;
        historyIdxRef.current = h.length - 1;
      } else if (historyIdxRef.current > 0) {
        historyIdxRef.current--;
      } else {
        return; // at oldest entry
      }
      setText(h[historyIdxRef.current]);
    }

    // Command history — Down arrow (go forward)
    if (e.key === "ArrowDown" && !showCommandMenu && !showMentionMenu) {
      const el = textareaRef.current;
      if (!el) return;
      const cursorPos = el.selectionStart;
      const textAfter = text.slice(cursorPos);
      if (textAfter.includes("\n")) return; // not on last line

      if (historyIdxRef.current === -1) return; // not in history mode
      e.preventDefault();

      const h = historyRef.current;
      if (historyIdxRef.current < h.length - 1) {
        historyIdxRef.current++;
        setText(h[historyIdxRef.current]);
      } else {
        historyIdxRef.current = -1;
        setText(draftRef.current);
      }
    }

    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (hasContent) handleSubmit();
    }
  };

  const handleCommandSelect = (command: Command) => {
    setShowCommandMenu(false);
    setText("");
    onCommand?.(command);
  };

  const handleMentionSelect = (mention: Mention) => {
    setShowMentionMenu(false);
    const atIdx = text.lastIndexOf("@");
    const before = text.slice(0, atIdx);
    setText(before + mention.name + " ");
    textareaRef.current?.focus();
  };

  const removeAttachment = useCallback((id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }, []);

  // File picker via [+] button
  const handleAttachClick = async () => {
    try {
      const result = await open({ multiple: true });
      if (result) {
        const paths = Array.isArray(result) ? result : [result];
        addFiles(paths);
      }
    } catch (err) {
      console.debug("[ChatInput] file dialog cancelled or failed:", err);
    }
  };

  // Paste handler: images → saveClipboardImage, text → normal paste
  const handlePaste = async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    // Check for image data in clipboard
    for (const item of items) {
      if (item.type.startsWith("image/")) {
        e.preventDefault();
        try {
          const path = await saveClipboardImage();
          if (path) {
            const name = path.split(/[/\\]/).pop() || "clipboard.png";
            setAttachments((prev) => [...prev, {
              id: nextChipId(), path, name, type: "image",
              thumbnail: convertFileSrc(path),
            }]);
          }
        } catch (err) {
          console.error("Failed to save clipboard image:", err);
        }
        return;
      }
    }

    // Check for file paths in plain text (e.g., pasted from Explorer)
    const pastedText = e.clipboardData.getData("text/plain");
    if (pastedText) {
      const lines = pastedText.split("\n").map((l) => l.trim()).filter(Boolean);
      const allPaths = lines.every((l) => /^[A-Za-z]:[/\\]|^\//.test(l));
      if (allPaths && lines.length > 0 && lines.length <= 20) {
        e.preventDefault();
        addFiles(lines);
        return;
      }
    }

    // Regular text paste — sanitizeInput is applied on submit
  };

  const containerClass = [
    "chat-input-container",
    inputStyle === "terminal" ? "terminal-mode" : "",
    processing ? "processing" : "",
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClass}>
      {attachments.length > 0 && (
        <div className="attachment-chips">
          {attachments.map((a) => (
            <AttachmentChip key={a.id} attachment={a} onRemove={removeAttachment} />
          ))}
        </div>
      )}
      <div className="command-menu-wrapper">
        {showCommandMenu && (
          <CommandMenu
            filter={menuFilter}
            sdkCommands={sdkCommands}
            onSelect={handleCommandSelect}
            onDismiss={() => { setShowCommandMenu(false); setText(""); }}
          />
        )}
        {showMentionMenu && (
          <MentionMenu
            filter={menuFilter}
            agents={sdkAgents}
            onSelect={handleMentionSelect}
            onDismiss={() => setShowMentionMenu(false)}
          />
        )}
        <div className="chat-input-row">
          {inputStyle !== "terminal" && (
            <button
              className="chat-input-attach-btn"
              onClick={handleAttachClick}
              title="Attach files"
              aria-label="Attach files"
            >
              +
            </button>
          )}
          <textarea
            ref={textareaRef}
            className="chat-input-textarea"
            value={text}
            onChange={handleTextChange}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            placeholder={processing ? "Agent working... type to queue (Ctrl+C to interrupt)" : "Type a message... (/ for commands, @ for agents)"}
            rows={1}
          />
          <button
            className="chat-input-send-btn"
            onClick={handleSubmit}
            disabled={!hasContent}
            title={processing && queueLength > 0 ? `Send (${queueLength} queued)` : "Send message"}
            aria-label="Send message"
          >
            {processing && queueLength > 0 ? <><span className="queue-badge">{queueLength}</span>&gt;</> : <>&gt;</>}
          </button>
        </div>
      </div>
    </div>
  );
}

const ChatInput = memo(forwardRef(ChatInputInner));
export default ChatInput;
