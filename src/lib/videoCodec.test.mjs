import assert from "node:assert/strict";
import { test } from "node:test";
import { isHevcMain10 } from "./videoCodec.ts";

test("detects HEVC Main 10 from FFmpeg stream information", () => {
  assert.equal(
    isHevcMain10("Stream #0:0: Video: hevc (Main 10) (hvc1), yuv420p10le"),
    true,
  );
});

test("does not select other codecs or HEVC profiles for transcoding", () => {
  assert.equal(isHevcMain10("Stream #0:0: Video: hevc (Main), yuv420p"), false);
  assert.equal(isHevcMain10("Stream #0:0: Video: h264 (High), yuv420p"), false);
});
