import { create } from "zustand";
import type { Project } from "../types";

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  createProject: (project: Project) => void;
  setActiveProject: (projectId: string | null) => void;
  updateProjectTotalFiles: (projectId: string, totalFiles: number) => void;
  updateProjectProgress: (projectId: string, currentIndex: number) => void;
  markFileForDeletion: (projectId: string, filePath: string) => void;
  deleteProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  createProject: (project) =>
    set((state) => ({
      projects: [...state.projects, project],
      activeProjectId: project.id,
    })),
  setActiveProject: (projectId) =>
    set((state) => ({
      activeProjectId: projectId,
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, lastAccessed: Date.now() }
          : project,
      ),
    })),
  updateProjectTotalFiles: (projectId, totalFiles) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, totalFiles } : project,
      ),
    })),
  updateProjectProgress: (projectId, currentIndex) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, currentIndex } : project,
      ),
    })),
  markFileForDeletion: (projectId, filePath) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId &&
        !project.markedForDeletion.includes(filePath)
          ? {
              ...project,
              markedForDeletion: [...project.markedForDeletion, filePath],
            }
          : project,
      ),
    })),
  deleteProject: (projectId) =>
    set((state) => ({
      projects: state.projects.filter((project) => project.id !== projectId),
      activeProjectId:
        state.activeProjectId === projectId ? null : state.activeProjectId,
    })),
}));
