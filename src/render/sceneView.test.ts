import { expect, test } from "vitest";
import track from "../bakes/stencil-seat.json";
import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import { secondsToFrames } from "../config";
import { cameraAt } from "../world/camera";
import { STEADY } from "../world/clock";
import { cameraPropsAt } from "./lens";

test("[CAM-03] the camera the render uses is the camera the checks measure", () => {
  const scene = stencilSeatScene(track);
  for (const fps of [30, 60]) {
    const frames = secondsToFrames(scene.duration, fps);
    for (let f = 0; f < frames; f++) {
      expect(cameraPropsAt(scene, STEADY, f, fps)).toStrictEqual(
        cameraAt(scene.shots, f / fps),
      );
    }
  }
});
