import assert from "node:assert/strict";
import { test } from "node:test";
import { mockIPC, clearMocks } from "@tauri-apps/api/mocks";
import { createServer } from "vite";

globalThis.window = globalThis;

test("loads old project data and persists updated preferences alongside it", async () => {
  const project = {
    id: "p1",
    name: "Photos",
    targetFolder: "/photos",
    currentIndex: 1,
    totalFiles: 2,
    markedForDeletion: ["/photos/a.jpg"],
    lastAccessed: 1,
  };
  let saved;
  globalThis.isTauri = true;
  mockIPC((command, args) => {
    switch (command) {
      case "plugin:path|resolve_directory": return "/appdata";
      case "plugin:path|join": return args.paths.join("/");
      case "plugin:fs|mkdir": return;
      case "plugin:fs|exists": return true;
      case "plugin:fs|read_text_file":
        return new TextEncoder().encode(JSON.stringify({ projects: [project], activeProjectId: "p1" }));
      case "plugin:fs|write_text_file":
        saved = JSON.parse(new TextDecoder().decode(args));
        return;
      default: throw new Error(`Unexpected command: ${command}`);
    }
  });

  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
  try {
    const { initializeProjectStorage } = await server.ssrLoadModule("/src/store/projectStorage.ts");
    const { useProjectStore } = await server.ssrLoadModule("/src/store/useProjectStore.ts");
    await initializeProjectStorage();
    assert.deepEqual(useProjectStore.getState().projects, [project]);
    assert.deepEqual(useProjectStore.getState().preferences, {
      autoplayVideo: true,
      videoAudioEnabled: false,
      videoPlaybackDelaySeconds: 0,
      feedbackDurationMs: 300,
      videoPlaybackRate: 1,
    });

    useProjectStore.getState().setPreferences({
      autoplayVideo: false,
      videoAudioEnabled: true,
      videoPlaybackDelaySeconds: 3,
      feedbackDurationMs: 800,
      videoPlaybackRate: 1.5,
    });
    await new Promise((resolve) => setTimeout(resolve, 400));
    assert.deepEqual(saved.preferences, {
      autoplayVideo: false,
      videoAudioEnabled: true,
      videoPlaybackDelaySeconds: 3,
      feedbackDurationMs: 800,
      videoPlaybackRate: 1.5,
    });
    assert.deepEqual(saved.projects, [project]);
    assert.equal(saved.activeProjectId, "p1");
  } finally {
    await server.close();
    clearMocks();
    delete globalThis.isTauri;
  }
});

test("fills in new video preferences when loading older saved preferences", async () => {
  globalThis.isTauri = true;
  mockIPC((command, args) => {
    switch (command) {
      case "plugin:path|resolve_directory": return "/appdata";
      case "plugin:path|join": return args.paths.join("/");
      case "plugin:fs|mkdir": return;
      case "plugin:fs|exists": return true;
      case "plugin:fs|read_text_file":
        return new TextEncoder().encode(JSON.stringify({
          projects: [],
          activeProjectId: null,
          preferences: {
            autoplayVideo: true,
            feedbackDurationMs: 300,
            videoPlaybackRate: 1,
          },
        }));
      default: throw new Error(`Unexpected command: ${command}`);
    }
  });
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
  try {
    const { initializeProjectStorage } = await server.ssrLoadModule("/src/store/projectStorage.ts");
    const { useProjectStore } = await server.ssrLoadModule("/src/store/useProjectStore.ts");
    await initializeProjectStorage();
    assert.deepEqual(useProjectStore.getState().preferences, {
      autoplayVideo: true,
      videoAudioEnabled: false,
      videoPlaybackDelaySeconds: 0,
      feedbackDurationMs: 300,
      videoPlaybackRate: 1,
    });
  } finally {
    await server.close();
    clearMocks();
    delete globalThis.isTauri;
  }
});

test("rejects malformed saved preferences instead of silently resetting them", async () => {
  globalThis.isTauri = true;
  mockIPC((command, args) => {
    switch (command) {
      case "plugin:path|resolve_directory": return "/appdata";
      case "plugin:path|join": return args.paths.join("/");
      case "plugin:fs|mkdir": return;
      case "plugin:fs|exists": return true;
      case "plugin:fs|read_text_file":
        return new TextEncoder().encode(JSON.stringify({
          projects: [],
          activeProjectId: null,
          preferences: {
            autoplayVideo: true,
            videoAudioEnabled: false,
            videoPlaybackDelaySeconds: -1,
            feedbackDurationMs: 300,
            videoPlaybackRate: 1,
          },
        }));
      default: throw new Error(`Unexpected command: ${command}`);
    }
  });
  const server = await createServer({ server: { middlewareMode: true, hmr: false, ws: false }, appType: "custom" });
  try {
    const { initializeProjectStorage } = await server.ssrLoadModule("/src/store/projectStorage.ts");
    await assert.rejects(initializeProjectStorage(), /Stored preferences have an invalid format/);
  } finally {
    await server.close();
    clearMocks();
    delete globalThis.isTauri;
  }
});
