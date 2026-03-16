import { memo, useState, useCallback } from "react";
import type { ChatMessage } from "../../types";
import BookmarkPanel from "./BookmarkPanel";
import MinimapPanel from "./MinimapPanel";
import TodoPanel from "./TodoPanel";
import ThinkingPanel from "./ThinkingPanel";
import "./RightSidebar.css";

type SidebarTab = "bookmarks" | "minimap" | "todos" | "thinking";

const RS_MIN = 150;
const RS_MAX = 400;

interface Props {
  messages: ChatMessage[];
  onScrollToMessage: (msgId: string) => void;
  scrollContainerRef?: React.RefObject<HTMLDivElement | null>;
}

export default memo(function RightSidebar({ messages, onScrollToMessage, scrollContainerRef }: Props) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("bookmarks");

  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = parseInt(getComputedStyle(document.documentElement).getPropertyValue("--right-sidebar-width")) || 220;

    const onMove = (ev: MouseEvent) => {
      const delta = startX - ev.clientX; // inverted: dragging left = wider
      const newWidth = Math.max(RS_MIN, Math.min(RS_MAX, startWidth + delta));
      document.documentElement.style.setProperty("--right-sidebar-width", `${newWidth}px`);
    };

    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };

    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }, []);

  const tabs: { id: SidebarTab; icon: JSX.Element; title: string }[] = [
    { id: "bookmarks", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M3 1h6a1 1 0 0 1 1 1v9l-4-2.5L2 11V2a1 1 0 0 1 1-1z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round"/></svg>, title: "Bookmarks" },
    { id: "minimap", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1" width="10" height="10" rx="1" stroke="currentColor" strokeWidth="1.2"/><rect x="3" y="3" width="4" height="3" rx="0.5" fill="currentColor" opacity="0.5"/></svg>, title: "Minimap" },
    { id: "todos", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><rect x="1" y="1.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><line x1="6" y1="3" x2="11" y2="3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><rect x="1" y="7.5" width="3" height="3" rx="0.5" stroke="currentColor" strokeWidth="1.2"/><line x1="6" y1="9" x2="11" y2="9" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg>, title: "Todos" },
    { id: "thinking", icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><circle cx="6" cy="5" r="4" stroke="currentColor" strokeWidth="1.2"/><path d="M4.5 4.5c0-1 1.5-1.5 1.5-.5s-1.5 1-1.5 1.5" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/><circle cx="6" cy="7" r="0.5" fill="currentColor"/></svg>, title: "Thinking" },
  ];

  return (
    <div className="right-sidebar">
      <div className="right-sidebar__resize" onMouseDown={handleResizeStart} />
      <div className="right-sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`right-sidebar-tab${activeTab === tab.id ? " active" : ""}`}
            onClick={() => setActiveTab(tab.id)}
            title={tab.title}
          >
            {tab.icon}
          </button>
        ))}
      </div>
      <div className="right-sidebar-content">
        {activeTab === "bookmarks" && (
          <BookmarkPanel messages={messages} onScrollToMessage={onScrollToMessage} />
        )}
        {activeTab === "minimap" && scrollContainerRef && (
          <MinimapPanel messages={messages} scrollContainerRef={scrollContainerRef} />
        )}
        {activeTab === "todos" && (
          <TodoPanel messages={messages} />
        )}
        {activeTab === "thinking" && (
          <ThinkingPanel messages={messages} />
        )}
      </div>
    </div>
  );
});
