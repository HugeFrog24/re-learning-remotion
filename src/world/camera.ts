import { storyTimeOfFrame, type StoryClock } from "./clock";
import type { Vec3 } from "./geometry";

export type CameraSetup = {
  readonly position: Vec3;
  readonly target: Vec3;
  readonly fov: number;
  readonly roll: number;
};

export type Shot = {
  readonly name: string;
  readonly from: number;
  readonly to: number;
  readonly at: (t: number) => CameraSetup;
};

const BASE_FPS = 30;

export const cameraAt = (shots: readonly Shot[], t: number): CameraSetup => {
  const last = shots[shots.length - 1];
  if (!last) throw new Error("no shots");
  const shot = shots.find((s) => s.from <= t && t < s.to);
  return shot ? shot.at(t) : last.at(last.to);
};

const offFrame = (x: number): boolean =>
  Math.abs(x * BASE_FPS - Math.round(x * BASE_FPS)) > 1e-9;

export const validateShots = (
  shots: readonly Shot[],
  duration: number,
): string[] => {
  const problems: string[] = [];
  const first = shots[0];
  const last = shots[shots.length - 1];
  if (!first || !last) return ["no shots"];
  if (first.from !== 0) problems.push(`first shot starts at ${first.from}, not 0`);
  if (last.to !== duration) problems.push(`last shot ends at ${last.to}, not ${duration}`);
  shots.forEach((shot, i) => {
    for (const cut of [shot.from, shot.to]) {
      if (offFrame(cut)) problems.push(`${shot.name} cut ${cut} is off the ${BASE_FPS} fps grid`);
    }
    const next = shots[i + 1];
    if (!next) return;
    if (next.from > shot.to) problems.push(`gap between ${shot.name} and ${next.name}`);
    if (next.from < shot.to) problems.push(`overlap between ${shot.name} and ${next.name}`);
  });
  return problems;
};

export const cameraForFrame = (
  shots: readonly Shot[],
  frame: number,
  fps: number,
  clock: StoryClock,
): CameraSetup => cameraAt(shots, storyTimeOfFrame(frame, fps, clock));
