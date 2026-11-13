import { expect, test } from "vitest";
import { boxDownsample, compareImages } from "./downsample";

const solid = (width: number, height: number, value: number) =>
  new Uint8Array(width * height * 4).fill(value);

test("boxDownsample averages each 2x2 block per channel", () => {
  const src = new Uint8Array(4 * 4 * 4);
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      const i = (y * 4 + x) * 4;
      src.set([x * 10 + y, 100 + x, 200 - y, 255], i);
    }
  }
  const out = boxDownsample(src, 4, 4, 2);
  expect(out.length).toBe(2 * 2 * 4);
  expect(Array.from(out.slice(0, 4))).toEqual([6, 101, 200, 255]);
  expect(Array.from(out.slice(4, 8))).toEqual([26, 103, 200, 255]);
  expect(Array.from(out.slice(8, 12))).toEqual([8, 101, 198, 255]);
  expect(Array.from(out.slice(12, 16))).toEqual([28, 103, 198, 255]);
});

test("boxDownsample rounds half up to the nearest integer", () => {
  const src = solid(2, 2, 0);
  src[0] = 1;
  src[4] = 1;
  src[8] = 0;
  src[12] = 0;
  expect(boxDownsample(src, 2, 2, 2)[0]).toBe(1);
  src[4] = 0;
  expect(boxDownsample(src, 2, 2, 2)[0]).toBe(0);
});

test("boxDownsample with factor 1 is the identity", () => {
  const src = Uint8Array.from({ length: 16 }, (_, i) => i * 7);
  expect(boxDownsample(src, 2, 2, 1)).toEqual(src);
});

test("boxDownsample rejects dimensions the factor does not divide", () => {
  expect(() => boxDownsample(solid(5, 4, 0), 5, 4, 2)).toThrow();
});

test("compareImages of identical images is zero", () => {
  const a = solid(128, 128, 90);
  expect(compareImages(a, a.slice(), 128, 128)).toEqual({
    meanAbs: 0,
    worstBlock: 0,
    worstAt: { x: 0, y: 0 },
  });
});

test("compareImages sees a single offset 64x64 block", () => {
  const a = solid(128, 128, 90);
  const b = a.slice();
  for (let y = 0; y < 64; y++) {
    for (let x = 64; x < 128; x++) {
      const i = (y * 128 + x) * 4;
      b[i] = b[i + 1] = b[i + 2] = 100;
    }
  }
  const result = compareImages(a, b, 128, 128);
  expect(result.worstBlock).toBeCloseTo(10 / 255, 9);
  expect(result.worstAt).toEqual({ x: 64, y: 0 });
  expect(result.meanAbs).toBeCloseTo(10 / 255 / 4, 9);
});

test("compareImages ignores alpha and rejects length mismatch", () => {
  const opaque = solid(64, 64, 10);
  const clear = solid(64, 64, 10);
  clear[3] = 0;
  expect(compareImages(opaque, clear, 64, 64).meanAbs).toBe(0);
  expect(() => compareImages(opaque, solid(32, 32, 10), 64, 64)).toThrow();
});
