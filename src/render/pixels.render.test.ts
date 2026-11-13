import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { PNG } from "pngjs";
import { beforeAll, expect, test } from "vitest";
import track from "../bakes/stencil-seat.json";
import { STENCIL_SEAT_SECONDS } from "../chapters/00-stencil-seat/choreography";
import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import { STEADY } from "../world/clock";
import { TILE_ID_PREFIX } from "../world/tape";
import { detailRatio, quadRegion, type Picture, type Quad } from "./detail";
import { boxDownsample, compareImages } from "./downsample";
import { frameView } from "./frameView";
import { frontFace, screenCorners } from "./glyphFraming";
import { GLYPH_TEXT_HEIGHT, GLYPH_TEXT_WIDTH } from "./glyphTexture";
import { cameraFor } from "./lens";
import { BASE_HEIGHT, BASE_WIDTH } from "./resolution";

const FPS = 30;
const SCALES = [1, 2, 4] as const;
const FRAMES = [
  Math.round(0.5 * FPS),
  Math.round((STENCIL_SEAT_SECONDS - 0.5) * FPS),
];
const MEAN_LIMIT = 2 / 255;
const BLOCK_LIMIT = 8 / 255;
const MIN_GLYPH_REGIONS = 3;
const DETAIL_LIMITS: Readonly<Record<number, number>> = { 2: 1.5, 4: 3.5 };

const scene = stencilSeatScene(track);
const stills = new Map<string, PNG>();
const renderSeconds = new Map<string, number>();
const still = (frame: number, scale: number) => {
  const png = stills.get(`${frame}x${scale}`);
  if (!png) throw new Error(`frame ${frame} was not rendered at ${scale}x`);
  return png;
};
const picture = (png: PNG): Picture => ({
  rgba: new Uint8Array(png.data.buffer, png.data.byteOffset, png.data.length),
  width: png.width,
  height: png.height,
});

const glyphQuads = (frame: number): Quad[] => {
  const view = frameView(scene, STEADY, frame, FPS);
  const camera = cameraFor(view.camera);
  return scene.bodies
    .filter((body) => body.id.startsWith(TILE_ID_PREFIX))
    .flatMap((tile) => {
      const quad = screenCorners(
        frontFace(tile, view.t, [GLYPH_TEXT_WIDTH, GLYPH_TEXT_HEIGHT]),
        camera,
      );
      if (!quad) return [];
      const { x, y, width, height } = quadRegion(quad, 1);
      const inside =
        x >= 0 && y >= 0 && x + width <= BASE_WIDTH && y + height <= BASE_HEIGHT;
      return inside ? [quad] : [];
    });
};

const heatMap = (
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
) => {
  const out = new PNG({ width, height });
  for (let i = 0; i < width * height; i++) {
    const d = Math.max(
      Math.abs(a[i * 4] - b[i * 4]),
      Math.abs(a[i * 4 + 1] - b[i * 4 + 1]),
      Math.abs(a[i * 4 + 2] - b[i * 4 + 2]),
    );
    const v = Math.min(255, d * 16);
    out.data.set([v, v, v, 255], i * 4);
  }
  return PNG.sync.write(out);
};

beforeAll(async () => {
  const entryPoint = path.resolve("src/index.ts");
  const serveUrl = await bundle({ entryPoint, rspack: true });
  const inputProps = { fps: FPS };
  const composition = await selectComposition({
    serveUrl,
    id: "StencilSeat",
    inputProps,
    chromiumOptions: { gl: "angle" },
  });
  mkdirSync("out/pixels", { recursive: true });
  for (const frame of FRAMES) {
    for (const scale of SCALES) {
      const output = `out/pixels/f${frame}-x${scale}.png`;
      const started = Date.now();
      await renderStill({
        composition,
        serveUrl,
        output,
        frame,
        scale,
        imageFormat: "png",
        inputProps,
        chromiumOptions: { gl: "angle" },
        overwrite: true,
      });
      renderSeconds.set(`${frame}x${scale}`, (Date.now() - started) / 1000);
      stills.set(`${frame}x${scale}`, PNG.sync.read(readFileSync(output)));
    }
  }
});

test("[RES-04] 4K and 8K stills match the 1080p still when shrunk back", () => {
  const report: object[] = [];
  const failures: string[] = [];
  for (const frame of FRAMES) {
    const base = still(frame, 1);
    for (const scale of SCALES) {
      const png = still(frame, scale);
      expect([png.width, png.height]).toEqual([
        BASE_WIDTH * scale,
        BASE_HEIGHT * scale,
      ]);
    }
    for (const scale of [2, 4]) {
      const big = still(frame, scale);
      const small = boxDownsample(
        new Uint8Array(big.data),
        big.width,
        big.height,
        scale,
      );
      const diff = compareImages(
        new Uint8Array(base.data),
        small,
        BASE_WIDTH,
        BASE_HEIGHT,
      );
      writeFileSync(
        `out/pixels/f${frame}-x${scale}-diff.png`,
        heatMap(new Uint8Array(base.data), small, BASE_WIDTH, BASE_HEIGHT),
      );
      const row = {
        frame,
        scale,
        renderSeconds: renderSeconds.get(`${frame}x${scale}`),
        baseRenderSeconds: renderSeconds.get(`${frame}x1`),
        meanAbs255: diff.meanAbs * 255,
        worstBlock255: diff.worstBlock * 255,
        worstBlockAt: diff.worstAt,
      };
      report.push(row);
      if (diff.meanAbs > MEAN_LIMIT || diff.worstBlock > BLOCK_LIMIT) {
        failures.push(JSON.stringify(row));
      }
    }
  }
  writeFileSync(
    "out/pixels-report.json",
    JSON.stringify(
      { limits: { meanAbs255: 2, worstBlock255: 8 }, results: report },
      null,
      2,
    ),
  );
  expect(failures).toEqual([]);
});

test("[RES-04] 4K and 8K stills carry real detail in the glyph regions, not an enlargement of the 1080p still", () => {
  const report: object[] = [];
  const failures: string[] = [];
  for (const frame of FRAMES) {
    const quads = glyphQuads(frame);
    expect(quads.length, `glyph regions in frame ${frame}`).toBeGreaterThanOrEqual(
      MIN_GLYPH_REGIONS,
    );
    const base = picture(still(frame, 1));
    for (const scale of [2, 4]) {
      const big = picture(still(frame, scale));
      const total = detailRatio(big, base, scale, quads);
      const each = quads.map((quad) => detailRatio(big, base, scale, [quad]).ratio);
      const row = {
        frame,
        scale,
        regions: quads.length,
        ratio: total.ratio,
        weakest: Math.min(...each),
        each,
        quads,
      };
      report.push(row);
      if (total.ratio < DETAIL_LIMITS[scale]) {
        failures.push(JSON.stringify({ frame, scale, ratio: total.ratio }));
      }
    }
  }
  writeFileSync(
    "out/pixels-detail.json",
    JSON.stringify({ limits: DETAIL_LIMITS, results: report }, null, 2),
  );
  expect(failures).toEqual([]);
});
