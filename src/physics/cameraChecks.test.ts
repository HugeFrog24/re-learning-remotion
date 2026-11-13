import { describe, expect, it } from "vitest";
import { staticBody, type Body, type Scene } from "../world/body";
import type { CameraSetup, Shot } from "../world/camera";
import { box, IDENTITY_POSE, type Vec3 } from "../world/geometry";
import {
  CAMERA_CLEARANCE,
  CAMERA_MAX_FOV_RATE,
  CAMERA_MAX_ROLL_RATE,
  CAMERA_MAX_TURN_RATE,
  cameraClearance,
  NEAR_PLANE,
  roughCamera,
} from "./cameraChecks";

const cube = (id: string, center: Vec3) =>
  staticBody(id, [box(`${id}box`, center, [0.2, 0.2, 0.2])], IDENTITY_POSE);

const wall = cube("wall", [0, 0, 0]);

const flight = (
  duration: number,
  from: number,
  to: number,
  bodies: readonly Body[] = [wall],
  fov = 40,
): Scene => ({
  id: "s",
  duration,
  bodies,
  shots: [
    {
      name: "fly",
      from: 0,
      to: duration,
      at: (t) => ({
        position: [from + ((to - from) * t) / duration, 0, 0],
        target: [0, 0, 0],
        fov,
        roll: 0,
      }),
    } satisfies Shot,
  ],
});

describe("cameraClearance", () => {
  it("reports the camera meeting a box at the entry time", () => {
    const hz = 100;
    const hits = cameraClearance(flight(2, -1, 1), { hz });
    const entry = 0.87;
    const first = hits[0];
    expect(first?.against).toBe("wallbox");
    expect(Math.abs((first?.t ?? 0) - entry)).toBeLessThanOrEqual(1 / hz + 1e-9);
    expect(first?.depth).toBeGreaterThan(0);
  });

  it("reports nothing for a camera that stays away", () => {
    expect(cameraClearance(flight(2, -3, -1), { hz: 100 })).toEqual([]);
  });

  it("samples the exact end of the scene", () => {
    const duration = 1 / 3;
    const hits = cameraClearance(flight(duration, -1, -0.1 - CAMERA_CLEARANCE / 2), { hz: 100 });
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[hits.length - 1]?.t).toBe(duration);
  });

  it("reports a near plane that reaches outside the clearance sphere", () => {
    const hz = 10;
    const hits = cameraClearance(flight(1, -3, -3, [wall], 179), { hz });
    expect(hits.map((hit) => hit.against)).toEqual(
      Array.from({ length: hz + 1 }, () => NEAR_PLANE),
    );
    expect(Math.min(...hits.map((hit) => hit.depth))).toBeGreaterThan(1);
  });

  it("finds a box that sits far from its body's origin", () => {
    const hits = cameraClearance(flight(2, 1, 0, [cube("arm", [0.5, 0, 0])]), {
      hz: 100,
    });
    const entry = 0.74;
    expect(hits[0]?.against).toBe("armbox");
    expect(Math.abs((hits[0]?.t ?? 0) - entry)).toBeLessThanOrEqual(1 / 100 + 1e-9);
  });
});

describe("roughCamera", () => {
  const HZ = 960;
  const level: CameraSetup = {
    position: [0, 0, 0],
    target: [0, 0, -0.05],
    fov: 30,
    roll: 0,
  };
  const shot = (at: (t: number) => Partial<CameraSetup>): Shot => ({
    name: "probe",
    from: 0,
    to: 1,
    at: (t) => ({ ...level, ...at(t) }),
  });
  const orbit = (rate: number) =>
    shot((t) => ({
      target: [0.05 * Math.sin(rate * t), 0, -0.05 * Math.cos(rate * t)],
    }));
  const snap = (t: number, before: number, after: number) =>
    t < 0.5 ? before : after;
  const ease = (t: number) => t * t * (3 - 2 * t);
  const parts = (found: readonly { part: string }[]) =>
    [...new Set(found.map((each) => each.part))].sort();

  it("accepts a slow pan, a gentle zoom and a slow roll", () => {
    expect(roughCamera(orbit(0.8 * CAMERA_MAX_TURN_RATE), HZ)).toEqual([]);
    const zoom = shot((t) => ({ fov: 30 - 0.6 * CAMERA_MAX_FOV_RATE * ease(t) }));
    expect(roughCamera(zoom, HZ)).toEqual([]);
    const tilt = shot((t) => ({ roll: 0.6 * CAMERA_MAX_ROLL_RATE * ease(t) }));
    expect(roughCamera(tilt, HZ)).toEqual([]);
  });

  it("flags a whip pan that keeps the target slow", () => {
    expect(parts(roughCamera(orbit(Math.PI), HZ))).toEqual(["view"]);
  });

  it("flags a fov snap", () => {
    const snapped = shot((t) => ({ fov: snap(t, 30, 20) }));
    expect(roughCamera(snapped, HZ)).toEqual([
      { shot: "probe", part: "fov", t: 0.5, rate: 10 * HZ },
    ]);
  });

  it("flags a roll snap", () => {
    const snapped = shot((t) => ({ roll: snap(t, 0, 0.3) }));
    expect(parts(roughCamera(snapped, HZ))).toEqual(["roll"]);
  });

  it("flags a position jump and a target jump", () => {
    const jumped = shot((t) => ({
      position: [snap(t, 0, 0.01), 0, 0],
      target: [snap(t, 0, 0.01), 0, -0.05],
    }));
    expect(parts(roughCamera(jumped, HZ))).toEqual(["position", "target"]);
  });
});
