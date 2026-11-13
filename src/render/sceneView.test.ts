import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import track from "../bakes/stencil-seat.json";
import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import { secondsToFrames } from "../config";
import { wiringOf } from "../tooling/wiring";
import { cameraAt } from "../world/camera";
import { heldClock, STEADY, type StoryClock } from "../world/clock";
import { frameView } from "./frameView";

const scene = stencilSeatScene(track);
const wired = (file: string) => wiringOf(readFileSync(file, "utf8"), file);
const HOLD = { at: 2, seconds: 0.5 };

const CLOCKS: readonly {
  readonly clock: StoryClock;
  readonly storyOf: (film: number) => number;
}[] = [
  { clock: STEADY, storyOf: (film) => film },
  {
    clock: heldClock([HOLD]),
    storyOf: (film) => {
      if (film < HOLD.at) return film;
      if (film < HOLD.at + HOLD.seconds) return HOLD.at;
      return film - HOLD.seconds;
    },
  },
];

test("[CAM-03] every frame's camera and body time are the checks' camera at the frame's story time, steady or held", () => {
  for (const { clock, storyOf } of CLOCKS) {
    for (const fps of [30, 60]) {
      const frames = secondsToFrames(scene.duration + clock.held, fps);
      for (let f = 0; f < frames; f++) {
        const t = storyOf(f / fps);
        expect(frameView(scene, clock, f, fps)).toStrictEqual({
          t,
          camera: cameraAt(scene.shots, t),
        });
      }
    }
  }
});

test("[CAM-03] inside a hold the film runs on while the bodies and the camera stand at the held story time", () => {
  const clock = heldClock([HOLD]);
  const fps = 30;
  const held = Array.from(
    { length: HOLD.seconds * fps - 1 },
    (_, i) => HOLD.at * fps + 1 + i,
  );
  const views = held.map((f) => frameView(scene, clock, f, fps));
  const still = cameraAt(scene.shots, HOLD.at);
  expect(views).toStrictEqual(held.map(() => ({ t: HOLD.at, camera: still })));
  expect(held.filter((f, i) => views[i].t === f / fps)).toEqual([]);
  const filmTimeCameras = held.map((f) => cameraAt(scene.shots, f / fps));
  expect(
    filmTimeCameras.filter((camera) => camera.position[0] === still.position[0]),
  ).toEqual([]);
});

test("[CAM-03] SceneView takes its camera and body time only from frameView, and CameraRig places the lens with the checks' builder", () => {
  const view = wired("src/render/SceneView.tsx");
  for (const bypass of [
    "cameraAt",
    "cameraForFrame",
    "storyTimeOfFrame",
    "storyAt",
    "filmAt",
  ]) {
    expect(view.names.has(bypass), bypass).toBe(false);
  }
  expect(view.calls("frameView")).toEqual([["scene", "clock", "frame", "fps"]]);
  expect(view.values("view")).toEqual(["frameView(scene, clock, frame, fps)"]);
  expect(view.values("frame")).toEqual(["useCurrentFrame()"]);
  expect(view.values("fps")).toEqual(["useVideoConfig()"]);
  expect(view.props("CameraRig", "setup")).toEqual(["view.camera"]);
  expect(view.props("Bodies", "t")).toEqual(["view.t"]);
  expect(view.props("Lights", "camera")).toEqual(["view.camera"]);
  const stage = wired("src/lib/Stage.tsx");
  expect(stage.calls("placeCamera")).toEqual([["camera", "setup"]]);
  expect(stage.imports("../render/lens")).toEqual(["placeCamera"]);
});
