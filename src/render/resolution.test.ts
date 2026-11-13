import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import type { BakeTrack } from "../world/track";
import { closestGlyphPixels } from "./glyphFraming";
import {
  BASE_HEIGHT,
  BASE_WIDTH,
  BLOOM_LEVELS_1080,
  BLOOM_RADIUS,
  bloomIntensity,
  bloomExtentFraction,
  bloomLevels,
  CANVAS_DPR,
  glyphTextureSize,
  inRenderPixels,
  PIXEL_PARAMS_1080,
  textureTier,
} from "./resolution";

const track: BakeTrack = JSON.parse(
  readFileSync(new URL("../bakes/stencil-seat.json", import.meta.url), "utf8"),
);

const clampDpr = (target: number, [low, high]: readonly [number, number]) =>
  Math.min(Math.max(low, target), high);

test("[RES-01] the canvas renders at the render's pixel ratio from 1 to 4", () => {
  expect(CANVAS_DPR).toEqual([1, 4]);
  for (const r of [1, 1.5, 2, 3, 4]) {
    expect(clampDpr(r, CANVAS_DPR)).toBe(r);
  }
});

test("[RES-02] pixel-measured effects scale with the pixel ratio and keep their extent", () => {
  const entries = Object.entries(PIXEL_PARAMS_1080);
  expect(entries.length).toBeGreaterThan(0);
  for (const r of [1, 2, 4]) {
    for (const [, base] of entries) {
      expect(inRenderPixels(base, r)).toBe(base * r);
    }
  }
  const extents = [1, 2, 4].map((r) => bloomExtentFraction(bloomLevels(r), r));
  expect(extents[1]).toBe(extents[0]);
  expect(extents[2]).toBe(extents[0]);
  expect(bloomLevels(1)).toBe(BLOOM_LEVELS_1080);
  expect(bloomExtentFraction(BLOOM_LEVELS_1080, 1)).toBe(
    2 ** BLOOM_LEVELS_1080 / BASE_HEIGHT,
  );
});

test("[RES-03] glyph textures keep at least one texel per output pixel at the closest framing, within GPU limits", () => {
  const closest = closestGlyphPixels(stencilSeatScene(track), 60);
  expect(closest.pixels).toBeGreaterThan(0);
  expect(closest.pixels).toBeLessThanOrEqual(
    Math.hypot(BASE_WIDTH, BASE_HEIGHT),
  );
  for (const r of [1, 2, 4]) {
    expect(glyphTextureSize(r)).toBeGreaterThanOrEqual(closest.pixels * r);
  }
  expect(glyphTextureSize(4, 16384)).toBeLessThanOrEqual(16384);
  expect(glyphTextureSize(4, 256)).toBe(256);
});

test("texture tiers step at the documented ratios", () => {
  expect(textureTier(1)).toBe(1);
  expect(textureTier(1.5)).toBe(2);
  expect(textureTier(2)).toBe(2);
  expect(textureTier(3)).toBe(4);
  expect(textureTier(4)).toBe(4);
  expect(textureTier(8)).toBe(4);
  expect(textureTier(0.5)).toBe(1);
  expect(glyphTextureSize(1)).toBe(512);
  expect(glyphTextureSize(4)).toBe(2048);
});

test("bloom intensity keeps each 1080-equivalent mip level at the same weight at every tier", () => {
  const weight = (level: number, ratio: number) =>
    bloomIntensity(0.6, ratio) *
    (1 - BLOOM_RADIUS) *
    BLOOM_RADIUS ** (level + Math.log2(textureTier(ratio)));
  for (const r of [1, 2, 4]) {
    for (let level = 0; level < BLOOM_LEVELS_1080; level++) {
      expect(weight(level, r)).toBeCloseTo(weight(level, 1), 12);
    }
  }
  expect(bloomIntensity(0.6, 1)).toBe(0.6);
});
