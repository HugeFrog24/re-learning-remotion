import { PerspectiveCamera, Vector3 } from "three";
import type { Scene } from "../world/body";
import { cameraForFrame, type CameraSetup } from "../world/camera";
import type { StoryClock } from "../world/clock";
import { BASE_HEIGHT, BASE_WIDTH } from "./resolution";

export const CAMERA_NEAR = 0.01;
export const CAMERA_FAR = 20;
export const LENS_ASPECT = BASE_WIDTH / BASE_HEIGHT;

export const cameraPropsAt = (
  scene: Scene,
  clock: StoryClock,
  frame: number,
  fps: number,
): CameraSetup => cameraForFrame(scene.shots, frame, fps, clock);

export const placeCamera = (
  camera: PerspectiveCamera,
  { position, target, fov, roll }: CameraSetup,
): PerspectiveCamera => {
  camera.fov = fov;
  camera.aspect = LENS_ASPECT;
  camera.near = CAMERA_NEAR;
  camera.far = CAMERA_FAR;
  camera.updateProjectionMatrix();
  camera.up.set(0, 1, 0);
  camera.position.set(...position);
  camera.lookAt(...target);
  camera.rotateZ(roll);
  camera.updateMatrixWorld(true);
  return camera;
};

export const cameraFor = (setup: CameraSetup): PerspectiveCamera =>
  placeCamera(new PerspectiveCamera(), setup);

export const UNIT_CORNERS: readonly (readonly [number, number])[] = [
  [-1, -1],
  [1, -1],
  [1, 1],
  [-1, 1],
];

export const nearPlaneCorners = (camera: PerspectiveCamera): Vector3[] =>
  UNIT_CORNERS.map(([x, y]) => new Vector3(x, y, -1).unproject(camera));
