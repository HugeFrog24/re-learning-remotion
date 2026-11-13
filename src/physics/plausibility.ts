import type { Body } from "../world/body";
import type { Vec3 } from "../world/geometry";
import { sampleTimes } from "./sweep";

export type PlausibilityOptions = { hz: number; from?: number; to: number };

const TELEPORT_SLACK = 1e-9;
const ACCEL_SLACK = 1e-6;
const IMPACT_WINDOW_STEPS = 2;

const positionAt = (body: Body, t: number): Vec3 => body.poseAt(t).position;

export const teleports = (body: Body, opts: PlausibilityOptions) => {
  const times = sampleTimes(opts.hz, opts.from ?? 0, opts.to);
  const flagged: { t: number; distance: number }[] = [];
  const allowed = body.maxSpeed / opts.hz + TELEPORT_SLACK;
  for (let i = 1; i < times.length; i++) {
    const a = positionAt(body, times[i - 1]);
    const b = positionAt(body, times[i]);
    const distance = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
    if (distance > allowed) flagged.push({ t: times[i], distance });
  }
  return flagged;
};

export const roughMotion = (body: Body, opts: PlausibilityOptions) => {
  const from = opts.from ?? 0;
  const requested = opts.to;
  const checked = body.motion === "kinematic" || body.hovering;
  const to =
    body.motion === "simulated" && body.release
      ? Math.min(requested, body.release.at)
      : requested;
  if (!checked || body.motion === "static") return [];
  const dt = 1 / opts.hz;
  const flagged: { t: number; accel: number }[] = [];
  for (const t of sampleTimes(opts.hz, from, to)) {
    if (t - dt < from - TELEPORT_SLACK || t + dt > to + TELEPORT_SLACK) continue;
    if (
      body.impacts.some((at) => Math.abs(at - t) <= IMPACT_WINDOW_STEPS * dt)
    )
      continue;
    const before = positionAt(body, t - dt);
    const now = positionAt(body, t);
    const after = positionAt(body, t + dt);
    const accel =
      Math.hypot(
        after[0] - 2 * now[0] + before[0],
        after[1] - 2 * now[1] + before[1],
        after[2] - 2 * now[2] + before[2],
      ) /
      (dt * dt);
    if (accel > body.maxAccel * (1 + ACCEL_SLACK)) flagged.push({ t, accel });
  }
  return flagged;
};
