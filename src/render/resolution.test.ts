import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import { wiringOf } from "../tooling/wiring";
import type { BakeTrack } from "../world/track";
import { closestGlyphPixels } from "./glyphFraming";
import {
  BASE_HEIGHT,
  BASE_WIDTH,
  BLOOM_LEVELS_1080,
  BLOOM_RADIUS,
  bloomConfig,
  bloomExtentFraction,
  canvasDpr,
  FINEST_PIXEL_RATIO,
  glyphTextureSize,
  mirrorTarget,
  PIXEL_PARAMS_1080,
  textureTier,
} from "./resolution";

const track: BakeTrack = JSON.parse(
  readFileSync(new URL("../bakes/stencil-seat.json", import.meta.url), "utf8"),
);

const wired = (file: string) => wiringOf(readFileSync(file, "utf8"), file);

const RATIOS = [1, 2, 4] as const;
const GPU_LIMITS = [16384, 4096, 2048] as const;

const r3fDpr = (dpr: readonly [number, number], device: number) =>
  Math.min(Math.max(dpr[0], device), dpr[1]);

const EXTENTS: {
  readonly [name in keyof typeof PIXEL_PARAMS_1080]: (
    ratio: number,
    maxTextureSize: number,
  ) => readonly [number, number];
} = {
  reflectorBlur: (ratio, maxTextureSize) => {
    const target = mirrorTarget(ratio, maxTextureSize);
    return [target.blurTexels / target.width, target.blurTexels / target.height];
  },
};

test("[RES-01] the canvas renders at the render's pixel ratio from 1 to 4, and Stage passes exactly that dpr", () => {
  for (const ratio of [1, 1.5, 2, 3, 4]) {
    expect(r3fDpr(canvasDpr(), ratio)).toBe(ratio);
  }
  expect(r3fDpr(canvasDpr(), 8)).toBe(FINEST_PIXEL_RATIO);
  const stage = wired("src/lib/Stage.tsx");
  expect(stage.props("ThreeCanvas", "dpr")).toEqual(["canvasDpr()"]);
  expect(stage.imports("../render/resolution")).toEqual(["canvasDpr"]);
});

test("[RES-02] every pixel-measured effect, as its consumer computes it, keeps its 1080p extent at ratios 1, 2 and 4 and under a GPU clamp", () => {
  const entries = Object.entries(PIXEL_PARAMS_1080) as [
    keyof typeof PIXEL_PARAMS_1080,
    number,
  ][];
  expect(entries.length).toBeGreaterThan(0);
  for (const [name, px1080] of entries) {
    const [wide, high] = EXTENTS[name](1, 16384);
    expect(wide * BASE_WIDTH, name).toBeCloseTo(px1080, 12);
    expect(high * BASE_HEIGHT, name).toBeCloseTo(px1080, 12);
    for (const ratio of RATIOS) {
      for (const limit of GPU_LIMITS) {
        const extent = EXTENTS[name](ratio, limit);
        expect(extent[0], `${name} ${ratio} ${limit}`).toBeCloseTo(wide, 12);
        expect(extent[1], `${name} ${ratio} ${limit}`).toBeCloseTo(high, 12);
      }
    }
  }
});

test("[RES-02] the mirror target follows the render's pixels and the GPU's limit, keeping the frame's aspect", () => {
  for (const ratio of RATIOS) {
    expect(mirrorTarget(ratio, 16384)).toMatchObject({
      width: BASE_WIDTH * ratio,
      height: BASE_HEIGHT * ratio,
    });
    for (const limit of GPU_LIMITS) {
      const { width, height } = mirrorTarget(ratio, limit);
      expect(Math.max(width, height)).toBeLessThanOrEqual(limit);
      expect(width / height).toBeCloseTo(BASE_WIDTH / BASE_HEIGHT, 12);
    }
  }
  const clamped = mirrorTarget(4, 4096);
  expect([clamped.width, clamped.height]).toEqual([2304, 4096]);
  expect(clamped.blurTexels).toBeCloseTo(
    (PIXEL_PARAMS_1080.reflectorBlur * 4096) / BASE_HEIGHT,
    12,
  );
});

