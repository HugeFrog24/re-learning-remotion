import { describe, expect, it } from "vitest";
import type { Body, Scene } from "../world/body";
import type { Shot } from "../world/camera";
import { box, IDENTITY_POSE } from "../world/geometry";
import { CAMERA_CLEARANCE, cameraClearance } from "./cameraChecks";

const wall: Body = {
  id: "wall",
  motion: "static",
  hovering: false,
  maxSpeed: 0,
  maxAccel: 0,
  impacts: [],
  localBoxes: [box("wallbox", [0, 0, 0], [0.2, 0.2, 0.2])],
  poseAt: () => IDENTITY_POSE,
};

const flight = (duration: number, from: number, to: number): Scene => ({
  id: "s",
  duration,
  bodies: [wall],
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
});
