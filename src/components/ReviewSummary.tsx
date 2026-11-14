import { useEffect, useState } from "react";
import { remove, stat } from "@tauri-apps/plugin-fs";
import { formatBytes, formatDate, getFileName } from "../lib/formatters";
import { useProjectStore } from "../store/useProjectStore";
import type { Project } from "../types";

interface ReviewSummaryProps {
  project: Project;
  onFinish: () => void;
}

interface FileSummary {
  path: string;
  size: number | null;
  birthtime: Date | null;
  error: string | null;
}

interface DeletionFailure {
  path: string;
  message: string;
}

interface DeletionResult {
  deleted: number;
  failures: DeletionFailure[];
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "An unexpected error occurred.";
}

function ReviewSummary({ project, onFinish }: ReviewSummaryProps) {
  const deleteProject = useProjectStore((state) => state.deleteProject);
  const unmarkFileForDeletion = useProjectStore(
    (state) => state.unmarkFileForDeletion,
  );
  const [fileSummaries, setFileSummaries] = useState<FileSummary[]>([]);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [confirmationName, setConfirmationName] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState<number | null>(null);
  const [deletionResult, setDeletionResult] =
    useState<DeletionResult | null>(null);

  useEffect(() => {
    let cancelled = false;
    const markedPaths = project.markedForDeletion;

    setFileSummaries([]);
    setMetadataLoading(markedPaths.length > 0);

    Promise.all(
      markedPaths.map(async (path): Promise<FileSummary> => {
        try {
          const fileInfo = await stat(path);
          return {
            path,
            size: fileInfo.size,
            birthtime: fileInfo.birthtime,
            error: null,
          };
        } catch (error) {
          console.error(`Failed to load metadata for "${path}".`, error);
          return {
            path,
            size: null,
            birthtime: null,
            error: getErrorMessage(error),
          };
        }
      }),
    ).then((summaries) => {
      if (!cancelled) {
        setFileSummaries(summaries);
        setMetadataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [project.markedForDeletion]);

  const knownSize = fileSummaries.reduce(
    (total, file) => total + (file.size ?? 0),
    0,
  );
  const hasMetadataErrors = fileSummaries.some((file) => file.error !== null);
  const canDelete =
    confirmationName === project.name &&
    !metadataLoading &&
    !isDeleting;

  async function handleFinishReview() {
    if (!canDelete) {
      return;
    }

    const markedPaths = [...project.markedForDeletion];
    if (markedPaths.length === 0) {
      deleteProject(project.id);
      onFinish();
      return;
    }

    setIsDeleting(true);
    setDeleteProgress(0);
    setDeletionResult(null);
    const failures: DeletionFailure[] = [];
    let deleted = 0;

    try {
      for (const [index, path] of markedPaths.entries()) {
        setDeleteProgress(index + 1);
        try {
          await remove(path);
          unmarkFileForDeletion(project.id, path);
          deleted += 1;
        } catch (error) {
          const message = getErrorMessage(error);
          console.error(`Failed to delete "${path}".`, error);
          failures.push({ path, message });
        }
      }

      if (failures.length === 0) {
        deleteProject(project.id);
        onFinish();
        return;
      }

      setDeletionResult({ deleted, failures });
    } finally {
      setIsDeleting(false);
      setDeleteProgress(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#0b100f] px-4 py-6 text-stone-100 sm:px-7 sm:py-8">
      <div className="mx-auto max-w-6xl">
        <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={onFinish}
              disabled={isDeleting}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-white/20 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
            >
              All projects
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-stone-100">
                {project.name}
              </p>
              <p className="truncate text-xs text-stone-500">
                {project.targetFolder}
              </p>
            </div>
          </div>
          <p className="text-sm font-medium text-emerald-200">Review complete</p>
        </header>

        <section className="rounded-[2rem] border border-white/8 bg-[#121918] p-5 shadow-2xl shadow-black/20 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
            Final review
          </p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">
            Confirm what to remove
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-400">
            Review the files you marked. Nothing is deleted until you enter the
            project name and confirm below.
          </p>

          <div className="mt-7 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-white/8 bg-white/[0.03] p-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">
                Potential space to free
              </p>
              <p className="mt-2 text-2xl font-semibold text-stone-100">
                {metadataLoading ? "Calculating…" : formatBytes(knownSize)}
              </p>
              {hasMetadataErrors && (
                <p className="mt-1 text-xs text-amber-200">
                  Some file sizes are unavailable and are excluded from this
                  total.
                </p>
              )}
            </div>
            <p className="text-sm text-stone-400">
              {project.markedForDeletion.length.toLocaleString()} file
              {project.markedForDeletion.length === 1 ? "" : "s"} marked
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-white/8">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[42rem] text-left text-sm">
                <thead className="bg-white/[0.04] text-xs uppercase tracking-[0.12em] text-stone-500">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      File
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Size
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Created
                    </th>
                    <th scope="col" className="px-4 py-3 font-semibold">
                      Metadata
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/[0.06]">
                  {metadataLoading ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                        Loading file details…
                      </td>
                    </tr>
                  ) : fileSummaries.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-stone-400">
                        No files are marked for deletion.
                      </td>
                    </tr>
                  ) : (
                    fileSummaries.map((file) => (
                      <tr key={file.path} className="align-top">
                        <td className="max-w-[24rem] px-4 py-4">
                          <p className="break-all font-medium text-stone-200">
                            {getFileName(file.path)}
                          </p>
                          <p className="mt-1 break-all font-mono text-xs leading-5 text-stone-500">
                            {file.path}
                          </p>
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-stone-300">
                          {file.size === null
                            ? "Unavailable"
                            : formatBytes(file.size)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-4 text-stone-300">
                          {formatDate(file.birthtime)}
                        </td>
                        <td className="max-w-xs break-words px-4 py-4 text-xs text-rose-200">
                          {file.error ?? "Available"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {deletionResult && (
            <div
              role="alert"
              className="mt-6 rounded-2xl border border-amber-200/20 bg-amber-200/[0.06] p-5"
            >
              <p className="font-semibold text-amber-100">
                {deletionResult.deleted} file
                {deletionResult.deleted === 1 ? "" : "s"} deleted;{" "}
                {deletionResult.failures.length} could not be deleted.
              </p>
              <p className="mt-1 text-sm leading-6 text-amber-100/75">
                Files that could not be deleted remain marked and can be retried.
              </p>
              <ul className="mt-3 space-y-3">
                {deletionResult.failures.map((failure) => (
                  <li key={failure.path} className="break-all text-sm text-amber-100">
                    <span className="font-medium">{failure.path}</span>
                    <span className="mt-1 block text-amber-100/70">
                      {failure.message}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-7 grid gap-4 rounded-2xl border border-rose-200/15 bg-rose-200/[0.04] p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
            <label className="block">
              <span className="text-sm font-medium text-stone-200">
                Type <span className="font-semibold text-rose-100">{project.name}</span> to confirm
              </span>
              <input
                type="text"
                value={confirmationName}
                onChange={(event) => setConfirmationName(event.target.value)}
                autoComplete="off"
                spellCheck={false}
                disabled={isDeleting}
                aria-describedby="delete-confirmation-help"
                className="mt-3 w-full rounded-xl border border-white/12 bg-black/20 px-4 py-3 text-sm text-white outline-none transition placeholder:text-stone-600 focus:border-emerald-200/60 disabled:opacity-60"
                placeholder="Project name"
              />
              <span id="delete-confirmation-help" className="mt-2 block text-xs text-stone-500">
                This permanently deletes the marked files from your device.
              </span>
            </label>
            <button
              type="button"
              onClick={() => void handleFinishReview()}
              disabled={!canDelete}
              className="rounded-full bg-rose-200 px-6 py-3 text-sm font-semibold text-rose-950 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {isDeleting
                ? `Deleting ${deleteProgress ?? 0} of ${project.markedForDeletion.length}…`
                : project.markedForDeletion.length > 0
                  ? "Delete Forever"
                  : "Finish Review"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}

export default ReviewSummary;
