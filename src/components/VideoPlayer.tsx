import { useEffect, useRef, useState } from "react";
import { convertFileSrc, invoke } from "@tauri-apps/api/core";
import { join, tempDir } from "@tauri-apps/api/path";
import { Command } from "@tauri-apps/plugin-shell";
import { exists, remove } from "@tauri-apps/plugin-fs";
import { isHevcMain10 } from "../lib/videoCodec";

interface VideoPlayerProps {
  filePath: string;
  autoPlay: boolean;
  audioEnabled: boolean;
  playbackDelaySeconds: number;
  playbackRate: number;
}

interface TranscodeStatus {
  source: string | null;
  loading: boolean;
  error: string | null;
}

interface ProcessExit {
  code: number | null;
  signal: number | null;
}

const transcodedExtensions = new Set(["mkv", "avi"]);
const codecProbeExtensions = new Set(["mp4", "mov"]);

function VideoPlayer({
  filePath,
  autoPlay,
  audioEnabled,
  playbackDelaySeconds,
  playbackRate,
}: VideoPlayerProps) {
  const extension = filePath.slice(filePath.lastIndexOf(".") + 1).toLowerCase();
  const requiresTranscoding = transcodedExtensions.has(extension);
  const requiresCodecProbe = codecProbeExtensions.has(extension);
  const requiresPreparation = requiresTranscoding || requiresCodecProbe;
  const videoRef = useRef<HTMLVideoElement>(null);
  const [status, setStatus] = useState<TranscodeStatus>({
    source: requiresPreparation ? null : convertFileSrc(filePath),
    loading: requiresPreparation,
    error: null,
  });

  useEffect(() => {
    const video = videoRef.current;
    if (!autoPlay || !status.source) {
      video?.pause();
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const currentVideo = videoRef.current;
      if (!currentVideo) {
        return;
      }

      void currentVideo.play().catch((error: unknown) => {
        if (!cancelled && videoRef.current === currentVideo) {
          console.warn("Could not start video playback automatically.", error);
          setStatus((current) => ({
            ...current,
            error: "Automatic playback was blocked. Use the player controls to start playback.",
          }));
        }
      });
    }, playbackDelaySeconds * 1000);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [autoPlay, filePath, playbackDelaySeconds, status.source]);

  useEffect(() => {
    let cancelled = false;
    let spawnPending = false;
    let processExited = false;
    let child: { kill: () => Promise<void> } | null = null;
    let outputPath: string | null = null;
    let exitPromise: Promise<ProcessExit> | null = null;
    let stopping: Promise<void> | null = null;

    async function removePreview(): Promise<void> {
      if (outputPath && (await exists(outputPath))) {
        await remove(outputPath);
      }
    }

    function stopAndClean(): Promise<void> {
      stopping ??= (async () => {
        if (child && !processExited) {
          try {
            await child.kill();
          } catch (error) {
            if (!processExited) {
              console.warn("Could not stop the FFmpeg preview process.", error);
            }
          }
          if (exitPromise) {
            try {
              await exitPromise;
            } catch (error) {
              console.warn("The FFmpeg preview process ended with an error.", error);
            }
          }
        }
        await removePreview();
      })();
      return stopping;
    }

    async function runFfmpeg(args: string[]): Promise<{
      result: ProcessExit;
      stderr: string;
    } | null> {
      let stderr = "";
      const command = Command.sidecar("binaries/ffmpeg", args);
      command.stderr.on("data", (line) => {
        stderr = `${stderr}${line}`.slice(0, 16384);
      });

      exitPromise = new Promise<ProcessExit>((resolve, reject) => {
        command.once("close", (event) => {
          processExited = true;
          resolve(event);
        });
        command.once("error", (error) => reject(new Error(error)));
      });

      processExited = false;
      spawnPending = true;
      child = await command.spawn();
      if (cancelled) {
        await stopAndClean();
        return null;
      }

      const result = await exitPromise;
      child = null;
      exitPromise = null;
      spawnPending = false;
      return { result, stderr };
    }

    if (!requiresPreparation) {
      setStatus({ source: convertFileSrc(filePath), loading: false, error: null });
      return;
    }

    setStatus({ source: null, loading: true, error: null });

    async function transcode(): Promise<void> {
      try {
        let shouldTranscode = requiresTranscoding;
        if (requiresCodecProbe) {
          const streamInfo = await invoke<string>("probe_video_stream", { filePath });
          if (cancelled) {
            return;
          }
          shouldTranscode = isHevcMain10(streamInfo);
        }

        if (!shouldTranscode) {
          if (!cancelled) {
            setStatus({
              source: convertFileSrc(filePath),
              loading: false,
              error: null,
            });
          }
          return;
        }

        const temporaryDirectory = await tempDir();
        outputPath = await join(
          temporaryDirectory,
          `swipeclean-preview-${crypto.randomUUID()}.webm`,
        );
        if (cancelled) {
          await removePreview();
          return;
        }

        const transcoding = await runFfmpeg([
          "-hide_banner",
          "-loglevel",
          "error",
          "-nostdin",
          "-i",
          filePath,
          "-map",
          "0:v:0",
          "-map",
          "0:a:0?",
          "-c:v",
          "libvpx-vp9",
          "-deadline",
          "realtime",
          "-cpu-used",
          "8",
          "-crf",
          "32",
          "-b:v",
          "0",
          "-strict",
          "-2",
          "-c:a",
          "opus",
          "-b:a",
          "128k",
          "-f",
          "webm",
          outputPath,
        ]);
        if (cancelled || !transcoding) {
          return;
        }

        if (transcoding.result.code !== 0) {
          const reason =
            transcoding.stderr.trim() ||
            `FFmpeg exited with code ${transcoding.result.code ?? "unknown"}${
              transcoding.result.signal === null ? "" : ` (signal ${transcoding.result.signal})`
            }.`;
          throw new Error(reason);
        }
        if (!(await exists(outputPath))) {
          throw new Error("FFmpeg completed without creating a preview file.");
        }

        setStatus({
          source: convertFileSrc(outputPath),
          loading: false,
          error: null,
        });
      } catch (error) {
        console.error(`Failed to prepare a video preview for "${filePath}".`, error);
        if (!cancelled) {
          setStatus({
            source: null,
            loading: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
        try {
          await stopAndClean();
        } catch (cleanupError) {
          console.error("Failed to clean up the temporary video preview.", cleanupError);
        }
      }
    }

    void transcode();

    return () => {
      cancelled = true;
      if (child || !spawnPending) {
        void stopAndClean().catch((error: unknown) => {
          console.error("Failed to clean up the temporary video preview.", error);
        });
      }
    };
  }, [filePath, requiresCodecProbe, requiresPreparation, requiresTranscoding]);

  return (
    <>
      {status.loading && (
        <p role="status" className="px-6 text-center text-sm text-stone-300">
          Preparing video preview…
        </p>
      )}
      {status.error && (
        <p role="alert" className="max-w-xl break-words px-6 text-center text-sm text-rose-200">
          Video preview error: {status.error}
        </p>
      )}
      {status.source && (
        <video
          src={status.source}
          controls
          muted={!audioEnabled}
          loop
          playsInline
          ref={(video) => {
            if (video) {
              videoRef.current = video;
              video.defaultPlaybackRate = playbackRate;
              video.playbackRate = playbackRate;
            } else {
              videoRef.current = null;
            }
          }}
          onLoadedMetadata={(event) => {
            event.currentTarget.playbackRate = playbackRate;
          }}
          onError={() => {
            setStatus((current) => ({
              ...current,
              error: "The WebView could not play this video preview.",
            }));
          }}
          className="max-h-[72vh] max-w-full rounded-xl object-contain"
        />
      )}
    </>
  );
}

export default VideoPlayer;
