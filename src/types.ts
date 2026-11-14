export const MAX_VIDEO_PLAYBACK_DELAY_SECONDS = 2_147_483;

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
  videoAudioEnabled: boolean;
  videoPlaybackDelaySeconds: number;
  feedbackDurationMs: number;
  videoPlaybackRate: 1 | 1.5 | 2;
}
