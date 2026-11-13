import type { Body } from "./body";
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
  id,
  motion,
  hovering: false,
  maxSpeed: 1,
  maxAccel: 5,
  impacts: [],
  localBoxes: [box("b", center, size)],
  poseAt,
});
