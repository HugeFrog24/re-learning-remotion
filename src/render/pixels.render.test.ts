import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import { PNG } from "pngjs";
import { expect, test } from "vitest";
import { STENCIL_SEAT_SECONDS } from "../chapters/00-stencil-seat/choreography";
import { boxDownsample, compareImages } from "./downsample";

const FPS = 30;
const SCALES = [1, 2, 4] as const;
const FRAMES = [
  Math.round(0.5 * FPS),
  Math.round((STENCIL_SEAT_SECONDS - 0.5) * FPS),
];
const MEAN_LIMIT = 2 / 255;
const BLOCK_LIMIT = 8 / 255;

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

test("[RES-04] 4K and 8K stills match the 1080p still when shrunk back", async () => {
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
  const report: Record<string, unknown>[] = [];
  const failures: string[] = [];

  for (const frame of FRAMES) {
    const images = new Map<number, PNG>();
    const seconds = new Map<number, number>();
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
      seconds.set(scale, (Date.now() - started) / 1000);
      const png = PNG.sync.read(readFileSync(output));
      expect([png.width, png.height]).toEqual([1080 * scale, 1920 * scale]);
      images.set(scale, png);
    }
    const base = images.get(1)!;
    for (const scale of [2, 4]) {
      const big = images.get(scale)!;
      const small = boxDownsample(
        new Uint8Array(big.data),
        big.width,
        big.height,
        scale,
      );
      const diff = compareImages(new Uint8Array(base.data), small, 1080, 1920);
      writeFileSync(
        `out/pixels/f${frame}-x${scale}-diff.png`,
        heatMap(new Uint8Array(base.data), small, 1080, 1920),
      );
      const row = {
        frame,
        scale,
        width: big.width,
        height: big.height,
        renderSeconds: seconds.get(scale),
        baseRenderSeconds: seconds.get(1),
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
