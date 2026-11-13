import { createHash } from "node:crypto";
import { sampleTimes } from "../physics/sweep";
import type { Body, Scene } from "../world/body";
import type { Pose, Vec3 } from "../world/geometry";
import { encodePose } from "../world/track";

export const SIM_HZ = 960;
export const RAPIER_VERSION = "0.21.0";
export const GRAVITY: Vec3 = [0, -9.81, 0];

export const releaseOf = (body: Body) => {
  if (!body.release)
    throw new Error(`simulated body ${body.id} has no release`);
  return body.release;
};

export const pathOf = (body: Body): ((t: number) => Pose) =>
  body.motion === "simulated" ? releaseOf(body).hoverAt : body.poseAt;

const sampled = (path: (t: number) => Pose, to: number) =>
  sampleTimes(SIM_HZ, 0, to).flatMap((t) => encodePose(path(t)));

const motionInputs = (body: Body, duration: number) => {
  if (body.motion === "static") return { poses: encodePose(body.poseAt(0)) };
  if (body.motion === "kinematic")
    return { poses: sampled(body.poseAt, duration) };
  const { at, material, hoverAt } = releaseOf(body);
  return { release: { at, material }, poses: sampled(hoverAt, at) };
};

export const bakeInputs = (scene: Scene) => ({
  hz: SIM_HZ,
  rapier: RAPIER_VERSION,
  gravity: GRAVITY,
  duration: scene.duration,
  bodies: scene.bodies.map((body) => ({
    id: body.id,
    motion: body.motion,
    localBoxes: body.localBoxes,
    ...motionInputs(body, scene.duration),
  })),
});

export const inputHash = (scene: Scene): string =>
  createHash("sha256")
    .update(JSON.stringify(bakeInputs(scene)))
    .digest("hex");
