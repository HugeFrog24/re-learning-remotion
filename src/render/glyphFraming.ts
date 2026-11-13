import { Object3D, PerspectiveCamera, Vector3 } from "three";
import { sampleTimes } from "../physics/sweep";
import type { Body, Scene } from "../world/body";
import { cameraAt } from "../world/camera";
import { TILE_ID_PREFIX } from "../world/tape";
import { cameraFor, UNIT_CORNERS } from "./lens";
import { BASE_HEIGHT, BASE_WIDTH } from "./resolution";

export const frontFace = (
  body: Body,
  t: number,
  inHeights?: readonly [width: number, height: number],
): Vector3[] => {
  const slab = body.localBoxes.find((local) => local.name === "tile");
  if (!slab) throw new Error(`${body.id} has no tile slab`);
  const { position, quaternion } = body.poseAt(t);
  const holder = new Object3D();
  holder.position.set(...position);
  holder.quaternion.set(...quaternion);
  holder.updateMatrixWorld(true);
  const [cx, cy, cz] = slab.center;
  const [w, h, d] = slab.size;
  const [width, height] = inHeights
    ? [inHeights[0] * h, inHeights[1] * h]
    : [w, h];
  return UNIT_CORNERS.map(([sx, sy]) =>
    new Vector3(
      cx + (sx * width) / 2,
      cy + (sy * height) / 2,
      cz + d / 2,
    ).applyMatrix4(holder.matrixWorld),
  );
};

export const screenCorners = (
  corners: readonly Vector3[],
  camera: PerspectiveCamera,
): [x: number, y: number][] | null => {
  const inView = corners.map((corner) =>
    corner.clone().applyMatrix4(camera.matrixWorldInverse),
  );
  if (inView.some((corner) => corner.z >= 0)) return null;
  return corners.map((corner) => {
    const ndc = corner.clone().project(camera);
    return [((ndc.x + 1) / 2) * BASE_WIDTH, ((1 - ndc.y) / 2) * BASE_HEIGHT];
  });
};

const framePixels = (
  corners: readonly Vector3[],
  camera: PerspectiveCamera,
) => {
  const screen = screenCorners(corners, camera);
  if (!screen) return 0;
  const xs = screen.map(([x]) => x);
  const ys = screen.map(([, y]) => y);
  const [left, right] = [Math.min(...xs), Math.max(...xs)];
  const [top, bottom] = [Math.min(...ys), Math.max(...ys)];
  if (right < 0 || left > BASE_WIDTH || bottom < 0 || top > BASE_HEIGHT) {
    return 0;
  }
  return Math.max(right - left, bottom - top);
};

export const closestGlyphPixels = (
  scene: Scene,
  hz: number,
): { t: number; tile: string; pixels: number } => {
  const tiles = scene.bodies.filter((body) =>
    body.id.startsWith(TILE_ID_PREFIX),
  );
  let best = { t: 0, tile: "", pixels: 0 };
  for (const t of sampleTimes(hz, 0, scene.duration)) {
    const camera = cameraFor(cameraAt(scene.shots, t));
    for (const body of tiles) {
      const pixels = framePixels(frontFace(body, t), camera);
      if (pixels > best.pixels) best = { t, tile: body.id, pixels };
    }
  }
  return best;
};
