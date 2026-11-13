import {
  EasingFunction,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

export const useTime = (): number => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return frame / fps;
};

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
