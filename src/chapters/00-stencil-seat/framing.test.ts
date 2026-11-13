import {
  Plane,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type PerspectiveCamera,
} from "three";
import { expect, test } from "vitest";
import track from "../../bakes/stencil-seat.json";
import { sampleTimes } from "../../physics/sweep";
import { GLYPH_TEXT_HEIGHT } from "../../render/glyphTexture";
import { cameraFor, UNIT_CORNERS } from "../../render/lens";
import { BASE_HEIGHT, BASE_WIDTH } from "../../render/resolution";
import { FLOOR_ID, type Body } from "../../world/body";
import { cameraAt } from "../../world/camera";
import { restBottom, seatedBottom } from "../../world/fit";
import type { LocalBox, Pose, Vec3 } from "../../world/geometry";
import { isPin } from "../../world/pins";
import { tileId } from "../../world/tape";
import { TILE_PITCH } from "../../world/units";
import {
  DIP_MARGIN,
  MATCH_INDEX,
  RELEASE_AT,
  START_INDEX,
} from "./choreography";
import { SCAN, STENCIL_ID, TAPE } from "./initialState";
import { stencilSeatScene } from "./scene";

const HZ = 60;
const MIN_GLYPH_PX = 36;
const MIN_ROW_GAP_PX = 6;
const MIN_DIP_RISE_PX = 10;
const CELLS_UNDER_TEST = 3;

const scene = stencilSeatScene(track);
const bodyOf = (id: string): Body => {
  const found = scene.bodies.find((each) => each.id === id);
  if (!found) throw new Error(`no body ${id}`);
  return found;
};
const stencil = bodyOf(STENCIL_ID);
const follow = scene.shots.find((shot) => shot.name === "follow");
if (!follow) throw new Error("the scene has no follow shot");
const followTimes = sampleTimes(HZ, follow.from, follow.to);
const hovering = followTimes.filter((t) => t < RELEASE_AT);

const cameraAtTime = (t: number) => cameraFor(cameraAt(scene.shots, t));

const inWorld = (pose: Pose, local: Vec3) =>
  new Vector3(...local)
    .applyQuaternion(new Quaternion(...pose.quaternion))
    .add(new Vector3(...pose.position));

const onScreen = (camera: PerspectiveCamera, point: Vector3) => {
  const ndc = point.clone().project(camera);
  return new Vector2(
    ((ndc.x + 1) / 2) * BASE_WIDTH,
    ((1 - ndc.y) / 2) * BASE_HEIGHT,
  );
};

const slabOf = (tile: Body): LocalBox => {
  const slab = tile.localBoxes.find((local) => !isPin(local));
  if (!slab) throw new Error(`${tile.id} has no slab`);
  return slab;
};

const stencilIndex = (t: number) => {
  const u = (stencil.poseAt(t).position[0] - TAPE.origin[0]) / TILE_PITCH;
  const snapped = Math.round(u);
  return Math.abs(u - snapped) < 1e-9 ? snapped : u;
};

const tileAt = (index: number) => bodyOf(tileId(TAPE, index));

const glyphPixels = (camera: PerspectiveCamera, tile: Body, t: number) => {
  const pose = tile.poseAt(t);
  const { center, size } = slabOf(tile);
  const front = center[2] + size[2] / 2;
  const [bottom, top] = [-1, 1].map((side) =>
    onScreen(
      camera,
      inWorld(pose, [center[0], center[1] + (side * size[1]) / 2, front]),
    ),
  );
  return bottom.distanceTo(top) * GLYPH_TEXT_HEIGHT;
};

const rowGapPixels = (camera: PerspectiveCamera, tile: Body, t: number) => {
  const pose = tile.poseAt(t);
  const x = slabOf(tile).center[0];
  const tips = tile.localBoxes
    .filter(isPin)
    .map((pin) =>
      onScreen(
        camera,
        inWorld(pose, [x, pin.center[1] + pin.size[1] / 2, pin.center[2]]),
      ),
    );
  return Math.min(...tips.slice(1).map((tip, i) => tip.distanceTo(tips[i])));
};

type Measured = { readonly t: number; readonly pixels: number };

