import { join, tempDir } from "@tauri-apps/api/path";
import { readDir, remove } from "@tauri-apps/plugin-fs";

const previewFilenamePattern =
  /^swipeclean-preview-[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.webm$/;

function describeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function cleanVideoPreviewCache(): Promise<void> {
  const directory = await tempDir();
  let entries;
  try {
    entries = await readDir(directory);
  } catch (error) {
    throw new Error(
      `Could not list temporary video previews in "${directory}": ${describeError(error)}`,
    );
  }

  for (const entry of entries) {
    if (
      !entry.isFile ||
      entry.isSymlink ||
      !previewFilenamePattern.test(entry.name)
    ) {
      continue;
    }

    const previewPath = await join(directory, entry.name);
    try {
      await remove(previewPath);
    } catch (error) {
      throw new Error(
        `Could not remove temporary video preview "${previewPath}": ${describeError(error)}`,
      );
    }
  }
}