test("[RES-02] the bloom keeps its extent: one extra pinned fine level per doubling of the ratio", () => {
  const base = bloomConfig(1);
  expect(base).toEqual({
    levels: BLOOM_LEVELS_1080,
    radius: BLOOM_RADIUS,
    fineSteps: 0,
  });
  for (const ratio of RATIOS) {
    const bloom = bloomConfig(ratio);
    expect(bloom.levels - bloom.fineSteps).toBe(BLOOM_LEVELS_1080);
    expect(2 ** bloom.fineSteps).toBe(textureTier(ratio));
    expect(bloom.radius).toBe(BLOOM_RADIUS);
    expect(bloomExtentFraction(bloom.levels, ratio)).toBe(
      bloomExtentFraction(base.levels, 1),
    );
  }
  expect(bloomExtentFraction(BLOOM_LEVELS_1080, 1)).toBe(
    2 ** BLOOM_LEVELS_1080 / BASE_HEIGHT,
  );
});

test("[RES-02] the mirror and the bloom take their sizes only from mirrorTarget and bloomConfig", () => {
  const floor = wired("src/render/FloorMesh.tsx");
  expect(floor.imports("./resolution")).toEqual(["mirrorTarget"]);
  expect(floor.calls("mirrorTarget")).toEqual([["ratio", "maxTextureSize"]]);
  expect(floor.calls("glossyMirror")).toEqual([
    ["[sx, sz]", "mirrorTarget(ratio, maxTextureSize)"],
  ]);
  expect(floor.values("ratio")).toEqual(["useRenderPixels()"]);
  expect(floor.values("textureWidth")).toEqual(["target.width"]);
  expect(floor.values("textureHeight")).toEqual(["target.height"]);
  expect(floor.calls("material.uniforms.texel.value.set")).toEqual([
    ["1 / target.width", "1 / target.height"],
  ]);
  expect(floor.values("material.uniforms.blur.value")).toEqual([
    "target.blurTexels",
  ]);
  const glow = wired("src/render/Glow.tsx");
  expect(glow.imports("./resolution")).toEqual(["bloomConfig"]);
  expect(glow.calls("bloomConfig")).toEqual([["ratio"]]);
  expect(glow.values("ratio")).toEqual(["useRenderPixels()"]);
  for (const name of ["levels", "radius", "fineSteps"]) {
    expect(glow.values(name), name).toEqual(["bloomConfig(ratio)"]);
  }
  expect(glow.props("Bloom", "levels")).toEqual(["levels"]);
  expect(glow.props("Bloom", "radius")).toEqual(["radius"]);
  expect(glow.calls("pinFineMipSteps")).toEqual([
    ["effect.mipmapBlurPass", "fineSteps", "radius"],
  ]);
});

test("[RES-03] glyph textures keep at least one texel per output pixel at the closest framing, within GPU limits", () => {
  const closest = closestGlyphPixels(stencilSeatScene(track), 60);
  expect(closest.pixels).toBeGreaterThan(0);
  expect(closest.pixels).toBeLessThanOrEqual(
    Math.hypot(BASE_WIDTH, BASE_HEIGHT),
  );
  for (const ratio of RATIOS) {
    expect(glyphTextureSize(ratio, 16384)).toBeGreaterThanOrEqual(
      closest.pixels * ratio,
    );
    for (const limit of [...GPU_LIMITS, 1024, 256]) {
      expect(glyphTextureSize(ratio, limit)).toBeLessThanOrEqual(limit);
    }
  }
  expect(glyphTextureSize(4, 256)).toBe(256);
});

test("[RES-03] glyph faces are painted at glyphTextureSize of the render's pixels", () => {
  const view = wired("src/render/SceneView.tsx");
  expect(view.calls("useFaces")).toEqual([
    ["family", "glyphTextureSize(ratio, maxTextureSize)"],
  ]);
  expect(view.values("ratio")).toEqual(["useRenderPixels()"]);
  expect(view.values("maxTextureSize")).toEqual([
    "useRenderPixels()",
    "useRenderPixels()",
  ]);
  const glyphs = wired("src/render/glyphTexture.ts");
  expect(glyphs.calls("paintFace")).toEqual([["face", "family", "texels"]]);
  expect(glyphs.values("perMetre")).toEqual([
    "texels / Math.max(face.width, face.height)",
  ]);
  expect(glyphs.imports("./resolution")).toEqual([]);
});

test("texture tiers step at the documented ratios", () => {
  expect(textureTier(1)).toBe(1);
  expect(textureTier(1.5)).toBe(2);
  expect(textureTier(2)).toBe(2);
  expect(textureTier(3)).toBe(4);
  expect(textureTier(4)).toBe(4);
  expect(textureTier(8)).toBe(4);
  expect(textureTier(0.5)).toBe(1);
  expect(glyphTextureSize(1, 16384)).toBe(512);
  expect(glyphTextureSize(4, 16384)).toBe(2048);
});
