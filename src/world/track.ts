import { Quaternion } from "three";
import type { Pose } from "./geometry";

export type BakeTrack = {
  readonly id: string;
  readonly hz: number;
  readonly from: number;
  readonly poses: Readonly<Record<string, readonly number[]>>;
};

const STRIDE = 7;
const PRECISION = 1e7;
export const TRACK_RESOLUTION = 1 / PRECISION;
const STEP_SNAP = 1e-6;

const quantize = (value: number) =>
  Math.round(value * PRECISION) / PRECISION + 0;

export const encodePose = (pose: Pose): number[] =>
  [...pose.position, ...pose.quaternion].map(quantize);

const stepPose = (poses: readonly number[], k: number): Pose => {
  const at = k * STRIDE;
  return {
    position: [poses[at], poses[at + 1], poses[at + 2]],
    quaternion: [poses[at + 3], poses[at + 4], poses[at + 5], poses[at + 6]],
  };
};

const between = (a: Pose, b: Pose, f: number): Pose => {
  const [x, y, z] = a.position.map(
    (value, i) => value + (b.position[i] - value) * f,
  );
  const q = new Quaternion(...a.quaternion)
    .slerp(new Quaternion(...b.quaternion), f)
    .normalize();
  return { position: [x, y, z], quaternion: [q.x, q.y, q.z, q.w] };
};

export const sampleTrack = (track: BakeTrack, id: string, t: number): Pose => {
  const poses = track.poses[id];
  if (!poses) throw new Error(`bake ${track.id} has no track for ${id}`);
  const last = poses.length / STRIDE - 1;
  const u = Math.min(Math.max((t - track.from) * track.hz, 0), last);
  const nearest = Math.round(u);
  if (Math.abs(u - nearest) <= STEP_SNAP) return stepPose(poses, nearest);
  const k = Math.floor(u);
  return between(stepPose(poses, k), stepPose(poses, k + 1), u - k);
};

export const releasedPose =
  (
    id: string,
    release: { readonly at: number; readonly hoverAt: (t: number) => Pose },
    track: BakeTrack | null,
  ) =>
  (t: number): Pose => {
    if (t < release.at) return release.hoverAt(t);
    if (!track)
      throw new Error(`${id} is released at ${release.at} s but has no bake`);
    return sampleTrack(track, id, t);
  };
