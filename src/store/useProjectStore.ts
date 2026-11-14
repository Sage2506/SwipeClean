import { create } from "zustand";
import type { Preferences, Project } from "../types";

export const defaultPreferences: Preferences = {
  autoplayVideo: true,
  videoAudioEnabled: false,
  videoPlaybackDelaySeconds: 0,
  feedbackDurationMs: 300,
  videoPlaybackRate: 1,
};

interface ProjectStore {
  projects: Project[];
  activeProjectId: string | null;
  preferences: Preferences;
  setPreferences: (preferences: Partial<Preferences>) => void;
  createProject: (project: Project) => void;
  setActiveProject: (projectId: string | null) => void;
  updateProjectTotalFiles: (projectId: string, totalFiles: number) => void;
  updateProjectScan: (projectId: string, totalFiles: number, currentIndex: number) => void;
  updateProjectProgress: (projectId: string, currentIndex: number) => void;
  markFileForDeletion: (projectId: string, filePath: string) => void;
  unmarkFileForDeletion: (projectId: string, filePath: string) => void;
  recordDeletedFile: (projectId: string, filePath: string, removedIndex: number, totalFiles: number) => void;
  undoLastDecision: (projectId: string, filePath: string) => void;
  deleteProject: (projectId: string) => void;
}

export const useProjectStore = create<ProjectStore>((set) => ({
  projects: [],
  activeProjectId: null,
  preferences: defaultPreferences,
  setPreferences: (preferences) =>
    set((state) => ({
      preferences: { ...state.preferences, ...preferences },
    })),
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
  updateProjectScan: (projectId, totalFiles, currentIndex) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId ? { ...project, totalFiles, currentIndex } : project,
      ),
    })),
  updateProjectProgress: (projectId, currentIndex) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? { ...project, currentIndex, lastAccessed: Date.now() }
          : project,
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
  unmarkFileForDeletion: (projectId, filePath) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              markedForDeletion: project.markedForDeletion.filter(
                (markedPath) => markedPath !== filePath,
              ),
            }
          : project,
      ),
    })),
  recordDeletedFile: (projectId, filePath, removedIndex, totalFiles) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId
          ? {
              ...project,
              totalFiles,
              currentIndex: removedIndex >= 0 && removedIndex < project.currentIndex
                ? project.currentIndex - 1
                : project.currentIndex,
              markedForDeletion: project.markedForDeletion.filter((path) => path !== filePath),
            }
          : project,
      ),
    })),
  undoLastDecision: (projectId, filePath) =>
    set((state) => ({
      projects: state.projects.map((project) =>
        project.id === projectId && project.currentIndex > 0
          ? {
              ...project,
              currentIndex: project.currentIndex - 1,
              markedForDeletion: project.markedForDeletion.filter(
                (markedPath) => markedPath !== filePath,
              ),
              lastAccessed: Date.now(),
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
