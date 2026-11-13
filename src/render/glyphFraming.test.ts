import { expect, test } from "vitest";
import { staticBody, type Body, type Scene } from "../world/body";
import type { Shot } from "../world/camera";
import { IDENTITY_POSE } from "../world/geometry";
import { tileBoxes } from "../world/pins";
import { TILE_ID_PREFIX } from "../world/tape";
import { TILE_HEIGHT, TILE_SIZE } from "../world/units";
import { closestGlyphPixels } from "./glyphFraming";
import { BASE_HEIGHT } from "./resolution";

const FOV = 30;
const DISTANCE = 0.5;

const tile = (id: string, x: number): Body =>
  staticBody(id, tileBoxes(0), { ...IDENTITY_POSE, position: [x, 0, 0] });

const scene = (bodies: readonly Body[], at: Shot["at"]): Scene => ({
  id: "probe",
  duration: 1,
  bodies,
  shots: [{ name: "probe", from: 0, to: 1, at }],
});

const FRONT = TILE_SIZE / 2;
const lookAtFront = (x: number, distance: number) => () => ({
  position: [x, TILE_HEIGHT / 2, FRONT + distance] as const,
  target: [x, TILE_HEIGHT / 2, FRONT] as const,
  fov: FOV,
  roll: 0,
});

test("a face head-on projects to the pinhole size of its larger side", () => {
  const probe = scene(
    [tile(`${TILE_ID_PREFIX}00`, 0)],
    lookAtFront(0, DISTANCE),
  );
  const expected =
    (TILE_SIZE / (2 * DISTANCE * Math.tan((FOV / 2) * (Math.PI / 180)))) *
    BASE_HEIGHT;
  const found = closestGlyphPixels(probe, 10);
  expect(found.tile).toBe(`${TILE_ID_PREFIX}00`);
  expect(found.pixels).toBeCloseTo(expected, 6);
});

test("the nearest of several tiles wins, and non-tiles are ignored", () => {
  const probe = scene(
    [
      tile("rail", 0),
      tile(`${TILE_ID_PREFIX}A`, 0),
      tile(`${TILE_ID_PREFIX}B`, 0.2),
    ],
    lookAtFront(0, DISTANCE),
  );
  expect(closestGlyphPixels(probe, 10).tile).toBe(`${TILE_ID_PREFIX}A`);
});

test("faces behind the camera or off the frame do not count", () => {
  const behind = scene([tile(`${TILE_ID_PREFIX}00`, 0)], () => ({
    position: [0, 0, -1],
    target: [0, 0, -2],
    fov: FOV,
    roll: 0,
  }));
  expect(closestGlyphPixels(behind, 10).pixels).toBe(0);
  const aside = scene(
    [tile(`${TILE_ID_PREFIX}00`, 5)],
    lookAtFront(0, DISTANCE),
  );
  expect(closestGlyphPixels(aside, 10).pixels).toBe(0);
});
