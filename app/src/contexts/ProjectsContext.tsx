import { createContext, useContext, useMemo, ReactNode } from "react";
import { useProjects } from "../hooks/useProjects";

type ProjectsContextValue = ReturnType<typeof useProjects>;

const ProjectsContext = createContext<ProjectsContextValue | null>(null);

export function ProjectsProvider({ children }: { children: ReactNode }) {
  const projectsData = useProjects();

  // R2: Memoize context value to prevent broadcasting on every render.
  // Construct a new object so the returned identity is stable when deps are stable.
  const value = useMemo(
    () => ({
      settings: projectsData.settings,
      projects: projectsData.projects,
      loading: projectsData.loading,
      error: projectsData.error,
      filter: projectsData.filter,
      setFilter: projectsData.setFilter,
      updateSettings: projectsData.updateSettings,
      refresh: projectsData.refresh,
      recordUsage: projectsData.recordUsage,
      retry: projectsData.retry,
    }),
    [
      projectsData.settings,
      projectsData.projects,
      projectsData.loading,
      projectsData.error,
      projectsData.filter,
      projectsData.setFilter,
      projectsData.updateSettings,
      projectsData.refresh,
      projectsData.recordUsage,
      projectsData.retry,
    ],
  );

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
}

export function useProjectsContext(): ProjectsContextValue {
  const ctx = useContext(ProjectsContext);
  if (!ctx) throw new Error("useProjectsContext must be used within ProjectsProvider");
  return ctx;
}
