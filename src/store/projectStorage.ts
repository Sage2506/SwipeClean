import { isTauri } from "@tauri-apps/api/core";
import { appDataDir, join } from "@tauri-apps/api/path";
import {
  exists,
  mkdir,
  readTextFile,
  writeTextFile,
} from "@tauri-apps/plugin-fs";
import type { Preferences, Project } from "../types";
import { defaultPreferences, useProjectStore } from "./useProjectStore";

interface PersistedProjectState {
  projects: Project[];
  activeProjectId: string | null;
  preferences: Preferences;
}

let initialization: Promise<void> | undefined;
let pendingWrite: string | null = null;
let writeInProgress = false;
let saveTimer: ReturnType<typeof setTimeout> | null = null;

const saveDebounceMilliseconds = 250;

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

  const preferences =
    value.preferences === undefined ? defaultPreferences : value.preferences;
  if (
    !isRecord(preferences) ||
    typeof preferences.autoplayVideo !== "boolean" ||
    typeof preferences.feedbackDurationMs !== "number" ||
    !Number.isSafeInteger(preferences.feedbackDurationMs) ||
    preferences.feedbackDurationMs < 0 ||
    preferences.feedbackDurationMs > 2147483647 ||
    (preferences.videoPlaybackRate !== 1 &&
      preferences.videoPlaybackRate !== 1.5 &&
      preferences.videoPlaybackRate !== 2)
  ) {
    throw new Error("Stored preferences have an invalid format.");
  }

  return {
    projects,
    activeProjectId: value.activeProjectId,
    preferences: {
      autoplayVideo: preferences.autoplayVideo,
      feedbackDurationMs: preferences.feedbackDurationMs,
      videoPlaybackRate: preferences.videoPlaybackRate,
    },
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
    if (pendingWrite !== null && saveTimer === null) {
      void writePendingState(filePath);
    }
  }
}

function scheduleProjectStateSave(
  filePath: string,
  state: PersistedProjectState,
): void {
  pendingWrite = JSON.stringify(state, null, 2);
  if (saveTimer !== null) {
    clearTimeout(saveTimer);
  }
  saveTimer = setTimeout(() => {
    saveTimer = null;
    void writePendingState(filePath);
  }, saveDebounceMilliseconds);
}

async function initialize(): Promise<void> {
  if (!isTauri()) {
    throw new Error(
      "SwipeClean requires the Tauri desktop runtime to access project files. Start it with `npm run tauri dev` instead of `npm run dev`.",
    );
  }

  const dataDirectory = await appDataDir();
  await mkdir(dataDirectory, { recursive: true });
  const filePath = await join(dataDirectory, "projects.json");
  const storedState = (await exists(filePath))
    ? parseProjectState(await readTextFile(filePath))
    : { projects: [], activeProjectId: null, preferences: defaultPreferences };

  useProjectStore.setState(storedState);

  let previousState = useProjectStore.getState();
  useProjectStore.subscribe((state) => {
    if (
      state.projects === previousState.projects &&
      state.activeProjectId === previousState.activeProjectId &&
      state.preferences === previousState.preferences
    ) {
      return;
    }

    previousState = state;
    scheduleProjectStateSave(filePath, {
      projects: state.projects,
      activeProjectId: state.activeProjectId,
      preferences: state.preferences,
    });
  });
}

export function initializeProjectStorage(): Promise<void> {
  initialization ??= initialize();
  return initialization;
}
