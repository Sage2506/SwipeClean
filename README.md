# SwipeClean (Media Culler App)

## Overview
SwipeClean is a blazing-fast, desktop-native application designed to help users effortlessly cull and clean up massive folders of photos and videos. Built with React and Tauri, it gamifies the file deletion process using a "Tinder-style" binary choice system.

Instead of dealing with clunky OS file explorers or complex professional photography software, users view their media one by one, making split-second "Keep" or "Delete" decisions using keyboard arrows.

**Files are not deleted when marked.** Users review the marked files and confirm deletion explicitly, either during a project or after reviewing every file.

## Running the Project

First, install the platform-specific requirements listed in [External Requirements](#external-requirements). From the project root, install the JavaScript dependencies:

```sh
npm ci
```

`npm run dev` starts only the Vite frontend. Since project storage and media access use Tauri's native APIs, the app cannot run fully in a regular browser. To run SwipeClean with its desktop features during development, use:

```sh
npm run tauri dev
```

For frontend-only development, you can still start Vite with:

```sh
npm run dev
```

To build the desktop application for distribution, use:

```sh
npm run tauri build
```

## Core Features
* **Projects:** Select a folder, track review progress, stop and resume later, or remove a project after confirmation without deleting its media. Project data and preferences are saved locally. After an app restart, you may need to select the same folder again to restore access.
* **Media scanning:** Recursively scans supported images and videos in alphabetical order. Dot-prefixed subdirectories and symbolic links are skipped. Supported formats are MP4, WEBM, MOV, PNG, JPEG, JPG, GIF, and WEBP.
* **Media viewer:** Preview photos and videos with file name, path, size, creation date, and review progress. Metadata errors are shown when details cannot be read.
* **Review controls:** Use buttons or **Left Arrow** to mark for deletion, **Right Arrow** to keep, and **Up Arrow** to undo. A choice displays colored feedback and slides the card before advancing.
* **Preferences:** Configure video autoplay, preview speed (1x, 1.5x, or 2x), and choice-feedback duration (300 ms by default).
* **Review and deletion:** Preview marked files and their available sizes during or after a review. Files are permanently deleted only after typing the project folder name and confirming. Failed deletions are reported and remain marked for retry.
* **Mid-review cleanup:** Delete marked files without closing the project, then resume at the same file. SwipeClean rescans the folder and updates progress; refresh errors can be retried.

## Tech Stack
* **Frontend:** React 18+ (Vite), TypeScript, TailwindCSS
* **Desktop Runtime:** Tauri v2 (cross-platform Windows, Linux, and macOS)
* **State Management:** Zustand (for global project state)
* **Icons/UI:** Lucide React (recommended)

## External Requirements

The npm packages are listed in `package.json` and locked in `package-lock.json`. Install them with `npm ci`.

All platforms need:

* **Node.js LTS and npm** to run the React/Vite frontend.
* **Rust stable 1.90 or newer**, installed with [rustup](https://www.rust-lang.org/tools/install), to build and run the Tauri desktop app. Rust 1.90 is required by the dependencies in the current `Cargo.lock`.

### Windows 11

* Install [Microsoft C++ Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/) and select the **Desktop development with C++** workload.
* Tauri uses [Microsoft Edge WebView2](https://developer.microsoft.com/microsoft-edge/webview2/). It is normally included with Windows 11; install the Evergreen Runtime if it is missing.
* Install Rust with rustup and use the MSVC toolchain.

### Ubuntu 26.04

Install Tauri's native build dependencies:

```sh
sudo apt update
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
  libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev
```

Install Rust with [rustup](https://www.rust-lang.org/tools/install).

### macOS

Install [Xcode Command Line Tools](https://developer.apple.com/xcode/resources/) for desktop development:

```sh
xcode-select --install
```

Install Rust with [rustup](https://www.rust-lang.org/tools/install). Full Xcode is required only when targeting iOS.

For setup and run commands, see [Running the Project](#running-the-project). See the [Tauri prerequisites guide](https://v2.tauri.app/start/prerequisites/) for details and troubleshooting.

## Architecture & Data Flow (For AI Context)

### 1. The Data Model
Project state and preferences are managed via Zustand and persisted to the OS `AppData` directory using Tauri's `@tauri-apps/plugin-fs`.
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

- Dot-prefixed subdirectories are skipped, as are symbolic links. Dot-prefixed media files are included, and a dot-prefixed folder can still be selected as the project root.

- Filters: Currently restricted to web-supported formats: .mp4, .webm, .mov, .png, .jpeg, .jpg, .gif, .webp.

- Sorting: Files are sorted alphabetically by path before being loaded into the viewer.

- Note: Files are NOT loaded into memory. The app only manages arrays of string paths.

### 3. Tauri Asset Resolution

Because webvies block local file:// protocols, absolute paths are converted on-the-flu using Tauri's convertFileSrc to render inside standard img and video tags.

### 4. Future Roadmap
Mobile Port: Adapting the UI for Android (Tauri Mobile) using touch-swipe gestures instead of keyboard arrows.

FFmpeg Integration: Using Tauri Sidecars to bundle FFmpeg and transcode non-web formats (.mkv, .avi) into temporary .mp4 files for previewing.