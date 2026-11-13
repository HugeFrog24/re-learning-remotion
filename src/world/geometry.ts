import { Matrix4, Quaternion, Vector3 } from "three";
import { obb, type Obb } from "../physics/collision";

export type Vec3 = readonly [number, number, number];
export type Quat = readonly [number, number, number, number];

export type Pose = { readonly position: Vec3; readonly quaternion: Quat };

export const IDENTITY_POSE: Pose = {
  position: [0, 0, 0],
  quaternion: [0, 0, 0, 1],
};

export type LocalBox = {
  readonly name: string;
  readonly center: Vec3;
  readonly size: Vec3;
};

export const box = (name: string, center: Vec3, size: Vec3): LocalBox => ({
  name,
  center,
  size,
});

const UNIT_SCALE = new Vector3(1, 1, 1);

export const toObb = (local: LocalBox, pose: Pose): Obb =>
  obb(
    local.name,
    new Matrix4().compose(
      new Vector3(...pose.position),
      new Quaternion(...pose.quaternion),
      UNIT_SCALE,
    ),
    local.size,
    local.center,
  );
