import { Vector3 } from "three";
import { expect, test } from "vitest";
import type { CameraSetup } from "../world/camera";
import { BASE_HEIGHT, BASE_WIDTH } from "./resolution";
import { CAMERA_FAR, CAMERA_NEAR, cameraFor } from "./lens";

const setup = (roll: number): CameraSetup => ({
  position: [0.3, 0.4, 2],
  target: [0.1, 0.05, 0],
  fov: 30,
  roll,
});

const upOf = (setupAt: CameraSetup) =>
  new Vector3(0, 1, 0).applyQuaternion(cameraFor(setupAt).quaternion);

test("the builder places the lens at the setup and aims it at the target", () => {
  const camera = cameraFor(setup(0.4));
  expect(camera.position.toArray()).toEqual([0.3, 0.4, 2]);
  expect([camera.fov, camera.aspect, camera.near, camera.far]).toEqual([
    30,
    BASE_WIDTH / BASE_HEIGHT,
    CAMERA_NEAR,
    CAMERA_FAR,
  ]);
  const aim = new Vector3(0.1, 0.05, 0).sub(camera.position).normalize();
  expect(camera.getWorldDirection(new Vector3()).distanceTo(aim)).toBeLessThan(
    1e-12,
  );
});

test("roll turns the camera's up about its view axis by exactly roll, counter-clockwise as the viewer sees it", () => {
  const level = upOf(setup(0));
  const back = cameraFor(setup(0)).getWorldDirection(new Vector3()).negate();
  for (const roll of [0.3, -0.7, 2]) {
    const expected = level.clone().applyAxisAngle(back, roll);
    expect(upOf(setup(roll)).distanceTo(expected)).toBeLessThan(1e-12);
  }
});
