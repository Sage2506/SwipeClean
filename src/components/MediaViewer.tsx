import { useEffect, useRef, useState } from "react";
import { convertFileSrc } from "@tauri-apps/api/core";
import { stat } from "@tauri-apps/plugin-fs";
import { formatBytes, formatDate, getFileName } from "../lib/formatters";
import { useProjectStore } from "../store/useProjectStore";
import type { Project } from "../types";

interface MediaViewerProps {
  project: Project;
  mediaFiles: string[];
  onBack: () => void;
  onPreview: () => void;
}

interface FileMetadata {
  name: string;
  size: number;
  birthtime: Date | null;
}

const videoExtensions = new Set(["mp4", "webm", "mov"]);

function decideCurrentFile(
  projectId: string,
  mediaFiles: string[],
  markForDeletion: boolean,
): void {
  const store = useProjectStore.getState();
  const project = store.projects.find((item) => item.id === projectId);
  const filePath = project && mediaFiles[project.currentIndex];
  if (!project || !filePath) {
    return;
  }

  if (markForDeletion) {
    store.markFileForDeletion(projectId, filePath);
  }
  store.updateProjectProgress(projectId, project.currentIndex + 1);
}

function undoLastDecision(projectId: string, mediaFiles: string[]): void {
  const project = useProjectStore
    .getState()
    .projects.find((item) => item.id === projectId);
  if (!project || project.currentIndex === 0) {
    return;
  }

  const previousFile = mediaFiles[project.currentIndex - 1];
  if (previousFile) {
    useProjectStore.getState().undoLastDecision(projectId, previousFile);
  }
}

