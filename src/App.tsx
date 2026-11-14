import { useState } from "react";
import { basename } from "@tauri-apps/api/path";
import { open } from "@tauri-apps/plugin-dialog";
import { useProjectStore } from "./store/useProjectStore";
import type { Project } from "./types";
import "./App.css";

function App() {
  const projects = useProjectStore((state) => state.projects);
  const activeProjectId = useProjectStore((state) => state.activeProjectId);
  const createProject = useProjectStore((state) => state.createProject);
  const setActiveProject = useProjectStore((state) => state.setActiveProject);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [openedProjectId, setOpenedProjectId] = useState<string | null>(null);

  const openedProject = projects.find(
    (project) => project.id === openedProjectId,
  );
  const recentProjects = [...projects].sort(
    (first, second) => second.lastAccessed - first.lastAccessed,
  );

  async function handleCreateProject() {
    setError(null);
    setIsCreating(true);

    try {
      const selectedPath = await open({
        title: "Choose a folder to clean",
        directory: true,
        multiple: false,
        recursive: true,
      });
      const folderPath = Array.isArray(selectedPath)
        ? selectedPath[0]
        : selectedPath;

      if (!folderPath) {
        return;
      }

      const folderName = (await basename(folderPath)) || folderPath;
      const project: Project = {
        id: crypto.randomUUID(),
        name: folderName,
        targetFolder: folderPath,
        currentIndex: 0,
        totalFiles: 0,
        markedForDeletion: [],
        lastAccessed: Date.now(),
      };

      createProject(project);
      setOpenedProjectId(project.id);
    } catch (error) {
      console.error("Failed to create a SwipeClean project.", error);
      setError(
        error instanceof Error ? error.message : "An unexpected error occurred.",
      );
    } finally {
      setIsCreating(false);
    }
  }

  function handleOpenProject(project: Project) {
    setActiveProject(project.id);
    setOpenedProjectId(project.id);
  }

  if (openedProject) {
    return (
      <main className="min-h-screen bg-[#0b100f] px-6 py-8 text-stone-100">
        <div className="mx-auto max-w-5xl">
          <button
            type="button"
            className="mb-12 inline-flex items-center gap-2 text-sm font-medium text-stone-400 transition hover:text-white"
            onClick={() => setOpenedProjectId(null)}
          >
            <span aria-hidden="true">←</span>
            All projects
          </button>

          <section className="rounded-[2rem] border border-white/10 bg-[#121918] p-8 shadow-2xl shadow-black/20 sm:p-12">
            <div className="mb-8 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-300/10 text-emerald-200">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                className="h-7 w-7"
              >
                <path
                  d="M3.75 7.5h6l2 2h8.5v8.25a1.75 1.75 0 0 1-1.75 1.75h-13a1.75 1.75 0 0 1-1.75-1.75V7.5Z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
                <path
                  d="M3.75 7.5V6.25A1.75 1.75 0 0 1 5.5 4.5h4.25l2 2h6.75"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.22em] text-emerald-200">
              Project workspace
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              {openedProject.name}
            </h1>
            <p className="mt-3 break-all font-mono text-sm leading-6 text-stone-400">
              {openedProject.targetFolder}
            </p>
            <div className="mt-10 rounded-2xl border border-white/8 bg-white/[0.03] p-5 sm:p-6">
              <p className="font-medium text-stone-200">
                Your project is ready.
              </p>
              <p className="mt-2 text-sm leading-6 text-stone-400">
                {openedProject.totalFiles > 0
                  ? `${Math.min(openedProject.currentIndex, openedProject.totalFiles).toLocaleString()} of ${openedProject.totalFiles.toLocaleString()} files reviewed. `
                  : "Media scanning has not started yet. "}
                The media viewer is coming next. Files will not be deleted until
                you review the final summary and confirm.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpenedProjectId(null)}
              className="mt-8 rounded-full bg-emerald-200 px-5 py-3 text-sm font-semibold text-emerald-950 transition hover:bg-emerald-100"
            >
              Back to projects
            </button>
          </section>
        </div>
      </main>
    );
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0b100f] text-stone-100">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-56 right-[-12rem] h-[34rem] w-[34rem] rounded-full bg-emerald-300/[0.07] blur-[120px]"
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6 sm:px-8">
        <a
          href="#home"
          className="flex items-center gap-3"
          aria-label="SwipeClean home"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-200 text-lg font-black tracking-tighter text-emerald-950">
            S
          </span>
          <span className="text-lg font-semibold tracking-tight">
            Swipe<span className="text-emerald-200">Clean</span>
          </span>
        </a>
        <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 text-xs font-medium text-stone-400 sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-300" />
          Private by design
        </div>
      </header>

      <main id="home" className="relative mx-auto max-w-6xl px-6 pb-16 sm:px-8">
        <section className="grid items-center gap-12 pb-16 pt-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16 lg:pb-20 lg:pt-14">
          <div>
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-200/15 bg-emerald-200/[0.06] px-3.5 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-emerald-100">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
              A calmer way to cull
            </div>
            <h1 className="max-w-2xl text-5xl font-semibold leading-[1.06] tracking-[-0.045em] text-stone-50 sm:text-6xl">
              Make room for the{" "}
              <span className="text-emerald-200">moments worth keeping.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-7 text-stone-400 sm:text-lg sm:leading-8">
              Review one photo or video at a time. Keep what matters, mark what
              doesn&apos;t, and decide what to delete only after your final
              review.
            </p>
            <button
              type="button"
              onClick={handleCreateProject}
              disabled={isCreating}
              className="mt-8 inline-flex min-h-13 items-center justify-center gap-3 rounded-full bg-emerald-200 px-6 py-3.5 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-950/20 transition hover:-translate-y-0.5 hover:bg-emerald-100 disabled:cursor-wait disabled:opacity-70"
            >
              {isCreating ? "Opening folder picker..." : "Start a new project"}
              {!isCreating && <span aria-hidden="true">↗</span>}
            </button>
            <p className="mt-4 text-xs text-stone-500">
              Your files stay where they are. Deletion is always deferred.
            </p>
          </div>

          <div className="relative mx-auto w-full max-w-[31rem]">
            <div className="absolute -inset-4 rounded-[2.5rem] bg-emerald-200/[0.035] blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-white/10 bg-[#131a18] p-5 shadow-2xl shadow-black/30 sm:p-7">
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-stone-500">
                    YOUR NEXT SESSION
                  </p>
                  <p className="mt-1 text-sm font-semibold text-stone-200">
                    One decision at a time
                  </p>
                </div>
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-stone-700" />
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-200" />
                </div>
              </div>
              <div className="relative flex aspect-[1.22/1] items-center justify-center overflow-hidden rounded-[1.5rem] border border-white/5 bg-[radial-gradient(ellipse_at_55%_30%,rgba(142,178,142,0.42),transparent_35%),linear-gradient(145deg,#34433a_0%,#1d2925_50%,#111817_100%)]">
                <div
                  aria-hidden="true"
                  className="absolute bottom-[-18%] left-[-10%] h-[70%] w-[120%] -rotate-6 rounded-[50%] bg-[#192420] shadow-[0_-30px_70px_rgba(7,12,10,0.25)]"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-[18%] left-[12%] h-[32%] w-[30%] rotate-[-18deg] rounded-t-full bg-[#27352c] blur-[1px]"
                />
                <div
                  aria-hidden="true"
                  className="absolute bottom-[20%] right-[14%] h-[42%] w-[27%] rotate-[13deg] rounded-t-full bg-[#314236] blur-[1px]"
                />
                <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/20 px-3 py-1.5 text-[10px] font-medium tracking-wide text-white/75 backdrop-blur">
                  FAMILY TRIP · 2025
                </div>
                <div className="absolute bottom-4 left-4 right-4 flex items-end justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      A good one.
                    </p>
                    <p className="mt-0.5 text-xs text-white/65">
                      IMG_4821.jpg
                    </p>
                  </div>
                  <span className="rounded-full border border-white/15 bg-black/20 px-2.5 py-1 text-[10px] text-white/75 backdrop-blur">
                    08 / 126
                  </span>
                </div>
              </div>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="flex items-center justify-center gap-2 rounded-xl border border-rose-200/10 bg-rose-200/[0.04] py-3 text-sm font-medium text-rose-100">
                  <span aria-hidden="true" className="text-base">
                    ←
                  </span>
                  Mark to delete
                </div>
                <div className="flex items-center justify-center gap-2 rounded-xl border border-emerald-200/10 bg-emerald-200/[0.05] py-3 text-sm font-medium text-emerald-100">
                  Keep
                  <span aria-hidden="true" className="text-base">
                    →
                  </span>
                </div>
              </div>
            </div>
            <div className="absolute -bottom-5 -left-3 hidden rounded-2xl border border-white/10 bg-[#18201d] px-4 py-3 shadow-xl sm:block">
              <p className="text-[10px] font-medium uppercase tracking-wider text-stone-500">
                Nothing deleted yet
              </p>
              <p className="mt-1 text-xs font-semibold text-stone-200">
                You stay in control
              </p>
            </div>
          </div>
        </section>

        <section aria-labelledby="projects-heading" className="border-t border-white/8 pt-10">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">
                Your workspace
              </p>
              <h2
                id="projects-heading"
                className="mt-2 text-2xl font-semibold tracking-tight text-stone-100"
              >
                Recent projects
              </h2>
            </div>
            <p className="text-sm text-stone-500">
              {projects.length === 1
                ? "1 project"
                : `${projects.length} projects`}
            </p>
          </div>

          {error && (
            <div
              role="alert"
              className="mb-5 flex items-start justify-between gap-4 rounded-2xl border border-rose-300/20 bg-rose-300/[0.06] px-4 py-3 text-sm text-rose-100"
            >
              <p>{error}</p>
              <button
                type="button"
                className="shrink-0 text-rose-100/70 hover:text-white"
                aria-label="Dismiss error"
                onClick={() => setError(null)}
              >
                ×
              </button>
            </div>
          )}

          {projects.length === 0 ? (
            <div className="rounded-[1.75rem] border border-dashed border-white/12 bg-white/[0.02] px-6 py-12 text-center sm:py-16">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-stone-300">
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  fill="none"
                  className="h-6 w-6"
                >
                  <path
                    d="M3.75 7.5h6l2 2h8.5v8.25a1.75 1.75 0 0 1-1.75 1.75h-13a1.75 1.75 0 0 1-1.75-1.75V7.5Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M3.75 7.5V6.25A1.75 1.75 0 0 1 5.5 4.5h4.25l2 2h6.75"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h3 className="mt-5 text-lg font-semibold text-stone-200">
                Your first clean slate starts here
              </h3>
              <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-stone-500">
                Choose a folder of photos or videos to create a project. We’ll
                keep your files untouched while you review them.
              </p>
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
                className="mt-6 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 text-sm font-semibold text-stone-200 transition hover:border-emerald-200/30 hover:bg-emerald-200/[0.06] disabled:cursor-wait disabled:opacity-70"
              >
                {isCreating ? "Opening folder picker..." : "Choose a folder"}
              </button>
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {recentProjects.map((project) => {
                const progress =
                  project.totalFiles > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (project.currentIndex / project.totalFiles) * 100,
                        ),
                      )
                    : 0;
                const isActive = project.id === activeProjectId;

                return (
                  <button
                    key={project.id}
                    type="button"
                    onClick={() => handleOpenProject(project)}
                    aria-label={`Open ${project.name}, ${progress}% reviewed`}
                    className="group rounded-[1.5rem] border border-white/8 bg-[#121918] p-5 text-left transition hover:-translate-y-0.5 hover:border-emerald-200/25 hover:bg-[#151e1b] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-200 sm:p-6"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex min-w-0 items-center gap-3.5">
                        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-white/8 bg-white/[0.04] text-emerald-100">
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="h-5 w-5"
                          >
                            <path
                              d="M3.75 7.5h6l2 2h8.5v8.25a1.75 1.75 0 0 1-1.75 1.75h-13a1.75 1.75 0 0 1-1.75-1.75V7.5Z"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                            <path
                              d="M3.75 7.5V6.25A1.75 1.75 0 0 1 5.5 4.5h4.25l2 2h6.75"
                              stroke="currentColor"
                              strokeWidth="1.5"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                        <div className="min-w-0">
                          <h3 className="truncate font-semibold text-stone-100">
                            {project.name}
                          </h3>
                          <p
                            title={project.targetFolder}
                            className="mt-1 truncate font-mono text-xs text-stone-500"
                          >
                            {project.targetFolder}
                          </p>
                        </div>
                      </div>
                      <span
                        className={`mt-1 h-2 w-2 shrink-0 rounded-full ${
                          isActive ? "bg-emerald-200" : "bg-stone-700"
                        }`}
                        aria-label={isActive ? "Active project" : undefined}
                      />
                    </div>

                    <div className="mt-7 flex items-center justify-between text-xs">
                      <span className="font-medium text-stone-300">
                        {project.totalFiles > 0
                          ? `${Math.min(project.currentIndex, project.totalFiles).toLocaleString()} of ${project.totalFiles.toLocaleString()} reviewed`
                          : "Ready to scan"}
                      </span>
                      <span className="font-medium text-stone-500">
                        {progress}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label={`${project.name} review progress`}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={progress}
                      className="mt-3 h-1.5 overflow-hidden rounded-full bg-white/[0.07]"
                    >
                      <div
                        className="h-full rounded-full bg-emerald-200 transition-[width] duration-500"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-5 flex items-center justify-between border-t border-white/[0.06] pt-4 text-xs text-stone-500">
                      <span>
                        {project.markedForDeletion.length > 0
                          ? `${project.markedForDeletion.length} marked to delete`
                          : "No files marked"}
                      </span>
                      <span className="inline-flex items-center gap-1.5 font-medium text-emerald-200/80 transition group-hover:text-emerald-100">
                        Open project <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {projects.length > 0 && (
            <div className="mt-8 flex justify-center">
              <button
                type="button"
                onClick={handleCreateProject}
                disabled={isCreating}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-4 py-2.5 text-sm font-medium text-stone-300 transition hover:border-emerald-200/25 hover:text-emerald-100 disabled:cursor-wait disabled:opacity-70"
              >
                <span aria-hidden="true" className="text-lg leading-none">
                  +
                </span>
                {isCreating ? "Opening folder picker..." : "New project"}
              </button>
            </div>
          )}
        </section>
      </main>

      <footer className="relative border-t border-white/[0.06] px-6 py-5 text-center text-xs text-stone-600">
        SwipeClean · Review with care. Delete only when you’re ready.
      </footer>
    </div>
  );
}

export default App;
