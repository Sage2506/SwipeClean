import assert from "node:assert/strict";
import { posix } from "node:path";
import { afterEach, test } from "node:test";
import { clearMocks, mockIPC } from "@tauri-apps/api/mocks";
import { scanMediaFiles } from "./mediaScanner.ts";

globalThis.window = globalThis;

afterEach(() => clearMocks());

function directory(name) {
  return { name, isDirectory: true, isFile: false, isSymlink: false };
}

function file(name) {
  return { name, isDirectory: false, isFile: true, isSymlink: false };
}

test("skips dot-prefixed subdirectories but scans visible folders and files", async () => {
  const entries = {
    "/selected": [directory(".localized"), directory("photos"), file(".cover.jpg")],
    "/selected/photos": [directory(".cache"), file("image.png")],
  };
  const readPaths = [];
  mockIPC((command, args) => {
    if (command === "plugin:path|join") return posix.join(...args.paths);
    if (command === "plugin:fs|read_dir") {
      readPaths.push(args.path);
      assert.ok(Object.hasOwn(entries, args.path), `Unexpected read: ${args.path}`);
      return entries[args.path];
    }
    throw new Error(`Unexpected command: ${command}`);
  });

  assert.deepEqual(await scanMediaFiles("/selected"), [
    "/selected/.cover.jpg",
    "/selected/photos/image.png",
  ]);
  assert.deepEqual(readPaths, ["/selected", "/selected/photos"]);
});

test("scans an explicitly selected dot-prefixed root", async () => {
  mockIPC((command, args) => {
    if (command === "plugin:path|join") return posix.join(...args.paths);
    if (command === "plugin:fs|read_dir" && args.path === "/.selected") {
      return [file("image.jpg")];
    }
    throw new Error(`Unexpected command or path: ${command} ${args.path}`);
  });

  assert.deepEqual(await scanMediaFiles("/.selected"), ["/.selected/image.jpg"]);
});

test("includes MKV and AVI files case-insensitively", async () => {
  mockIPC((command, args) => {
    if (command === "plugin:path|join") return posix.join(...args.paths);
    if (command === "plugin:fs|read_dir" && args.path === "/selected") {
      return [file("episode.MKV"), file("clip.Avi"), file("notes.txt")];
    }
    throw new Error(`Unexpected command or path: ${command} ${args.path}`);
  });

  assert.deepEqual(await scanMediaFiles("/selected"), [
    "/selected/clip.Avi",
    "/selected/episode.MKV",
  ]);
});
