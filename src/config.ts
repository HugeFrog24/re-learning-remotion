import { getInputProps } from "remotion";

/**
 * FILM CLOCK
 * ----------
 * All timing in this project is authored in SECONDS. FPS is only the rate at
 * which that continuous timeline gets sampled — changing it never changes
 * when anything happens, only how many frames are taken.
 *
 * Conventions:
 * - Sequence / Audio timing: `from={2.5 * fps}` `durationInFrames={4 * fps}`
 * - HTML overlay keyframes: `interpolate(frame, [1 * fps, 2 * fps], ...)`
 * - 3D / procedural motion: `const t = useTime()` (seconds) and functions of `t`
 *   (e.g. `rotation = t * 0.9` rad/s). Never accumulate state per frame.
 *
 * Change the sampling rate at render time without touching code:
 *   npx remotion render Main --props='{"fps":60}'
 * (Do NOT use the CLI `--fps` flag: it keeps the frame count, so the video
 *  would end early / late.)
 */
export const DEFAULT_FPS = 30;

export const getFps = (): number => {
  const { fps } = getInputProps() as { fps?: unknown };
  return typeof fps === "number" && fps > 0 ? fps : DEFAULT_FPS;
};

/** Composition length in whole frames for a duration in seconds. */
export const secondsToFrames = (seconds: number, fps: number): number =>
  Math.ceil(seconds * fps);