function MediaViewer({ project, mediaFiles, onBack, onPreview }: MediaViewerProps) {
  const currentFilePath = mediaFiles[project.currentIndex] ?? null;
  const preferences = useProjectStore((state) => state.preferences);
  const [metadata, setMetadata] = useState<FileMetadata | null>(null);
  const [metadataLoading, setMetadataLoading] = useState(false);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    markForDeletion: boolean;
    sliding: boolean;
  } | null>(null);
  const pendingDecision = useRef<boolean | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current !== null) clearTimeout(timer.current);
  }, []);

  function startDecision(markForDeletion: boolean) {
    if (pendingDecision.current !== null || !currentFilePath) return;
    pendingDecision.current = markForDeletion;
    setFeedback({ markForDeletion, sliding: false });
    timer.current = setTimeout(() => {
      setFeedback({ markForDeletion, sliding: true });
      timer.current = setTimeout(() => {
        pendingDecision.current = null;
        timer.current = null;
        decideCurrentFile(project.id, mediaFiles, markForDeletion);
        setFeedback(null);
      }, 180);
    }, preferences.feedbackDurationMs);
  }

  function stopReview() {
    if (timer.current !== null) clearTimeout(timer.current);
    if (pendingDecision.current !== null) {
      decideCurrentFile(project.id, mediaFiles, pendingDecision.current);
      pendingDecision.current = null;
    }
    onBack();
  }

  useEffect(() => {
    if (!currentFilePath) {
      setMetadata(null);
      setMetadataError(null);
      setMetadataLoading(false);
      return;
    }

    let cancelled = false;
    setMetadata(null);
    setMetadataError(null);
    setMetadataLoading(true);

    stat(currentFilePath)
      .then((fileInfo) => {
        if (!cancelled) {
          setMetadata({
            name: getFileName(currentFilePath),
            size: fileInfo.size,
            birthtime: fileInfo.birthtime,
          });
        }
      })
      .catch((error: unknown) => {
        console.error(`Failed to load metadata for "${currentFilePath}".`, error);
        if (!cancelled) {
          setMetadataError(
            error instanceof Error
              ? error.message
              : "Could not load this file's metadata.",
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setMetadataLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [currentFilePath]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) {
        return;
      }

      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest("input, textarea, select, [contenteditable='true']"))
      ) {
        return;
      }

      if (
        event.key !== "ArrowLeft" &&
        event.key !== "ArrowRight" &&
        event.key !== "ArrowUp"
      ) {
        return;
      }
      event.preventDefault();

      if (pendingDecision.current !== null) return;
      if (event.key === "ArrowUp") {
        undoLastDecision(project.id, mediaFiles);
      } else {
        startDecision(event.key === "ArrowLeft");
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [mediaFiles, project.id, currentFilePath, preferences.feedbackDurationMs]);

  const progress =
    mediaFiles.length > 0
      ? Math.min(
          100,
          Math.round((project.currentIndex / mediaFiles.length) * 100),
        )
      : 0;
  const currentFileExtension = currentFilePath
    ?.slice(currentFilePath.lastIndexOf(".") + 1)
    .toLowerCase();
  const isVideo =
    currentFileExtension !== undefined &&
    videoExtensions.has(currentFileExtension);

  return (
    <main className="min-h-screen bg-[#0b100f] px-4 py-5 text-stone-100 sm:px-7 sm:py-7">
      <div className="mx-auto max-w-7xl">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <button
              type="button"
              onClick={stopReview}
              className="rounded-full border border-white/10 px-4 py-2 text-sm font-medium text-stone-300 transition hover:border-white/20 hover:text-white"
            >
              Stop review
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
          {mediaFiles.length > 0 && (
            <p className="shrink-0 text-sm font-medium text-stone-400">
              File{" "}
              <span className="text-stone-100">
                {project.currentIndex + 1}
              </span>{" "}
              of {mediaFiles.length}
            </p>
          )}
        </header>

        {mediaFiles.length === 0 ? (
          <section className="flex min-h-[65vh] flex-col items-center justify-center rounded-[2rem] border border-white/8 bg-[#121918] px-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-200">
              Nothing to review
            </p>
            <h1 className="mt-4 text-3xl font-semibold tracking-tight">
              No supported media found
            </h1>
            <p className="mt-3 max-w-lg text-sm leading-6 text-stone-400">
              This folder may be empty or contain file types outside the MVP
              formats. Your files have not been changed.
            </p>
            <button
              type="button"
              onClick={onBack}
              className="mt-7 rounded-full bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100"
            >
              Back to projects
            </button>
          </section>
        ) : (
          <>
            <div className="mb-5 h-1.5 overflow-hidden rounded-full bg-white/[0.07]">
              <div
                className="h-full rounded-full bg-emerald-200 transition-[width] duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>

            <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_19rem]">
              <section
                aria-label="Media preview"
                className={`decision-card relative flex min-h-[55vh] items-center justify-center overflow-hidden rounded-[1.75rem] border border-white/8 bg-black/50 p-3 sm:min-h-[65vh] sm:p-5 ${
                  feedback?.sliding ? (feedback.markForDeletion ? "slide-left" : "slide-right") : ""
                }`}
              >
                <div className="relative flex min-w-0 max-w-full items-center justify-center overflow-hidden rounded-xl">
                  {isVideo ? (
                    <video
                      key={currentFilePath}
                      src={convertFileSrc(currentFilePath)}
                      controls
                      autoPlay={preferences.autoplayVideo}
                      muted
                      loop
                      playsInline
                      ref={(video) => {
                        if (video) {
                          video.defaultPlaybackRate = preferences.videoPlaybackRate;
                          video.playbackRate = preferences.videoPlaybackRate;
                        }
                      }}
                      onLoadedMetadata={(event) => {
                        event.currentTarget.playbackRate = preferences.videoPlaybackRate;
                      }}
                      className="max-h-[72vh] max-w-full rounded-xl object-contain"
                    />
                  ) : (
                    <img
                      key={currentFilePath}
                      src={convertFileSrc(currentFilePath)}
                      alt={metadata?.name ?? getFileName(currentFilePath)}
                      className="max-h-[72vh] max-w-full rounded-xl object-contain"
                    />
                  )}
                  {feedback && (
                    <div
                      aria-hidden="true"
                      className={`decision-glow ${feedback.markForDeletion ? "decision-glow-delete" : "decision-glow-keep"}`}
                      style={{ animationDuration: `${preferences.feedbackDurationMs}ms` }}
                    />
                  )}
                </div>
                {feedback && (
                  <p role="status" className="absolute bottom-8 rounded-full bg-black/80 px-5 py-2 text-sm font-semibold text-white">
                    {feedback.markForDeletion ? "Marked for deletion" : "Keep"}
                  </p>
                )}
              </section>

              <aside className="flex flex-col gap-4">
                <section className="rounded-[1.5rem] border border-white/8 bg-[#121918] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    File details
                  </p>
                  {metadataLoading && (
                    <p role="status" className="mt-5 text-sm text-stone-400">
                      Loading metadata…
                    </p>
                  )}
                  {metadataError && (
                    <p role="alert" className="mt-5 break-words text-sm text-rose-200">
                      {metadataError}
                    </p>
                  )}
                  <dl className="mt-5 space-y-4">
                    <div>
                      <dt className="text-xs text-stone-500">Name</dt>
                      <dd className="mt-1 break-all text-sm font-medium text-stone-200">
                        {metadata?.name ?? "Unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Size</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-200">
                        {metadata ? formatBytes(metadata.size) : "Unavailable"}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Created</dt>
                      <dd className="mt-1 text-sm font-medium text-stone-200">
                        {formatDate(metadata?.birthtime ?? null)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-xs text-stone-500">Path</dt>
                      <dd className="mt-1 break-all font-mono text-xs leading-5 text-stone-400">
                        {currentFilePath}
                      </dd>
                    </div>
                  </dl>
                </section>

                <section className="rounded-[1.5rem] border border-white/8 bg-[#121918] p-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-stone-500">
                    Your decision
                  </p>
                  <p className="mt-3 text-sm text-stone-300">
                    {project.markedForDeletion.length.toLocaleString()} marked
                    for deletion
                  </p>
                  <button
                    type="button"
                    onClick={onPreview}
                    disabled={feedback !== null}
                    className="mt-4 w-full rounded-xl bg-emerald-200 px-4 py-2.5 text-sm font-medium text-emerald-950 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Review marked files
                  </button>
                  <button
                    type="button"
                    onClick={() => undoLastDecision(project.id, mediaFiles)}
                    disabled={project.currentIndex === 0 || feedback !== null}
                    className="mt-4 w-full rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-stone-300 transition hover:bg-white/[0.04] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Undo last decision <span className="text-stone-500">(↑)</span>
                  </button>
                </section>
              </aside>
            </div>

            <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() =>
                  startDecision(true)
                }
                disabled={feedback !== null}
                className="min-w-44 rounded-full border border-rose-200/20 bg-rose-200/[0.06] px-6 py-3.5 text-sm font-semibold text-rose-100 transition hover:border-rose-200/40 hover:bg-rose-200/[0.1] disabled:opacity-50"
              >
                Mark to delete <span className="ml-1 text-rose-100/60">←</span>
              </button>
              <button
                type="button"
                onClick={() =>
                  startDecision(false)
                }
                disabled={feedback !== null}
                className="min-w-44 rounded-full bg-emerald-200 px-6 py-3.5 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100 disabled:opacity-50"
              >
                Keep <span className="ml-1 text-emerald-950/60">→</span>
              </button>
            </div>
            <p className="mt-4 text-center text-xs text-stone-600">
              Use ← to mark for deletion, → to keep, and ↑ to undo. Files are
              only marked; nothing is deleted now.
            </p>
          </>
        )}
      </div>
    </main>
  );
}

export default MediaViewer;
