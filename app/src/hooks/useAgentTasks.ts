import { useCallback, useRef, useState } from "react";
import type { AgentTask } from "../types";

export interface AgentTasksHandle {
  tasks: AgentTask[];
  /** Ref to current tasks array — use in closures to avoid stale reads */
  tasksRef: React.RefObject<AgentTask[]>;
  /** Start a new task (e.g. from Agent toolUse) */
  startTask: (taskId: string, description: string, taskType: string) => void;
  /** Complete a task (e.g. from Agent toolResult) */
  completeTask: (taskId: string, success: boolean, summary: string) => void;
  /** Handle SDK task_started event */
  onTaskStarted: (taskId: string, description: string, taskType: string) => void;
  /** Handle SDK task_progress event (rAF-batched) */
  onTaskProgress: (taskId: string, description: string, totalTokens: number, toolUses: number, durationMs: number, lastToolName: string, summary: string) => void;
  /** Handle SDK task_notification event */
  onTaskNotification: (taskId: string, status: string, summary: string, totalTokens: number, toolUses: number, durationMs: number) => void;
  /** Mark all running tasks as stopped (e.g. on interrupt) */
  stopAll: () => void;
  /** Clean up rAF and refs (call in effect cleanup) */
  cleanup: () => void;
}

export function useAgentTasks(): AgentTasksHandle {
  const [tasks, setTasks] = useState<AgentTask[]>([]);
  const tasksRef = useRef<AgentTask[]>([]);
  const rafRef = useRef(0);

  const startTask = useCallback((taskId: string, description: string, taskType: string) => {
    const newTask: AgentTask = {
      taskId, description, taskType,
      status: "running", totalTokens: 0, toolUses: 0, durationMs: 0, lastToolName: "", summary: "",
    };
    tasksRef.current = [...tasksRef.current, newTask];
    setTasks(tasksRef.current);
  }, []);

  const completeTask = useCallback((taskId: string, success: boolean, summary: string) => {
    let idx = -1;
    for (let i = tasksRef.current.length - 1; i >= 0; i--) {
      if (tasksRef.current[i].status === "running" && tasksRef.current[i].taskId === taskId) { idx = i; break; }
    }
    if (idx >= 0) {
      tasksRef.current = tasksRef.current.map((t, i) => i === idx ? {
        ...t, status: success ? "completed" : "failed", summary,
      } : t);
      setTasks(tasksRef.current);
    }
  }, []);

  const onTaskStarted = useCallback((taskId: string, description: string, taskType: string) => {
    if (!tasksRef.current.some(t => t.taskId === taskId)) {
      startTask(taskId, description, taskType);
    }
  }, [startTask]);

  const onTaskProgress = useCallback((taskId: string, description: string, totalTokens: number, toolUses: number, durationMs: number, lastToolName: string, summary: string) => {
    tasksRef.current = tasksRef.current.map(t => t.taskId === taskId ? {
      ...t, description: description || t.description,
      totalTokens, toolUses, durationMs, lastToolName,
      summary: summary || t.summary,
    } : t);
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = 0;
        setTasks(tasksRef.current);
      });
    }
  }, []);

  const onTaskNotification = useCallback((taskId: string, statusStr: string, summary: string, totalTokens: number, toolUses: number, durationMs: number) => {
    const validStatuses = new Set<AgentTask["status"]>(["completed", "failed", "stopped"]);
    const status = validStatuses.has(statusStr as AgentTask["status"]) ? statusStr as AgentTask["status"] : "stopped";
    tasksRef.current = tasksRef.current.map(t => t.taskId === taskId ? {
      ...t, status, summary: summary || t.summary, totalTokens, toolUses, durationMs,
    } : t);
    setTasks(tasksRef.current);
  }, []);

  const stopAll = useCallback(() => {
    if (tasksRef.current.some(t => t.status === "running")) {
      tasksRef.current = tasksRef.current.map(t =>
        t.status === "running" ? { ...t, status: "stopped" as const } : t
      );
      setTasks(tasksRef.current);
    }
  }, []);

  const cleanup = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    tasksRef.current = [];
  }, []);

  return {
    tasks,
    tasksRef,
    startTask,
    completeTask,
    onTaskStarted,
    onTaskProgress,
    onTaskNotification,
    stopAll,
    cleanup,
  };
}
