import { getInputProps } from "remotion";

export const DEFAULT_FPS = 30;

export const getFps = (): number => {
  const { fps } = getInputProps() as { fps?: unknown };
  return typeof fps === "number" && fps > 0 ? fps : DEFAULT_FPS;
};

export const secondsToFrames = (seconds: number, fps: number): number =>
  Math.ceil(seconds * fps);
