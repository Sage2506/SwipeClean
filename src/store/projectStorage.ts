import { appDataDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Project } from "../types";
import { useProjectStore } from "./useProjectStore";

interface PersistedProjectState {
  projects: Project[];
  activeProjectId: string | null;
}

let initialization: Promise<void> | undefined;
let pendingWrite: string | null = null;
let writeInProgress = false;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) {
    return false;
  }

  const { currentIndex, lastAccessed, markedForDeletion, totalFiles } = value;
  return (
    typeof value.id === "string" &&
    typeof value.name === "string" &&
    typeof value.targetFolder === "string" &&
    typeof currentIndex === "number" &&
    Number.isInteger(currentIndex) &&
    currentIndex >= 0 &&
    typeof totalFiles === "number" &&
    Number.isInteger(totalFiles) &&
    totalFiles >= 0 &&
    Array.isArray(markedForDeletion) &&
    markedForDeletion.every((path: unknown) => typeof path === "string") &&
    typeof lastAccessed === "number" &&
    Number.isFinite(lastAccessed)
  );
}

function parseProjectState(contents: string): PersistedProjectState {
  const value: unknown = JSON.parse(contents);
  if (
    !isRecord(value) ||
    !Array.isArray(value.projects) ||
    !value.projects.every(isProject) ||
    !(typeof value.activeProjectId === "string" || value.activeProjectId === null)
  ) {
    throw new Error("Stored project data has an invalid format.");
  }

  const projects = value.projects;
  if (
    value.activeProjectId !== null &&
    !projects.some((project) => project.id === value.activeProjectId)
  ) {
    throw new Error("Stored active project does not exist in the project list.");
  }

  return {
    projects,
    activeProjectId: value.activeProjectId,
  };
}

async function writePendingState(filePath: string): Promise<void> {
  if (writeInProgress || pendingWrite === null) {
    return;
  }

  writeInProgress = true;
  try {
    while (pendingWrite !== null) {
      const contents = pendingWrite;
      pendingWrite = null;
      try {
        await writeTextFile(filePath, contents);
      } catch (error) {
        console.error("Failed to save project data.", error);
      }
    }
  } finally {
    writeInProgress = false;
    if (pendingWrite !== null) {
      void writePendingState(filePath);
    }
  }
}

async function initialize(): Promise<void> {
  const dataDirectory = await appDataDir();
  await mkdir(dataDirectory, { recursive: true });
  const filePath = await join(dataDirectory, "projects.json");
  const storedState = (await exists(filePath))
    ? parseProjectState(await readTextFile(filePath))
    : { projects: [], activeProjectId: null };

  useProjectStore.setState(storedState);

  let previousState = useProjectStore.getState();
  useProjectStore.subscribe((state) => {
    if (
      state.projects === previousState.projects &&
      state.activeProjectId === previousState.activeProjectId
    ) {
      return;
    }

    previousState = state;
    pendingWrite = JSON.stringify(
      {
        projects: state.projects,
        activeProjectId: state.activeProjectId,
      },
      null,
      2,
    );
    void writePendingState(filePath);
  });
}

export function initializeProjectStorage(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}
