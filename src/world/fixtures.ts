import { staticBody, type Body } from "./body";
import {
  box,
  IDENTITY_POSE,
  type Pose,
  type Quat,
  type Vec3,
} from "./geometry";

export const at = (
  position: Vec3,
  quaternion: Quat = IDENTITY_POSE.quaternion,
): Pose => ({ position, quaternion });

export const body = (
  id: string,
  motion: Body["motion"],
  poseAt: (t: number) => Pose,
  size: Vec3 = [0.02, 0.02, 0.02],
  center: Vec3 = [0, 0, 0],
): Body => ({
  ...staticBody(id, [box("b", center, size)], IDENTITY_POSE),
  motion,
  maxSpeed: 1,
  maxAccel: 5,
  poseAt,
});

export const hoverUntil = (
  base: Body,
  releaseAt: number,
  hoverAt: (t: number) => Pose = base.poseAt,
): Body => ({
  ...base,
  motion: "simulated",
  hovering: true,
  release: {
    at: releaseAt,
    material: { density: 1, friction: 1, restitution: 0 },
    hoverAt,
  },
});
