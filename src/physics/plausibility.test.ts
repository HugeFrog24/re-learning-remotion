import { describe, expect, it } from "vitest";
import type { Body } from "../world/body";
import { at, body, hoverUntil } from "../world/fixtures";
import { IDENTITY_POSE } from "../world/geometry";
import { roughMotion, teleports } from "./plausibility";

const along = (poseX: (t: number) => number, extra: Partial<Body> = {}): Body => ({
  ...body("m", "kinematic", (t) => at([poseX(t), 0, 0])),
  ...extra,
});

const smoothstep = (t: number) => {
  const u = Math.min(1, Math.max(0, t / 0.25));
  return 0.044 * u * u * (3 - 2 * u);
};

const stopping = (t: number) => 0.1 * Math.min(t, 0.5);

describe("teleports", () => {
  it("flags a 5 cm jump in one sample", () => {
    const jumper = along((t) => (t < 0.5 ? 0 : 0.05));
    const found = teleports(jumper, { hz: 960, from: 0.49, to: 0.51 });
    expect(found).toHaveLength(1);
    expect(found[0].distance).toBeCloseTo(0.05, 9);
  });

  it("accepts motion within max speed", () => {
    const steady = along((t) => 0.5 * t);
    expect(teleports(steady, { hz: 960, from: 0, to: 1 })).toEqual([]);
  });
});

describe("roughMotion", () => {
  it("accepts a smoothstep move within max acceleration", () => {
    expect(roughMotion(along(smoothstep), { hz: 960, from: 0, to: 0.5 })).toEqual([]);
  });

  it("flags a constant velocity followed by a stop", () => {
    const found = roughMotion(along(stopping), { hz: 960, from: 0, to: 1 });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].t).toBeCloseTo(0.5, 2);
  });

  it("excuses a stop declared as an impact", () => {
    const excused = along(stopping, { impacts: [0.5] });
    expect(roughMotion(excused, { hz: 960, from: 0, to: 1 })).toEqual([]);
  });

  it("checks a simulated body only until release", () => {
    const released = hoverUntil(along(stopping), 0.3, () => IDENTITY_POSE);
    expect(roughMotion(released, { hz: 960, from: 0, to: 1 })).toEqual([]);
  });

  it("flags a jerk while a simulated tool still hovers", () => {
    const hovering = hoverUntil(along(stopping), 0.8);
    const found = roughMotion(hovering, { hz: 960, from: 0, to: 1 });
    expect(found.length).toBeGreaterThan(0);
    expect(found[0].t).toBeCloseTo(0.5, 2);
    expect(found.filter((each) => each.t > 0.8)).toEqual([]);
  });

  it("ignores static bodies", () => {
    const fixed = along(stopping, { motion: "static" });
    expect(roughMotion(fixed, { hz: 960, from: 0, to: 1 })).toEqual([]);
  });
});
