import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { mipWeights, POSTPROCESSING_VERSION } from "./mipmapRadius";
import {
  BLOOM_LEVELS_1080,
  BLOOM_RADIUS,
  bloomLevels,
  textureTier,
} from "./resolution";

test("the installed postprocessing is the version the mip weight model was checked against", () => {
  const { version } = JSON.parse(
    readFileSync("node_modules/postprocessing/package.json", "utf8"),
  ) as { version: string };
  expect(version).toBe(POSTPROCESSING_VERSION);
});

test("mip weights sum to one and the bottom level has no (1 - radius) share", () => {
  const w = mipWeights(6, BLOOM_RADIUS, 0);
  expect(w.reduce((a, b) => a + b, 0)).toBeCloseTo(1, 12);
  expect(w[0]).toBeCloseTo(1 - BLOOM_RADIUS, 12);
  expect(w[5]).toBeCloseTo(BLOOM_RADIUS ** 5, 12);
});

test("every 1080-equivalent mip level keeps its weight at every tier and the extra fine levels carry none", () => {
  const base = mipWeights(BLOOM_LEVELS_1080, BLOOM_RADIUS, 0);
  for (const ratio of [1, 2, 4]) {
    const fine = Math.log2(textureTier(ratio));
    const w = mipWeights(bloomLevels(ratio), BLOOM_RADIUS, fine);
    expect(w.slice(0, fine)).toEqual(new Array(fine).fill(0));
    w.slice(fine).forEach((weight, j) => {
      expect(weight).toBeCloseTo(base[j], 12);
    });
  }
});

test("without the pin the extra fine levels would carry glow", () => {
  const w = mipWeights(bloomLevels(4), BLOOM_RADIUS, 0);
  expect(w[0] + w[1]).toBeGreaterThan(0.25);
});
