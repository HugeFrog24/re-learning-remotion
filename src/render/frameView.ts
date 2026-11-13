import type { Scene } from "../world/body";
import { cameraAt, type CameraSetup } from "../world/camera";
import { storyTimeOfFrame, type StoryClock } from "../world/clock";

export type FrameView = {
  readonly t: number;
  readonly camera: CameraSetup;
};

export const frameView = (
  scene: Scene,
  clock: StoryClock,
  frame: number,
  fps: number,
): FrameView => {
  const t = storyTimeOfFrame(frame, fps, clock);
  return { t, camera: cameraAt(scene.shots, t) };
};
