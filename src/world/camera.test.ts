import { expect, test } from "vitest";
import { cameraAt, validateShots, type Shot } from "./camera";

const shot = (name: string, from: number, to: number, x: number): Shot => ({
  name,
  from,
  to,
  at: (t) => ({ position: [x + t, 0, 0], target: [0, 0, 0], fov: 40, roll: 0 }),
});

const SHOTS = [shot("a", 0, 4, 0), shot("b", 4, 10, 100)];

test("cameraAt picks the shot, including exactly at a cut", () => {
  expect(cameraAt(SHOTS, 1).position[0]).toBe(1);
  expect(cameraAt(SHOTS, 4).position[0]).toBe(104);
  expect(cameraAt(SHOTS, 3.9).position[0]).toBeCloseTo(3.9, 12);
  expect(cameraAt(SHOTS, 10).position[0]).toBe(110);
  expect(cameraAt(SHOTS, 99).position[0]).toBe(110);
});

test("validateShots accepts a clean list", () => {
  expect(validateShots(SHOTS, 10)).toEqual([]);
});

test("validateShots rejects a shot that does not run forwards, even when its cuts line up", () => {
  const hiding = [shot("a", 0, 5, 0), shot("b", 5, 3, 0), shot("c", 3, 10, 0)];
  expect(validateShots(hiding, 10)).toEqual(["b runs from 5 to 3, not forwards"]);
  const empty = [shot("a", 0, 4, 0), shot("b", 4, 4, 0), shot("c", 4, 10, 0)];
  expect(validateShots(empty, 10)).toEqual(["b runs from 4 to 4, not forwards"]);
});

test("validateShots reports gaps, overlaps, bad ends and off-grid cuts", () => {
  expect(validateShots([shot("a", 0, 4, 0), shot("b", 5, 10, 0)], 10).join()).toMatch(/gap/);
  expect(validateShots([shot("a", 0, 5, 0), shot("b", 4, 10, 0)], 10).join()).toMatch(/overlap/);
  expect(validateShots([shot("a", 1, 10, 0)], 10).join()).toMatch(/first/);
  expect(validateShots([shot("a", 0, 9, 0)], 10).join()).toMatch(/last/);
  expect(validateShots([shot("a", 0, 1.01, 0), shot("b", 1.01, 10, 0)], 10).join()).toMatch(/1\.01/);
});
