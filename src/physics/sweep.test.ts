import { describe, expect, it } from "vitest";
import type { Body, Scene } from "../world/body";
import { solidsAt } from "../world/body";
import { box, IDENTITY_POSE, toObb, type Pose, type Vec3 } from "../world/geometry";
import {
  CHECK_HZ,
  KINEMATIC_EPSILON,
  RESTING_TOLERANCE,
  sampleTimes,
  sweep,
} from "./sweep";

const at = (position: Vec3): Pose => ({ ...IDENTITY_POSE, position });

const body = (
  id: string,
  motion: Body["motion"],
  poseAt: (t: number) => Pose,
  size: Vec3 = [0.02, 0.02, 0.02],
  center: Vec3 = [0, 0, 0],
): Body => ({
  id,
  motion,
  hovering: false,
  maxSpeed: 1,
  maxAccel: 5,
  impacts: [],
  localBoxes: [box("b", center, size)],
  poseAt,
});

const scene = (duration: number, bodies: Body[]): Scene => ({
  id: "s",
  duration,
  bodies,
  shots: [],
});

describe("sweep", () => {
  it("finds the first overlap of a box moving through another", () => {
    const fixed = body("a", "static", () => at([0, 0, 0]));
    const mover = body("m", "kinematic", (t) => at([-0.1 + 0.1 * t, 0, 0]));
    const found = sweep(scene(2, [fixed, mover]), { hz: CHECK_HZ });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].t - 0.8).toBeGreaterThanOrEqual(0);
    expect(found[0].t - 0.8).toBeLessThanOrEqual(1 / CHECK_HZ + 1e-9);
    expect(found[0].a).toBe("a/b");
    expect(found[0].b).toBe("m/b");
  });

  it("accepts boxes touching face to face", () => {
    const fixed = body("a", "static", () => at([0, 0, 0]));
    const other = body("m", "kinematic", () => at([0.02, 0, 0]));
    expect(sweep(scene(1, [fixed, other]), { hz: 10 })).toEqual([]);
  });

  it("tolerates resting overlap of a simulated body up to the tolerance", () => {
    const fixed = body("a", "static", () => at([0, 0, 0]));
    const shallow = body("s", "simulated", () => at([0.02 - 0.0004, 0, 0]));
    const deep = body("s", "simulated", () => at([0.02 - 0.0006, 0, 0]));
    expect(sweep(scene(0, [fixed, shallow]), { hz: 10 })).toEqual([]);
    expect(sweep(scene(0, [fixed, deep]), { hz: 10 })).toHaveLength(1);
  });

  it("holds kinematic bodies to the kinematic epsilon", () => {
    expect(KINEMATIC_EPSILON).toBe(1e-7);
    expect(RESTING_TOLERANCE).toBe(0.0005);
    const fixed = body("a", "static", () => at([0, 0, 0]));
    const kin = body("k", "kinematic", () => at([0.02 - 0.0004, 0, 0]));
    expect(sweep(scene(0, [fixed, kin]), { hz: 10 })).toHaveLength(1);
  });

  it("skips static pairs and boxes of the same body", () => {
    const one = body("a", "static", () => at([0, 0, 0]));
    const two = body("c", "static", () => at([0, 0, 0]));
    const compound: Body = {
      ...body("k", "kinematic", () => at([1, 0, 0])),
      localBoxes: [
        box("x", [0, 0, 0], [0.02, 0.02, 0.02]),
        box("y", [0, 0, 0], [0.02, 0.02, 0.02]),
      ],
    };
    expect(sweep(scene(1, [one, two, compound]), { hz: 10 })).toEqual([]);
  });

  it("samples the exact end time", () => {
    const times = sampleTimes(10, 0, 1 / 3);
    expect(times[times.length - 1]).toBe(1 / 3);
    expect(times).toHaveLength(5);
    const seen: number[] = [];
    const probe = body("p", "kinematic", (t) => {
      seen.push(t);
      return at([0, 0, 0]);
    });
    sweep(scene(1, [probe, body("q", "static", () => at([1, 0, 0]))]), {
      hz: 10,
      to: 1 / 3,
    });
    expect(seen).toContain(1 / 3);
  });

  it("locks the quaternion convention of toObb", () => {
    const quarter: Pose = {
      position: [0, 0, 0],
      quaternion: [0, Math.SQRT1_2, 0, Math.SQRT1_2],
    };
    const solid = toObb(box("b", [0.1, 0, 0], [0.02, 0.02, 0.02]), quarter);
    expect(solid.center.x).toBeCloseTo(0, 12);
    expect(solid.center.y).toBeCloseTo(0, 12);
    expect(solid.center.z).toBeCloseTo(-0.1, 12);

    const target = body("t", "static", () => at([0, 0, -0.1]));
    const arm = (pose: Pose) =>
      body("r", "kinematic", () => pose, [0.02, 0.02, 0.02], [0.1, 0, 0]);
    expect(sweep(scene(0, [target, arm(quarter)]), { hz: 10 })).toHaveLength(1);
    expect(sweep(scene(0, [target, arm(IDENTITY_POSE)]), { hz: 10 })).toEqual(
      [],
    );
    expect(solidsAt(arm(quarter), 0)[0].center.z).toBeCloseTo(-0.1, 12);
  });

  it("sweeps a large scene quickly", () => {
    const tiles: Body[] = Array.from({ length: 50 }, (_, i) => ({
      ...body(`tile${i}`, "kinematic", (t) =>
        at([i * 0.044, 0.01 * Math.sin(t), 0]),
      ),
      localBoxes: Array.from({ length: 9 }, (_, k) =>
        box(
          `p${k}`,
          [(k % 3) * 0.012 - 0.012, 0, Math.floor(k / 3) * 0.012 - 0.012],
          [0.01, 0.012, 0.01],
        ),
      ),
    }));
    const floor = body("floor", "static", () => at([1, -0.05, 0]), [4, 0.02, 1]);
    const started = performance.now();
    const found = sweep(scene(7.7, [...tiles, floor]), { hz: CHECK_HZ });
    const seconds = (performance.now() - started) / 1000;
    expect(found).toEqual([]);
    expect(seconds).toBeLessThan(60);
  });
});
