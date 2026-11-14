import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  chmod,
  copyFile,
  mkdtemp,
  mkdir,
  readdir,
  rm,
} from "node:fs/promises";
import { createReadStream, createWriteStream } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";

const releaseBase =
  "https://github.com/FFmpeg-Builds/FFmpeg-Builds/releases/download/autobuild-2026-11-14-12-37";

const builds = {
  "aarch64-apple-darwin": {
    archive: "ffmpeg-macos-lgpl-universal2.tar.gz",
    url: "https://github.com/EricEngineering/ffmpeg-macos-lgpl/releases/download/ffmpeg-7.1-r2/ffmpeg-macos-lgpl-universal2.tar.gz",
    sha256: "c725431e0b073bad12619d53c6d759b399ee84450790a8d681ecbb4066bf1194",
    version: "7.1",
  },
  "x86_64-apple-darwin": {
    archive: "ffmpeg-macos-lgpl-universal2.tar.gz",
    url: "https://github.com/EricEngineering/ffmpeg-macos-lgpl/releases/download/ffmpeg-7.1-r2/ffmpeg-macos-lgpl-universal2.tar.gz",
    sha256: "c725431e0b073bad12619d53c6d759b399ee84450790a8d681ecbb4066bf1194",
    version: "7.1",
  },
  "x86_64-pc-windows-msvc": {
    archive: "ffmpeg-N-128909-g604ef3784d-win64-lgpl.zip",
    url: `${releaseBase}/ffmpeg-N-128909-g604ef3784d-win64-lgpl.zip`,
    sha256: "950ca85a5948583e908239126098d0d1891e967d69b18764e01a7432a600c156",
    version: "N-128909-g604ef3784d",
  },
  "x86_64-unknown-linux-gnu": {
    archive: "ffmpeg-N-128909-g604ef3784d-linux64-lgpl.tar.xz",
    url: `${releaseBase}/ffmpeg-N-128909-g604ef3784d-linux64-lgpl.tar.xz`,
    sha256: "1a596aada56548f41cb00ae283a60fc5483bd7791963d7f18685f724c600846e",
    version: "N-128909-g604ef3784d",
  },
  "aarch64-unknown-linux-gnu": {
    archive: "ffmpeg-N-128909-g604ef3784d-linuxarm64-lgpl.tar.xz",
    url: `${releaseBase}/ffmpeg-N-128909-g604ef3784d-linuxarm64-lgpl.tar.xz`,
    sha256: "60ef812ccf8b210b0e61c715810c56744c825de73d60750e174f1818b5cabd23",
    version: "N-128909-g604ef3784d",
  },
};

const root = resolve(import.meta.dirname, "..");
const hostTriple = execFileSync("rustc", ["--print", "host-tuple"], {
  encoding: "utf8",
}).trim();
const targetTriple = process.env.TAURI_ENV_TARGET_TRIPLE ?? hostTriple;

if (targetTriple !== hostTriple) {
  throw new Error(
    `FFmpeg sidecar setup supports native builds only (${hostTriple}); requested ${targetTriple}.`,
  );
}

const build = builds[targetTriple];

if (!build) {
  throw new Error(`No pinned LGPL FFmpeg sidecar is available for ${targetTriple}.`);
}

const executableName = targetTriple.includes("windows") ? "ffmpeg.exe" : "ffmpeg";
const executablePath = join(
  root,
  "src-tauri",
  "binaries",
  `ffmpeg-${targetTriple}${targetTriple.includes("windows") ? ".exe" : ""}`,
);

async function findExecutable(directory, name, matches = []) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      await findExecutable(path, name, matches);
    } else if (entry.isFile() && entry.name === name) {
      matches.push(path);
    }
  }
  return matches;
}

function verifyExecutable(path) {
  const version = execFileSync(path, ["-version"], { encoding: "utf8" });
  if (!version.includes(build.version)) {
    throw new Error(`Unexpected FFmpeg version in ${path}.`);
  }

  const license = execFileSync(path, ["-L"], { encoding: "utf8" });
  if (
    !license.includes("Lesser General Public License") ||
    license.includes("GNU General Public License")
  ) {
    throw new Error(`FFmpeg at ${path} is not an LGPL-only build.`);
  }
}

try {
  verifyExecutable(executablePath);
  console.log(`Using FFmpeg ${build.version} for ${targetTriple}.`);
} catch (error) {
  if (error?.code !== "ENOENT") {
    throw error;
  }

  const temporaryDirectory = await mkdtemp(join(tmpdir(), "swipeclean-ffmpeg-"));
  const archivePath = join(temporaryDirectory, build.archive);
  const extractionPath = join(temporaryDirectory, "extracted");

  try {
    console.log(`Downloading pinned FFmpeg sidecar for ${targetTriple}...`);
    const response = await fetch(build.url);
    if (!response.ok || !response.body) {
      throw new Error(`FFmpeg download failed: ${response.status} ${response.statusText}`);
    }
    await pipeline(Readable.fromWeb(response.body), createWriteStream(archivePath));

    const hash = createHash("sha256");
    for await (const chunk of createReadStream(archivePath)) {
      hash.update(chunk);
    }
    if (hash.digest("hex") !== build.sha256) {
      throw new Error(`FFmpeg archive checksum did not match the pinned SHA-256.`);
    }

    await mkdir(extractionPath);
    execFileSync("tar", ["-xf", archivePath, "-C", extractionPath], {
      stdio: "inherit",
    });

    const executables = await findExecutable(extractionPath, executableName);
    if (executables.length !== 1) {
      throw new Error(
        `Expected one ${executableName} in the pinned archive, found ${executables.length}.`,
      );
    }

    if (!targetTriple.includes("windows")) {
      await chmod(executables[0], 0o755);
    }
    verifyExecutable(executables[0]);

    await mkdir(join(root, "src-tauri", "binaries"), { recursive: true });
    await copyFile(executables[0], executablePath);
    console.log(`Prepared FFmpeg ${build.version} for ${targetTriple}.`);
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}
