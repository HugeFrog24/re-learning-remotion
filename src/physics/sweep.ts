import { TOUCH_EPSILON } from "../world/units";
import { toObb } from "../world/geometry";
import { reachOf, type Body, type Scene } from "../world/body";
import { collide, type Obb } from "./collision";

export const CHECK_HZ = 960;
export const RESTING_TOLERANCE = 0.0005;
export const KINEMATIC_EPSILON = TOUCH_EPSILON;

export type Violation = { t: number; a: string; b: string; depth: number };

export type SweepOptions = { hz: number; from?: number; to?: number };

export const GRID_SLACK = 1e-9;

export const sampleTimes = (hz: number, from: number, to: number): number[] => {
  const times: number[] = [];
  const steps = Math.floor((to - from) * hz + GRID_SLACK);
  for (let k = 0; k <= steps; k++) {
    const t = from + k / hz;
    if (t < to - GRID_SLACK / hz) times.push(t);
  }
  times.push(to);
  return times;
};

type Placed = {
  readonly body: Body;
  readonly reach: number;
  readonly cache: { key: string; boxes: readonly Obb[] };
  x: number;
  y: number;
  z: number;
  boxes: () => readonly Obb[];
};

const place = (body: Body): Placed => {
  const placed: Placed = {
    body,
    reach: reachOf(body),
    cache: { key: "", boxes: [] },
    x: 0,
    y: 0,
    z: 0,
    boxes: () => placed.cache.boxes,
  };
  return placed;
};

const moveTo = (placed: Placed, t: number) => {
  const pose = placed.body.poseAt(t);
  const key = `${pose.position.join(",")}|${pose.quaternion.join(",")}`;
  [placed.x, placed.y, placed.z] = pose.position;
  placed.boxes = () => {
    if (placed.cache.key !== key) {
      placed.cache.key = key;
      placed.cache.boxes = placed.body.localBoxes.map((local) =>
        toObb(local, pose),
      );
    }
    return placed.cache.boxes;
  };
};

const settling = (body: Body, t: number) =>
  body.motion === "simulated" && t >= (body.release?.at ?? -Infinity);

export const contactLimit = (a: Body, b: Body, t: number) =>
  settling(a, t) || settling(b, t) ? RESTING_TOLERANCE : KINEMATIC_EPSILON;

const near = (a: Placed, b: Placed) => {
  const reach = a.reach + b.reach;
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return dx * dx + dy * dy + dz * dz <= reach * reach;
};

const pairViolations = (
  t: number,
  a: Placed,
  b: Placed,
  into: Violation[],
) => {
  const limit = contactLimit(a.body, b.body, t);
  const boxesB = b.boxes();
  for (const boxA of a.boxes()) {
    for (const boxB of boxesB) {
      const reach = boxA.bound + boxB.bound;
      if (boxA.center.distanceToSquared(boxB.center) > reach * reach) continue;
      const contact = collide(boxA, boxB);
      if (contact && contact.depth > limit) {
        into.push({
          t,
          a: `${a.body.id}/${boxA.name}`,
          b: `${b.body.id}/${boxB.name}`,
          depth: contact.depth,
        });
      }
    }
  }
};

export const sweep = (scene: Scene, opts: SweepOptions): Violation[] => {
  const from = opts.from ?? 0;
  const to = opts.to ?? scene.duration;
  const placed = scene.bodies.map(place);
  const violations: Violation[] = [];
  for (const t of sampleTimes(opts.hz, from, to)) {
    for (const p of placed) moveTo(p, t);
    for (let i = 0; i < placed.length; i++) {
      for (let j = i + 1; j < placed.length; j++) {
        const a = placed[i];
        const b = placed[j];
        if (a.body.motion === "static" && b.body.motion === "static") continue;
        if (near(a, b)) pairViolations(t, a, b, violations);
      }
    }
  }
  return violations;
};
