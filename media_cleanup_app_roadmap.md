# Desktop Media Cleanup App - Development Roadmap

## Tech Stack

* **Framework:** React 18+ (Vite)

* **Desktop Runtime:** Tauri v2

* **Language:** TypeScript

* **Styling:** Tailwind CSS v4

* **State Management:** Zustand (recommended for lightweight global state)

## Phase 1: Setup and Configuration

1. **Scaffold the App:**

   * Run `npm create tauri-app@latest`.

   * Select React and TypeScript.

2. **Install Dependencies:**

   * Install Tailwind CSS v4 and its Vite plugin: `npm install -D tailwindcss @tailwindcss/vite`.

   * PostCSS and Autoprefixer are not needed as direct dependencies for this Vite setup.

   * Configure the Vite plugin in `vite.config.ts`:
     ```typescript
     import tailwindcss from "@tailwindcss/vite";

     // Add tailwindcss() to the existing Vite plugins array,
     // alongside the React plugin.
     plugins: [react(), tailwindcss()],
     ```

   * Add `@import "tailwindcss";` to the app's CSS entry point (for example, `src/App.css`) and make sure that stylesheet is imported by `src/main.tsx`.

   * Tailwind CSS v4 does not use `npx tailwindcss init -p` or require a generated Tailwind config file for the basic Vite setup.

   * Install Zustand for state management (`npm install zustand`).

   * Install React Router if using multiple distinct routes, or plan for conditional component rendering.

3. **Add Tauri Plugins:**

   * Run `npm run tauri add dialog` (for the folder picker).

   * Run `npm run tauri add fs` (for saving state and deleting files).

   * Run `npm run tauri add os` (to locate the AppData directory).

4. **Configure Permissions:**

   * In `src-tauri/capabilities/default.json`, grant only the needed permissions: `fs:allow-appdata-read` and `fs:allow-appdata-write` for project-state persistence, plus `fs:allow-read-dir`, `fs:allow-stat`, and `fs:allow-remove` for scanning, metadata, and deferred deletion.

   * Enable `app.security.assetProtocol` in `src-tauri/tauri.conf.json` with an initially empty scope. Open the target folder with the dialog's `recursive: true` option; the dialog adds the user-selected folder and its subdirectories to the filesystem and asset-protocol scopes.

   * Enable Tauri's `protocol-asset` Cargo feature in `src-tauri/Cargo.toml` so `convertFileSrc` can use the asset protocol.

## Phase 2: Data Modeling and State Management

1. **Define Types:** Create a `types.ts` file defining the `Project` interface (id, name, targetFolder, currentIndex, totalFiles, markedForDeletion, lastAccessed).

2. **Create the Zustand Store:**

   * Set up a global store holding a `projects` array and an `activeProjectId`.

   * Create actions: `createProject`, `updateProjectProgress` (saves current index), `markFileForDeletion`, `deleteProject`.

3. **Storage Logic:**

   * Write a utility function using `@tauri-apps/plugin-fs` to save the Zustand state to `projects.json` in the OS AppData directory whenever it changes.

   * Write an initialization function to load `projects.json` when the React app mounts.

## Phase 3: The Dashboard (Project Management)

1. **Build the UI:** Use Tailwind to create a clean welcome screen with a prominent "New Project" button and a grid/list of existing projects.

2. **Implement "New Project":**

   * Hook the button to `@tauri-apps/plugin-dialog` (`open({ directory: true, recursive: true })`) so the selected folder and its subdirectories are added to the filesystem and asset-protocol scopes.

   * When a folder is selected, create a new `Project` object, add it to the Zustand store, and set it as the active project.

3. **Project Cards:** Display existing projects with a progress bar (`currentIndex / totalFiles * 100`). Clicking a card sets it as active and navigates to the Media Viewer.

## Phase 4: Media Scanning Engine (MVP Version)

1. **Recursive Reader Utility:**

   * Create `src/lib/mediaScanner.ts` with a function that takes a folder path and uses Tauri's `readDir` recursively to find files. Do not follow symlinks outside the selected folder.

2. **Filter and Sort:**

   * **MVP Scope:** Filter files case-insensitively to *strictly* include web-supported formats: `.mp4, .webm, .mov, .png, .jpeg, .jpg, .gif, .webp`. (Ignore `.mkv` and `.avi` entirely for this phase).

   * Sort the resulting paths alphabetically.

3. **Update Project State:** Scan when a project is opened or created, then update the `totalFiles` count in the project state and show the scan status/result.

   * Folder-picker access scopes are temporary. If a saved project's folder cannot be scanned after restarting the app, have the user select that same folder again to restore access.

## Phase 5: The "Tinder" Media Viewer

1. **UI Layout:**

   * Main central area for the media (`<img>` or `<video controls autoPlay loop>`).

   * Sidebar or overlay for file metadata (Name, Size, Path, Date).

   * Status bar showing progress (e.g., "File 45 of 1500").

2. **Tauri Asset Protocol:**

   * *Crucial Step:* Browsers block local file access (`file://`). Use Tauri's `convertFileSrc` from `@tauri-apps/api/core` to convert absolute file paths into custom protocol URLs (e.g., `asset://localhost/C:/...`) so React can render them.

3. **Keyboard Listeners:**

   * Attach a `useEffect` for `keydown`.

   * **ArrowLeft:** Add current file to `markedForDeletion`, increment `currentIndex`.

   * **ArrowRight:** Just increment `currentIndex`.

   * **ArrowUp (Optional):** Undo (decrement index, remove from marked list).

4. **Auto-Save:** Ensure every keystroke/index change triggers a debounced save to `projects.json`.

## Phase 6: Summary and Execution View

1. **The Review Table:** When `currentIndex === totalFiles`, render a Tailwind-styled table listing everything in `markedForDeletion`.

2. **Metadata Fetching:** Iterate through the marked files and fetch their size and creation date using `@tauri-apps/plugin-fs` `stat` to display in the table. Calculate the total MB/GB to be freed.

3. **Safety Lock:**

   * Add an `<input>` requiring the user to type the project's folder name.

   * Disable the "Delete Forever" button until the input matches.

4. **Deletion Logic:**

   * On click, loop through `markedForDeletion` and use `removeFile` from the Tauri fs plugin.

   * Wrap in `try/catch` to handle locked files.

   * Once complete, mark the project as finished or remove it from `projects.json`.

## Phase 7: Polish and Build MVP

1. **Performance:** Check that massive folders don't lag the app (store only string paths in state, not file buffers).

2. **App Icons:** Use Tauri's icon generator to create the OS-specific icons.

3. **Production Build:** Run `npm run tauri build` to generate the MVP installer.

## Phase 8: Post-MVP - FFmpeg Integration (.mkv & .avi support)

1. **Add the Shell Plugin:** Run `npm run tauri add shell` to allow Tauri to spawn child processes.

2. **Bundle FFmpeg:** Use Tauri's "Sidecar" feature to bundle the FFmpeg executable for Windows/Mac/Linux with your app so the user doesn't have to install it manually.

3. **Update Scanner:** Modify Phase 4 to now include `.mkv` and `.avi` files in the recursive scan.

4. **On-the-fly Transcoding Component:**

   * Create a custom `<VideoPlayer>` component in React.

   * If the file is web-supported, render a standard `<video>`.

   * If the file is `.mkv` or `.avi`, use the Tauri shell plugin to invoke the FFmpeg sidecar. You can transcode it into a temporary `.mp4` file in the OS temp directory, then serve that temp file via `convertFileSrc` to the `<video>` element.