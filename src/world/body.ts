import type { Obb } from "../physics/collision";
import { toObb, type LocalBox, type Pose } from "./geometry";

export type Material = {
  readonly density: number;
  readonly friction: number;
  readonly restitution: number;
};

export type Body = {
  readonly id: string;
  readonly motion: "static" | "kinematic" | "simulated";
  readonly hovering: boolean;
  readonly maxSpeed: number;
  readonly maxAccel: number;
  readonly impacts: readonly number[];
  readonly localBoxes: readonly LocalBox[];
  readonly poseAt: (t: number) => Pose;
  readonly release?: {
    readonly at: number;
    readonly material: Material;
    readonly hoverAt: (t: number) => Pose;
  };
};

export type Scene = {
  readonly id: string;
  readonly duration: number;
  readonly bodies: readonly Body[];
  readonly shots: readonly unknown[];
};

export const solidsAt = (body: Body, t: number): readonly Obb[] => {
  const pose = body.poseAt(t);
  return body.localBoxes.map((local) => toObb(local, pose));
};
