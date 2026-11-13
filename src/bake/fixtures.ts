import type { Body, Material, Scene } from "../world/body";
import { at, body } from "../world/fixtures";
import { IDENTITY_POSE, type Vec3 } from "../world/geometry";
import { releasedPose } from "../world/track";

export const TILE: Vec3 = [0.04, 0.012, 0.04];
export const DROP_GAP = 0.044;
export const DROP_Y0 = DROP_GAP + TILE[1] / 2;

const FLOOR: Vec3 = [0.4, 0.02, 0.4];
const PLASTIC: Material = { density: 1200, friction: 0.5, restitution: 0 };

export const floor = body("floor", "static", () => IDENTITY_POSE, FLOOR, [
  0,
  -FLOOR[1] / 2,
  0,
]);

export const drone: Body = {
  ...body("drone", "kinematic", (t) =>
    at([0.15 + 0.1 * t, 0.1, 0], [0, Math.sin(t), 0, Math.cos(t)]),
  ),
  hovering: true,
};

export const tileRelease = (releaseAt: number, speed = 0) => ({
  at: releaseAt,
  material: PLASTIC,
  hoverAt: (t: number) => at([speed * t, DROP_Y0, 0]),
});

export const tile = (releaseAt: number, speed = 0): Body => {
  const release = tileRelease(releaseAt, speed);
  return {
    ...body("tile", "simulated", releasedPose("tile", release, null), TILE),
    hovering: true,
    release,
  };
};

export const dropScene = (
  releaseAt: number,
  duration = 0.4,
  speed = 0,
): Scene => ({
  id: "drop",
  duration,
  bodies: [floor, tile(releaseAt, speed), drone],
  shots: [],
});
