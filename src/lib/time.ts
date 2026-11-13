import {
  EasingFunction,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

/** Local time in seconds (relative to the enclosing <Sequence>). */
export const useTime = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

/**
 * Clamped interpolation over a time axis in seconds.
 * `tween(t, [0.2, 1.4], [-6, 0], Easing.bezier(0.16, 1, 0.3, 1))`
 */
export const tween = (
  t: number,
  input: readonly number[],
  output: readonly number[],
  easing?: EasingFunction | EasingFunction[],
): number =>
  interpolate(t, input, output, {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing,
  });
