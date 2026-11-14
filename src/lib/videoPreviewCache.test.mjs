import assert from "node:assert/strict";
import { posix } from "node:path";
import { afterEach, test } from "node:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { cleanVideoPreviewCache } from "./videoPreviewCache.ts";

globalThis.window = globalThis;

afterEach(() => clearMocks());

test("removes only generated preview files from the temporary directory", async () => {
  const removed = [];
  mockIPC((command, args) => {
    if (command === "plugin:path|resolve_directory") return "/temp";
    if (command === "plugin:path|join") return posix.join(...args.paths);
    if (command === "plugin:fs|read_dir") {
      assert.equal(args.path, "/temp");
      return [
        {
          name: "swipeclean-preview-123e4567-e89b-42d3-a456-426614174000.webm",
          isFile: true,
        },
        {
          name: "swipeclean-preview-123e4567-e89b-42d3-a456-426614174000.txt",
          isFile: true,
        },
        { name: "swipeclean-preview-not-a-uuid.webm", isFile: true },
        {
          name: "swipeclean-preview-123e4567-e89b-42d3-a456-426614174000.webm",
          isFile: true,
          isSymlink: true,
        },
        {
          name: "swipeclean-preview-123e4567-e89b-42d3-a456-426614174000.webm",
          isFile: false,
        },
      ];
    }
    if (command === "plugin:fs|remove") {
      removed.push(args.path);
      return;
    }
    throw new Error(`Unexpected command: ${command}`);
  });

  await cleanVideoPreviewCache();
  assert.deepEqual(removed, [
    "/temp/swipeclean-preview-123e4567-e89b-42d3-a456-426614174000.webm",
  ]);
});

test("surfaces failures to list the temporary directory", async () => {
  mockIPC((command) => {
    if (command === "plugin:path|resolve_directory") return "/temp";
    if (command === "plugin:fs|read_dir") throw new Error("access denied");
    throw new Error(`Unexpected command: ${command}`);
  });

  await assert.rejects(
    cleanVideoPreviewCache(),
    /Could not list temporary video previews in "\/temp": access denied/,
  );
});
