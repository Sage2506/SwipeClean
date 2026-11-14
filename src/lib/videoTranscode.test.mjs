import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { videoTranscodeArgs } from "./videoTranscode.ts";

const capability = JSON.parse(
  readFileSync(new URL("../../src-tauri/capabilities/default.json", import.meta.url), "utf8"),
);
const scope = capability.permissions.find(
  (permission) => permission.identifier === "shell:allow-spawn",
).allow.find((entry) => entry.name === "binaries/ffmpeg");
const outputPath = "/tmp/swipeclean-preview-01234567-89ab-cdef-0123-456789abcdef.webm";

function assertMatchesScope(args) {
  assert.equal(args.length, scope.args.length);
  scope.args.forEach((rule, index) => {
    if (typeof rule === "string") {
      assert.equal(args[index], rule, `argument ${index}`);
    } else {
      // JavaScript lacks Rust regex's case-insensitive group syntax.
      const pattern = rule.validator.replace("(?i:mkv|avi|mp4|mov)", "(mkv|avi|mp4|mov)");
      assert.match(args[index], new RegExp(pattern, "i"), `argument ${index}`);
    }
  });
}

test("HEVC MP4 transcoding uses the scoped 1024-pixel filter", () => {
  const args = videoTranscodeArgs("/media/clip.MP4", outputPath, true);
  assertMatchesScope(args);
  assert.equal(args[7], "scale=w='min(1024,iw)':h=-2");
});

test("MKV and AVI transcoding uses the scoped no-op filter", () => {
  for (const extension of ["mkv", "avi"]) {
    const args = videoTranscodeArgs(`/media/clip.${extension}`, outputPath, false);
    assertMatchesScope(args);
    assert.equal(args[7], "null");
  }
});

test("the scope rejects arbitrary video filters", () => {
  const filterValidator = new RegExp(scope.args[7].validator);
  assert.doesNotMatch("scale=1920:1080", filterValidator);
  assert.doesNotMatch("null,scale=1920:1080", filterValidator);
});
