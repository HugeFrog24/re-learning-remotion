import RAPIER from "@dimforge/rapier3d-deterministic-compat";
import { beforeAll, describe, expect, it } from "vitest";
import { collide } from "../physics/collision";
import {
  KINEMATIC_EPSILON,
  RESTING_TOLERANCE,
  sampleTimes,
} from "../physics/sweep";
import { toObb, type Pose } from "../world/geometry";
import { releasedPose, sampleTrack, type BakeTrack } from "../world/track";
import {
  DROP_GAP,
  DROP_Y0,
  drone,
  dropScene,
  floor,
  TILE,
  tileRelease,
} from "./fixtures";
import { RAPIER_VERSION, SIM_HZ } from "./inputs";
import { simulate } from "./simulate";

const G = 9.81;
const scene = dropScene(0);
let track: BakeTrack;

beforeAll(async () => {
  track = await simulate(scene, ["tile", "drone"]);
});

const stepTimes = (source: BakeTrack, id: string) =>
  sampleTimes(
    source.hz,
    source.from,
    source.from + (source.poses[id].length / 7 - 1) / source.hz,
  );

const deviation = (a: readonly number[], b: readonly number[]) =>
  Math.max(...a.map((value, i) => Math.abs(value - b[i])));

describe("simulate", () => {
  it("pins the Rapier version the bake inputs name", async () => {
    await RAPIER.init();
    expect(RAPIER.version()).toBe(RAPIER_VERSION);
  });

  it("records every step from release to the end of the scene", () => {
    const end = stepTimes(track, "tile").pop() ?? 0;
    expect(track).toMatchObject({ id: "drop", hz: SIM_HZ, from: 0 });
    expect(end).toBeGreaterThanOrEqual(scene.duration - 1e-9);
    expect(end - scene.duration).toBeLessThan(1 / SIM_HZ);
  });

  it("falls freely until contact", () => {
    const airborne = stepTimes(track, "tile").filter(
      (t) => DROP_GAP - (G * t * t) / 2 > 0.002,
    );
    expect(airborne.length).toBeGreaterThan(80);
    const error = Math.max(
      ...airborne.map((t) =>
        Math.abs(
          sampleTrack(track, "tile", t).position[1] -
            (DROP_Y0 - (G * t * t) / 2),
        ),
      ),
    );
    expect(error).toBeLessThanOrEqual(2e-4);
  });

  it("never sinks into the floor beyond the resting tolerance", () => {
    const poseAt = releasedPose("tile", tileRelease(0), track);
    const ground = toObb(floor.localBoxes[0], floor.poseAt(0));
    const depth = Math.max(
      ...stepTimes(track, "tile").map(
        (t) =>
          collide(toObb(scene.bodies[1].localBoxes[0], poseAt(t)), ground)
            ?.depth ?? 0,
      ),
    );
    expect(depth).toBeLessThanOrEqual(RESTING_TOLERANCE);
    const rest = poseAt(scene.duration).position[1];
    expect(Math.abs(rest - TILE[1] / 2)).toBeLessThanOrEqual(RESTING_TOLERANCE);
  });

  it("drives a hovering kinematic body exactly along its path", () => {
    const pairs = stepTimes(track, "drone").map((t) => [
      sampleTrack(track, "drone", t),
      drone.poseAt(t),
    ]);
    const drift = (part: keyof Pose) =>
      Math.max(
        ...pairs.map(([baked, path]) => deviation(baked[part], path[part])),
      );
    expect(drift("position")).toBeLessThanOrEqual(KINEMATIC_EPSILON);
    expect(drift("quaternion")).toBeLessThanOrEqual(1e-6);
  });

  it("carries the hover velocity through release", async () => {
    const at = 0.05;
    const speed = 0.1;
    const sliding = await simulate(dropScene(at, 0.1, speed));
    expect(sliding.from).toBe(at);
    const t = at + 0.05;
    const pose = sampleTrack(sliding, "tile", t);
    expect(Math.abs(pose.position[0] - speed * t)).toBeLessThanOrEqual(1e-5);
    expect(
      Math.abs(pose.position[1] - (DROP_Y0 - (G * 0.05 * 0.05) / 2)),
    ).toBeLessThanOrEqual(2e-4);
  });

  it("gives identical tracks on every run and records only simulated bodies", async () => {
    const first = await simulate(scene);
    expect(Object.keys(first.poses)).toEqual(["tile"]);
    expect(await simulate(scene)).toEqual(first);
  });

  it("survives its JSON round trip unchanged", () => {
    expect(JSON.parse(JSON.stringify(track))).toEqual(track);
  });
});
