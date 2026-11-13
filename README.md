# SwipeClean (Media Culler App)

## Overview
SwipeClean is a blazing-fast, desktop-native application designed to help users effortlessly cull and clean up massive folders of photos and videos. Built with React and Tauri, it gamifies the file deletion process using a "Tinder-style" binary choice system.

Instead of dealing with clunky OS file explorers or complex professional photography software, users view their media one by one, making split-second "Keep" or "Delete" decisions using keyboard arrows.

Crucially, **no files are deleted immediately**. The app defers deletion to the very end, providing a summary table of data to be freed and requiring a safety confirmation, ensuring zero accidental data loss.

## Core Features
* **Project-Based State:** Users can start cleaning a folder, close the app, and resume exactly where they left off later. Progress is automatically saved locally.
* **Tinder-Style UX:**
  * Large, distraction-free media viewer (auto-playing videos, high-res images).
  * Small metadata overlay (File path, name, size, creation date).
  * **Left Arrow:** Mark for deletion.
  * **Right Arrow:** Keep file (skip to next).
* **Deferred Deletion (Safety First):** Files marked for deletion are simply added to an array in the app's state.
* **Summary & Execution:** Once all files in a folder are reviewed, the user is presented with a checkout table showing all marked files and the total Gigabytes to be freed. Deletion requires typing the folder name to confirm.

## Tech Stack
* **Frontend:** React 18+ (Vite), TypeScript, TailwindCSS
* **Desktop Runtime:** Tauri v2 (Cross-platform MacOS/Windows)
* **State Management:** Zustand (for global project state)
* **Icons/UI:** Lucide React (recommended)

## Architecture & Data Flow (For AI Context)

### 1. The Data Model
Global state is managed via Zustand and persisted to the OS `AppData` directory using Tauri's `@tauri-apps/plugin-fs`.
```typescript
interface Project {
  id: string;
  name: string;
  targetFolder: string;    // Absolute OS path
  currentIndex: number;    // Tracking progress
  totalFiles: number;
  markedForDeletion: string[]; // Array of absolute paths waiting to be deleted
  lastAccessed: number;
}
```
### 2. File Scanning (MVP Scope)
Upon creating a project, a recursive function scans the targetFolder and its subdirectories.

- Filters: Currently restricted to web-supported formats: .mp4, .webm, .mov, .png, .jpeg, .jpg, .gif, .webp.

- Sorting: Files are sorted alphabetically by path before being loaded into the viewer.

- Note: Files are NOT loaded into memory. The app only manages arrays of string paths.

### 3. Tauri Asset Resolution

Because webvies block local file:// protocols, absolute paths are converted on-the-flu using Tauri's convertFileSrc to render inside standard img and video tags.

### 4. Future Roadmap
Mobile Port: Adapting the UI for Android (Tauri Mobile) using touch-swipe gestures instead of keyboard arrows.

FFmpeg Integration: Using Tauri Sidecars to bundle FFmpeg and transcode non-web formats (.mkv, .avi) into temporary .mp4 files for previewing.