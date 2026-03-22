import { memo, useState, useCallback, useRef, useEffect } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { ContextMenu } from "radix-ui";
import { Tab, getTabLabel } from "../types";
import { IconSessions, IconBarChart, IconInfo, IconMinimize, IconMaximize, IconClose } from "./Icons";
import "./TabBar.css";

const appWindow = getCurrentWindow();

interface TabBarProps {
  tabs: Tab[];
  activeTabId: string;
  onActivate: (id: string) => void;
  onClose: (id: string) => void;
  onAdd: () => void;
  onSaveToProjects?: (tabId: string) => void;
  onToggleAbout: () => void;
  onToggleUsage: () => void;
  onToggleSessions: () => void;
}

export default memo(function TabBar({ tabs, activeTabId, onActivate, onClose, onAdd, onSaveToProjects, onToggleAbout, onToggleUsage, onToggleSessions }: TabBarProps) {
  const [closingIds, setClosingIds] = useState<Set<string>>(new Set());
  const closingTimersRef = useRef<Map<string, number>>(new Map());

  const handleClose = useCallback((tabId: string) => {
    if (closingTimersRef.current.has(tabId)) return;

    setClosingIds((prev) => new Set(prev).add(tabId));

    const timer = window.setTimeout(() => {
      setClosingIds((prev) => {
        const next = new Set(prev);
        next.delete(tabId);
        return next;
      });
      closingTimersRef.current.delete(tabId);
      onClose(tabId);
    }, 150);

    closingTimersRef.current.set(tabId, timer);
  }, [onClose]);

  const handleMinimize = useCallback(() => {
    appWindow.minimize();
  }, []);

  const handleMaximize = useCallback(() => {
    appWindow.toggleMaximize();
  }, []);

  const handleWindowClose = useCallback(() => {
    appWindow.close();
  }, []);

  // Clean up closing animation timers on unmount
  useEffect(() => () => {
    closingTimersRef.current.forEach((timer) => clearTimeout(timer));
  }, []);

  return (
    <div className="tab-bar" data-tauri-drag-region>
      <div className="tab-list" role="tablist" data-tauri-drag-region>
        {tabs.map((tab) => {
          const isActive = tab.id === activeTabId;
          const isClosing = closingIds.has(tab.id);
          const label = getTabLabel(tab);

          return (
            <ContextMenu.Root key={tab.id}>
              <ContextMenu.Trigger asChild>
                <div
                  className={`tab ${isActive ? "active" : ""} ${tab.hasNewOutput ? "has-output" : ""} ${isClosing ? "closing" : ""} ${tab.temporary ? "temporary" : ""}`}
                  onClick={() => !isClosing && onActivate(tab.id)}
                  role="tab"
                  aria-selected={isActive}
                  tabIndex={isActive ? 0 : -1}
                >
                  {tab.isProcessing && <span className="tab-processing-spinner" />}
                  <span className="tab-label" title={tab.temporary ? `${label} (temp)` : label}>{label}</span>
                  {tab.exitCode != null && (
                    <span className={`tab-exit ${tab.exitCode === 0 ? "ok" : "err"}`}>
                      {tab.exitCode === 0 ? "\u2713" : "\u2717"}
                    </span>
                  )}
                  <button
                    className="tab-close"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose(tab.id);
                    }}
                    title="Close (Ctrl+F4)"
                    aria-label={`Close ${label}`}
                  >
                    {"\u00d7"}
                  </button>
                </div>
              </ContextMenu.Trigger>
              <ContextMenu.Portal>
                <ContextMenu.Content className="tab-context-menu">
                  {tab.type === "agent" && tab.temporary && onSaveToProjects && (
                    <ContextMenu.Item className="context-menu-item" onSelect={() => onSaveToProjects(tab.id)}>
                      Save to Projects
                    </ContextMenu.Item>
                  )}
                  <ContextMenu.Item className="context-menu-item" onSelect={() => handleClose(tab.id)}>
                    Close Tab
                  </ContextMenu.Item>
                </ContextMenu.Content>
              </ContextMenu.Portal>
            </ContextMenu.Root>
          );
        })}
      </div>
      <button className="tab-add" onClick={onAdd} title="New Tab (Ctrl+T)" aria-label="New Tab">
        +
      </button>
      <div className="tab-bar-actions">
        <button className="tab-bar-action" onClick={onToggleSessions} title="Sessions (Ctrl+Shift+S)" aria-label="Sessions">
          <IconSessions />
        </button>
        <button className="tab-bar-action" onClick={onToggleUsage} title="Usage Stats (Ctrl+U)" aria-label="Usage Stats">
          <IconBarChart />
        </button>
        <button className="tab-bar-action" onClick={onToggleAbout} title="About (F12)" aria-label="About">
          <IconInfo />
        </button>
      </div>
      <div className="window-controls">
        <button className="win-btn minimize" onClick={handleMinimize} aria-label="Minimize">
          <IconMinimize />
        </button>
        <button className="win-btn maximize" onClick={handleMaximize} aria-label="Maximize">
          <IconMaximize />
        </button>
        <button className="win-btn close" onClick={handleWindowClose} aria-label="Close">
          <IconClose />
        </button>
      </div>
    </div>
  );
});
