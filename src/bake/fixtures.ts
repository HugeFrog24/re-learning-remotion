import type { Body, Material, Scene } from "../world/body";
import { at, body } from "../world/fixtures";
import {
  IDENTITY_POSE,
  type Pose,
  type Quat,
  type Vec3,
} from "../world/geometry";
import { releasedPose } from "../world/track";

export const TILE: Vec3 = [0.04, 0.012, 0.04];
export const DROP_GAP = 0.044;
export const DROP_Y0 = DROP_GAP + TILE[1] / 2;
export const SPIN_RATE = 4;
export const OFF_CENTRE: Vec3 = [0.03, 0, 0];

const FLOOR: Vec3 = [0.4, 0.02, 0.4];
const PLASTIC: Material = { density: 1200, friction: 0.5, restitution: 0 };

export const yawing = (rate: number, t: number): Quat => [
  0,
  Math.sin((rate * t) / 2),
  0,
  Math.cos((rate * t) / 2),
];

export const floor = body("floor", "static", () => IDENTITY_POSE, FLOOR, [
  0,
  -FLOOR[1] / 2,
  0,
]);

export const drone: Body = {
  ...body("drone", "kinematic", (t) =>
    at([0.15 + 0.1 * t, 0.1, 0], yawing(2, t)),
  ),
  hovering: true,
};

const hover = (releaseAt: number, hoverAt: (t: number) => Pose) => ({
  at: releaseAt,
  material: PLASTIC,
  hoverAt,
});

const released = (
  id: string,
  release: ReturnType<typeof hover>,
  center: Vec3 = [0, 0, 0],
): Body => ({
  ...body(id, "simulated", releasedPose(id, release, null), TILE, center),
  hovering: true,
  release,
});

export const tileRelease = (releaseAt: number, speed = 0) =>
  hover(releaseAt, (t) => at([speed * t, DROP_Y0, 0]));

export const spinRelease = (releaseAt: number, x: number, flipped = false) =>
  hover(releaseAt, (t) => {
    const sign = flipped && t >= releaseAt ? -1 : 1;
    const [qx, qy, qz, qw] = yawing(SPIN_RATE, t).map((q) => sign * q);
    return at([x, 0.5, 0], [qx, qy, qz, qw]);
  });

export const dropScene = (
  releaseAt: number,
  duration = 0.4,
  speed = 0,
): Scene => ({
  id: "drop",
  duration,
  bodies: [floor, released("tile", tileRelease(releaseAt, speed)), drone],
  shots: [],
});

export const spinScene = (early: number, late: number): Scene => ({
  id: "spin",
  duration: late + 0.1,
  bodies: [
    released("a", spinRelease(early, -0.1)),
    released("b", spinRelease(late, 0.1)),
    released("c", spinRelease(early, 0.3), OFF_CENTRE),
    released("d", spinRelease(early, 0.5, true)),
  ],
  shots: [],
});
