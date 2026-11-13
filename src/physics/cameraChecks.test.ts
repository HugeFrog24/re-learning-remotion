import { describe, expect, it } from "vitest";
import { staticBody, type Body, type Scene } from "../world/body";
import type { Shot } from "../world/camera";
import { box, IDENTITY_POSE, type Vec3 } from "../world/geometry";
import { CAMERA_CLEARANCE, cameraClearance } from "./cameraChecks";

const cube = (id: string, center: Vec3) =>
  staticBody(id, [box(`${id}box`, center, [0.2, 0.2, 0.2])], IDENTITY_POSE);

const wall = cube("wall", [0, 0, 0]);

const flight = (
  duration: number,
  from: number,
  to: number,
  bodies: readonly Body[] = [wall],
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
        fov: 40,
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

  it("finds a box that sits far from its body's origin", () => {
    const hits = cameraClearance(flight(2, 1, 0, [cube("arm", [0.5, 0, 0])]), {
      hz: 100,
    });
    const entry = 0.74;
    expect(hits[0]?.against).toBe("armbox");
    expect(Math.abs((hits[0]?.t ?? 0) - entry)).toBeLessThanOrEqual(1 / 100 + 1e-9);
  });
});