const glyphHeights = (): Measured[] =>
  followTimes.flatMap((t) => {
    const camera = cameraAtTime(t);
    const u = stencilIndex(t);
    const first = Math.floor(u);
    const last = Math.ceil(u) + CELLS_UNDER_TEST - 1;
    return Array.from({ length: last - first + 1 }, (_, i) => ({
      t,
      pixels: glyphPixels(camera, tileAt(first + i), t),
    }));
  });

const rowGaps = (): Measured[] =>
  hovering.map((t) => ({
    t,
    pixels: rowGapPixels(
      cameraAtTime(t),
      tileAt(Math.floor(stencilIndex(t)) - 1),
      t,
    ),
  }));

const plateUnderside = (): Vec3 => {
  const plate = stencil.localBoxes.find((local) => local.name === "plate-c1");
  if (!plate) throw new Error("the stencil has no plate-c1");
  const { center, size } = plate;
  return [center[0], center[1] - size[1] / 2, center[2] + size[2] / 2];
};

const dipRises = (): Measured[] => {
  const underside = plateUnderside();
  const dipped = new Map(
    Array.from({ length: MATCH_INDEX - START_INDEX }, (_, i) => [
      START_INDEX + i,
      restBottom(TAPE, SCAN, START_INDEX + i) + DIP_MARGIN,
    ]),
  );
  const dips = hovering.filter(
    (t) => stencil.poseAt(t).position[1] === dipped.get(stencilIndex(t)),
  );
  const probed = new Set(dips.map(stencilIndex));
  if (probed.size !== dipped.size) throw new Error("a probe has no dip sample");
  return dips.map((t) => {
    const pose = stencil.poseAt(t);
    const [x, , z] = pose.position;
    const seated: Pose = { ...pose, position: [x, seatedBottom(TAPE), z] };
    const camera = cameraAtTime(t);
    return {
      t,
      pixels:
        onScreen(camera, inWorld(seated, underside)).y -
        onScreen(camera, inWorld(pose, underside)).y,
    };
  });
};

test.each([
  {
    target:
      "the follow shot keeps the glyphs of the tiles under cells 0–2 at least 36 px tall",
    least: MIN_GLYPH_PX,
    count: followTimes.length * 2,
    measure: glyphHeights,
  },
  {
    target:
      "while the stencil hovers, the uncovered tile before it shows pin rows at least 6 px apart",
    least: MIN_ROW_GAP_PX,
    count: hovering.length - 1,
    measure: rowGaps,
  },
  {
    target:
      "every blocked dip lifts the stencil at least 10 px above its seated height at the same framing",
    least: MIN_DIP_RISE_PX,
    count: MATCH_INDEX - START_INDEX,
    measure: dipRises,
  },
])("$target", ({ least, count, measure }) => {
  const measured = measure();
  expect(measured.length).toBeGreaterThan(count);
  expect(measured.filter((each) => each.pixels < least)).toEqual([]);
});

test("every frame corner of both shots looks at the floor's top face, so no floor edge or horizon is in view", () => {
  const floor = bodyOf(FLOOR_ID);
  const [slab] = floor.localBoxes;
  expect(floor.poseAt(0).quaternion).toEqual([0, 0, 0, 1]);
  const [px, py, pz] = floor.poseAt(0).position;
  const top = py + slab.center[1] + slab.size[1] / 2;
  const reach = [0, 2].map((axis) => [
    [px, py, pz][axis] + slab.center[axis] - slab.size[axis] / 2,
    [px, py, pz][axis] + slab.center[axis] + slab.size[axis] / 2,
  ]);
  const plane = new Plane(new Vector3(0, 1, 0), -top);
  const ray = new Raycaster();
  const misses = sampleTimes(HZ, 0, scene.duration).flatMap((t) => {
    const camera = cameraAtTime(t);
    return UNIT_CORNERS.flatMap(([x, y]) => {
      ray.setFromCamera(new Vector2(x, y), camera);
      const hit = ray.ray.intersectPlane(plane, new Vector3());
      const inside =
        hit !== null &&
        [hit.x, hit.z].every(
          (value, i) => value > reach[i][0] && value < reach[i][1],
        );
      return inside ? [] : [{ t, corner: [x, y] }];
    });
  });
  expect(misses).toEqual([]);
});
