import { join } from "@tauri-apps/api/path";
import { readDir } from "@tauri-apps/plugin-fs";

const supportedExtensions = new Set([
  "mp4",
  "webm",
  "mov",
  "png",
  "jpeg",
  "jpg",
  "gif",
  "webp",
]);

export async function scanMediaFiles(folderPath: string): Promise<string[]> {
  const mediaPaths: string[] = [];

  async function scanDirectory(directoryPath: string): Promise<void> {
    let entries;
    try {
      entries = await readDir(directoryPath);
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error);
      throw new Error(`Could not read "${directoryPath}": ${reason}`);
    }

    for (const entry of entries) {
      if (entry.isSymlink) {
        continue;
      }

      if (entry.isDirectory) {
        await scanDirectory(await join(directoryPath, entry.name));
      } else if (entry.isFile) {
        const extension = entry.name.slice(entry.name.lastIndexOf(".") + 1);
        if (supportedExtensions.has(extension.toLowerCase())) {
          mediaPaths.push(await join(directoryPath, entry.name));
        }
      }
    }
  }

  await scanDirectory(folderPath);
  return mediaPaths.sort((first, second) =>
    first.localeCompare(second, undefined, { sensitivity: "base" }),
  );
}
