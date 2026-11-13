import { readFileSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { SIM_HZ, validateScene } from "../../bake/inputs";
import { cameraClearance, roughCamera } from "../../physics/cameraChecks";
import { collide } from "../../physics/collision";
import {
  roughMotion,
  teleports,
  type PlausibilityOptions,
} from "../../physics/plausibility";
import {
  CHECK_HZ,
  contactLimit,
  RESTING_TOLERANCE,
  sampleTimes,
  sweep,
  type SweepOptions,
  type Violation,
} from "../../physics/sweep";
import { solidsAt, type Body, type Scene } from "../../world/body";
import { cameraAt, validateShots } from "../../world/camera";
import { STEADY, storyTimeOfFrame } from "../../world/clock";
import { restBottom, seatedBottom, seatsOf } from "../../world/fit";
import { SCAN_MATCH } from "../../world/listing";
import { addressOf, tilePose } from "../../world/tape";
import { TRACK_RESOLUTION, type BakeTrack } from "../../world/track";
import {
  DIP_MARGIN,
  KEY_TIMES,
  MATCH_INDEX,
  RELEASE_AT,
  RELEASE_LIFT,
  START_INDEX,
  STENCIL_SEAT_SECONDS,
} from "./choreography";
import { SCAN, STENCIL_ID, TAPE } from "./initialState";
import { stencilSeatScene } from "./scene";

const track: BakeTrack = JSON.parse(
  readFileSync(
    new URL("../../bakes/stencil-seat.json", import.meta.url),
    "utf8",
  ),
);
const scene = stencilSeatScene(track);
const stencil = scene.bodies.find((candidate) => candidate.id === STENCIL_ID);
if (!stencil?.release) throw new Error("the scene has no released stencil");
const { hoverAt } = stencil.release;
const dt = 1 / CHECK_HZ;
const grid = sampleTimes(CHECK_HZ, 0, scene.duration);
const G = 9.81;

const snapshot = (t: number) => ({
  poses: scene.bodies.map((each) => each.poseAt(t)),
  camera: cameraAt(scene.shots, t),
});

const flagged = (
  bodies: readonly Body[],
  check: (body: Body, opts: PlausibilityOptions) => readonly object[],
  opts: PlausibilityOptions = { hz: CHECK_HZ, to: scene.duration },
) =>
  bodies.flatMap((each) =>
    check(each, opts).map((found) => `${each.id} ${JSON.stringify(found)}`),
  );

const bruteForce = (world: Scene, opts: Required<SweepOptions>) => {
  const found: Violation[] = [];
  for (const t of sampleTimes(opts.hz, opts.from, opts.to)) {
    const solids = world.bodies.map((each) => solidsAt(each, t));
    world.bodies.forEach((a, i) =>
      world.bodies.slice(i + 1).forEach((b, offset) => {
        if (a.motion === "static" && b.motion === "static" && t !== opts.from)
          return;
        const limit = contactLimit(a, b, t);
        for (const boxA of solids[i]) {
          for (const boxB of solids[i + 1 + offset]) {
            const contact = collide(boxA, boxB);
            if (contact && contact.depth > limit) {
              found.push({
                t,
                a: `${a.id}/${boxA.name}`,
                b: `${b.id}/${boxB.name}`,
                depth: contact.depth,
              });
            }
          }
        }
      }),
    );
  }
  return found;
};

describe("stencil-seat scene", () => {
  test("[PHYS-01] nothing passes through anything", () => {
    expect(sweep(scene, { hz: CHECK_HZ })).toEqual([]);
  });

  test("the broadphase finds exactly what an all-pairs check finds", () => {
    const dip = KEY_TIMES[2];
    const window = { hz: CHECK_HZ, from: dip - 0.1, to: dip + 0.15 };
    expect(sweep(scene, window)).toEqual(bruteForce(scene, window));
    const pressed = dip + 0.05;
    const lowered: Body = {
      ...stencil,
      poseAt: (t) => {
        const pose = stencil.poseAt(t);
        if (Math.abs(t - pressed) > dt / 2) return pose;
        const [x, y, z] = pose.position;
        return { ...pose, position: [x, y - 0.001, z] };
      },
    };
    const variant: Scene = {
      ...scene,
      bodies: scene.bodies.map((each) => (each === stencil ? lowered : each)),
    };
    const around = {
      hz: CHECK_HZ,
      from: pressed - 2 * dt,
      to: pressed + 2 * dt,
    };
    const found = sweep(variant, around);
    expect(found.length).toBeGreaterThan(0);
    expect(
      found.filter((violation) => Math.abs(violation.t - pressed) > dt / 2),
    ).toEqual([]);
    expect(found).toEqual(bruteForce(variant, around));
  });

  test("[PHYS-02] nothing teleports", () => {
    expect(flagged(scene.bodies, teleports)).toEqual([]);
  });

  test("[PHYS-03] gravity acts only after release", () => {
    const hovering = grid.filter((t) => t < RELEASE_AT);
    expect(hovering.map((t) => stencil.poseAt(t))).toEqual(
      hovering.map(hoverAt),
    );
    const lag = 5;
    const span = (lag * dt) ** 2;
    const rounding = (2 * TRACK_RESOLUTION) / span;
    expect(rounding).toBeLessThan(0.05);
    const heights = grid.map((t) => stencil.poseAt(t).position[1]);
    const released = grid.findIndex((t) => t >= RELEASE_AT);
    const touchdown = RELEASE_AT + Math.sqrt((2 * RELEASE_LIFT) / G);
    const airborne = grid.findIndex((t) => t >= touchdown) - released;
    const accelerations = Array.from(
      { length: airborne - 2 * lag },
      (_, k) =>
        (heights[released + k] -
          2 * heights[released + k + lag] +
          heights[released + k + 2 * lag]) /
        span,
    );
    expect(accelerations.length).toBeGreaterThanOrEqual(10);
    expect(accelerations.filter((accel) => Math.abs(accel + G) > 0.05)).toEqual(
      [],
    );
    const mean =
      accelerations.reduce((sum, accel) => sum + accel, 0) /
      accelerations.length;
    expect(Math.abs(mean + G)).toBeLessThanOrEqual(0.05);
  });

  test("[PHYS-04] kinematic motion is smooth", () => {
    const driven = scene.bodies.filter(
      (each) => each.motion === "kinematic" || each.hovering,
    );
    expect(driven).toContain(stencil);
    expect(flagged(driven, roughMotion)).toEqual([]);
  });

  test("[CAM-01] cameras never enter a body", () => {
    expect(cameraClearance(scene, { hz: CHECK_HZ })).toEqual([]);
  });

  test("[CAM-02] camera position, target, view direction, fov and roll move smoothly within each shot, and cuts land on whole frames", () => {
    expect(validateShots(scene.shots, scene.duration)).toEqual([]);
    expect(scene.shots.map((shot) => shot.name)).toEqual(["wide", "follow"]);
    expect(
      scene.shots.flatMap((shot) => roughCamera(shot, CHECK_HZ)),
    ).toEqual([]);
  });

  test("[TIME-01] the world is identical at every fps", () => {
    const rates = [24, 30, 50, 60];
    for (let half = 0; half <= Math.floor(scene.duration * 2); half++) {
      const worlds = rates.map((fps) => {
        const frame = (half * fps) / 2;
        expect(Number.isInteger(frame)).toBe(true);
        return snapshot(storyTimeOfFrame(frame, fps, STEADY));
      });
      for (const world of worlds) expect(world).toEqual(worlds[0]);
    }
  });

  test("the scene is valid: unique body ids, releases on the step grid inside the scene, valid shots", () => {
    expect(validateScene(scene)).toEqual([]);
  });

  test("the release fires on the simulation step grid", () => {
    expect(RELEASE_AT).toBe(5.7);
    expect(STENCIL_SEAT_SECONDS).toBe(7.7);
    expect(STENCIL_SEAT_SECONDS * 30).toBe(231);
    const steps = RELEASE_AT * SIM_HZ;
    expect(Math.abs(steps - Math.round(steps))).toBeLessThanOrEqual(1e-9);
    expect(track).toMatchObject({ id: scene.id, hz: SIM_HZ, from: RELEASE_AT });
  });

  test("the stencil is blocked at every mismatch and comes to rest seated at the subss", () => {
    expect(seatsOf(TAPE, SCAN)).toEqual([MATCH_INDEX]);
    expect(addressOf(TAPE, MATCH_INDEX)).toBe(SCAN_MATCH);
    const seated = seatedBottom(TAPE);
    const hovering = grid.filter((t) => t < RELEASE_AT);
    for (let k = START_INDEX; k < MATCH_INDEX; k++) {
      const over = tilePose(TAPE, k).position[0];
      const lowest = Math.min(
        ...hovering
          .map((t) => stencil.poseAt(t).position)
          .filter(([x]) => x === over)
          .map(([, y]) => y),
      );
      expect(lowest).toBe(restBottom(TAPE, SCAN, k) + DIP_MARGIN);
      expect(lowest).toBeGreaterThan(seated);
    }
    const end = stencil.poseAt(scene.duration);
    expect(Math.abs(end.position[1] - seated)).toBeLessThanOrEqual(
      RESTING_TOLERANCE,
    );
    const firstCell = solidsAt(stencil, scene.duration).find(
      (solid) => solid.name === "plate-c0",
    );
    expect(
      Math.abs(
        (firstCell?.center.x ?? Infinity) -
          tilePose(TAPE, MATCH_INDEX).position[0],
      ),
    ).toBeLessThanOrEqual(0.0005);
  });

  test("poses are finite and continuous at every segment boundary", () => {
    const boundaries = [
      ...KEY_TIMES,
      ...scene.shots.flatMap((shot) => [shot.from, shot.to]),
    ];
    const broken = boundaries.flatMap((boundary) =>
      scene.bodies.flatMap((each) => {
        const before = each.poseAt(boundary - 1e-9);
        const after = each.poseAt(boundary + 1e-9);
        const finite = [before, after].every((pose) =>
          [...pose.position, ...pose.quaternion].every(Number.isFinite),
        );
        const jump = Math.hypot(
          ...after.position.map((value, i) => value - before.position[i]),
        );
        return finite && jump < 1e-6 ? [] : [`${each.id} at ${boundary}`];
      }),
    );
    expect(boundaries).toContain(RELEASE_AT);
    expect(broken).toEqual([]);
  });

  test("sampling backwards equals sampling forwards", () => {
    const forwards = grid.map(snapshot);
    const backwards = [...grid].reverse().map(snapshot).reverse();
    expect(backwards).toEqual(forwards);
  });
});
