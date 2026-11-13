import { expect, test } from "vitest";
import { boxDownsample } from "./downsample";
import {
  crop,
  detailRatio,
  enlarge,
  insideQuad,
  quadRegion,
  subBlockEnergy,
  type Picture,
  type Quad,
} from "./detail";

const grey = (width: number, height: number, at: (x: number, y: number) => number): Picture => {
  const rgba = new Uint8Array(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const v = at(x, y);
      rgba.set([v, v, v, 255], (y * width + x) * 4);
    }
  }
  return { rgba, width, height };
};

const reds = (picture: Picture) =>
  Array.from(picture.rgba.filter((_, i) => i % 4 === 0));

const edge = grey(16, 16, (x) => (x < 6 ? 20 : 220));
const shrunk = (picture: Picture, factor: number): Picture => ({
  rgba: boxDownsample(picture.rgba, picture.width, picture.height, factor),
  width: picture.width / factor,
  height: picture.height / factor,
});

test("crop and a factor-1 enlargement copy the region", () => {
  const ramp = grey(5, 3, (x, y) => x * 10 + y);
  const region = { x: 1, y: 1, width: 3, height: 2 };
  expect(reds(crop(ramp, region))).toEqual([11, 21, 31, 12, 22, 32]);
  expect(enlarge(ramp, 1, region)).toEqual(crop(ramp, region));
});

test("enlarge samples bilinearly at pixel centres and clamps at the border", () => {
  const pair = grey(2, 1, (x) => (x === 0 ? 0 : 255));
  const wide = enlarge(pair, 4, { x: 0, y: 0, width: 8, height: 1 });
  expect(reds(wide)).toEqual([0, 0, 32, 96, 159, 223, 255, 255]);
});

test("sub-block energy counts squared steps inside each block only", () => {
  const steps = grey(4, 1, (x) => [0, 10, 10, 0][x]);
  expect(subBlockEnergy(steps, 2)).toBe(2 * 3 * 100);
  const blocky = grey(8, 8, (x, y) => (Math.floor(x / 4) + Math.floor(y / 4)) * 60);
  expect(subBlockEnergy(blocky, 4)).toBe(0);
});

test("the quad mask keeps only steps whose pixel centres both lie inside", () => {
  const diamond: Quad = [
    [2, 0],
    [4, 2],
    [2, 4],
    [0, 2],
  ];
  expect(insideQuad(diamond, 2, 2)).toBe(true);
  expect(insideQuad(diamond, 0.5, 0.5)).toBe(false);
  expect(insideQuad([...diamond].reverse(), 2, 2)).toBe(true);
  expect(quadRegion([[0.5, 1.2], [3.1, 1.2], [3.1, 2.7], [0.5, 2.7]], 4)).toEqual({
    x: 0,
    y: 4,
    width: 16,
    height: 8,
  });
  const stripes = grey(4, 1, (x) => (x % 2) * 50);
  const left = (x: number) => x < 2;
  expect(subBlockEnergy(stripes, 4, left)).toBe(3 * 2500);
  expect(subBlockEnergy(stripes, 4)).toBe(3 * 3 * 2500);
});

test("a sharp edge carries more detail than any smooth enlargement of its shrunk copy, and enlargements carry none", () => {
  const boxes: Quad[] = [
    [
      [0, 0],
      [4, 0],
      [4, 4],
      [0, 4],
    ],
  ];
  const base = shrunk(edge, 4);
  const smooth = enlarge(base, 4, { x: 0, y: 0, width: 16, height: 16 });
  const blocky = grey(16, 16, (x, y) => reds(base)[Math.floor(y / 4) * 4 + Math.floor(x / 4)]);
  expect(detailRatio(edge, base, 4, boxes).ratio).toBeGreaterThan(2);
  expect(detailRatio(smooth, base, 4, boxes).ratio).toBe(1);
  expect(detailRatio(blocky, base, 4, boxes).ratio).toBe(0);
});
