import { useState } from "react";
import { useProjectStore } from "../store/useProjectStore";

function PreferencesSection() {
  const preferences = useProjectStore((state) => state.preferences);
  const setPreferences = useProjectStore((state) => state.setPreferences);
  const [duration, setDuration] = useState(String(preferences.feedbackDurationMs));
  const durationNumber = Number(duration);
  const validDuration =
    duration.trim() !== "" &&
    Number.isSafeInteger(durationNumber) &&
    durationNumber >= 0 &&
    durationNumber <= 2147483647;

  return (
    <section aria-labelledby="preferences-heading" className="mt-12 border-t border-white/8 pt-10">
      <h2 id="preferences-heading" className="text-2xl font-semibold text-stone-100">
        Preferences
      </h2>
      <p className="mt-2 text-sm text-stone-400">Changes are saved automatically.</p>
      <div className="mt-6 grid gap-6 rounded-[1.5rem] border border-white/8 bg-[#121918] p-6 sm:grid-cols-3">
        <label className="flex items-start gap-3 text-sm text-stone-200">
          <input
            type="checkbox"
            checked={preferences.autoplayVideo}
            onChange={(event) => setPreferences({ autoplayVideo: event.target.checked })}
            className="mt-1 accent-emerald-300"
          />
          Autoplay videos
        </label>
        <label className="text-sm text-stone-200">
          Choice feedback duration (ms)
          <input
            type="number"
            min="0"
            max="2147483647"
            step="1"
            value={duration}
            aria-invalid={!validDuration}
            aria-describedby={!validDuration ? "duration-error" : undefined}
            onChange={(event) => {
              const next = event.target.value;
              setDuration(next);
              const value = Number(next);
              if (next.trim() !== "" && Number.isSafeInteger(value) && value >= 0 && value <= 2147483647) {
                setPreferences({ feedbackDurationMs: value });
              }
            }}
            className="mt-2 block w-full rounded-xl border border-white/12 bg-black/20 px-3 py-2 text-white"
          />
          {!validDuration && (
            <span id="duration-error" role="alert" className="mt-2 block text-xs text-rose-200">
              Enter a whole number from 0 to 2147483647.
            </span>
          )}
        </label>
        <label className="text-sm text-stone-200">
          Video preview speed: {preferences.videoPlaybackRate}x
          <input
            type="range"
            min="1"
            max="2"
            step="0.5"
            value={preferences.videoPlaybackRate}
            onChange={(event) => {
              const value = Number(event.target.value);
              if (value === 1 || value === 1.5 || value === 2) {
                setPreferences({ videoPlaybackRate: value });
              }
            }}
            className="mt-3 block w-full accent-emerald-300"
          />
          <span className="mt-1 flex justify-between text-xs text-stone-500">
            <span>1x</span><span>1.5x</span><span>2x</span>
          </span>
        </label>
      </div>
    </section>
  );
}

export default PreferencesSection;
