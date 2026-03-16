import { memo, useRef, useEffect, useState, useCallback } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { convertFileSrc } from "@tauri-apps/api/core";
import { sanitizeInput } from "../../utils/sanitizeInput";
import { saveClipboardImage } from "../../hooks/useAgentSession";
import AttachmentChip from "./AttachmentChip";
import type { Attachment } from "../../types";
import "./ChatInput.css";

interface Props {
  onSubmit: (text: string, attachments: Attachment[]) => void;
  disabled: boolean;
  processing: boolean;
  isActive: boolean;
  inputStyle?: "chat" | "terminal";
  /** File paths from drag-drop on ChatView — consumed and cleared via onDroppedFilesConsumed */
  droppedFiles?: string[];
  onDroppedFilesConsumed?: () => void;
}

let chipCounter = 0;
function nextChipId(): string {
  return `att-${++chipCounter}`;
}

function extToType(name: string): "file" | "image" {
  const ext = name.split(".").pop()?.toLowerCase() || "";
  return ["png", "jpg", "jpeg", "gif", "webp", "bmp", "svg"].includes(ext) ? "image" : "file";
}

export default memo(function ChatInput({ onSubmit, disabled, processing, isActive, inputStyle = "chat", droppedFiles, onDroppedFilesConsumed }: Props) {
  const [text, setText] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-focus when active and not disabled
  useEffect(() => {
    if (isActive && !disabled) {
      textareaRef.current?.focus();
    }
  }, [isActive, disabled]);

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
    onSubmit(sanitized, attachments);
    setText("");
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }, [text, attachments, onSubmit]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!disabled && hasContent) handleSubmit();
    }
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
    } catch {
      // User cancelled — ignore
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
      <div className="chat-input-row">
        <button
          className="chat-input-attach-btn"
          onClick={handleAttachClick}
          title="Attach files"
          disabled={disabled}
        >
          +
        </button>
        <textarea
          ref={textareaRef}
          className="chat-input-textarea"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Type a message..."
          rows={1}
          disabled={disabled}
        />
        <button
          className="chat-input-send-btn"
          onClick={handleSubmit}
          disabled={disabled || !hasContent}
          title="Send message"
        >
          &gt;
        </button>
      </div>
    </div>
  );
});
