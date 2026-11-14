export interface Project {
  id: string;
  name: string;
  targetFolder: string;
  currentIndex: number;
  totalFiles: number;
  markedForDeletion: string[];
  lastAccessed: number;
}

export interface Preferences {
  autoplayVideo: boolean;
  feedbackDurationMs: number;
  videoPlaybackRate: 1 | 1.5 | 2;
}
