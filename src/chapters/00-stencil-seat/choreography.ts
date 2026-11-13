import { restBottom, seatedBottom, stencilPose } from "../../world/fit";
import type { Pose } from "../../world/geometry";
import { SCAN, TAPE } from "./initialState";

export const START_INDEX = 17;
export const MATCH_INDEX = 25;
export const HOVER_LIFT = 0.02;
export const DIP_MARGIN = 1e-6;
export const RELEASE_LIFT = 0.003;

const MS = 1000;
const OPENING_HOLD_MS = 1000;
const SETTLE_MS = 2000;

export type Key = { readonly at: number; readonly values: readonly number[] };

const smoothstep = (u: number) => u * u * (3 - 2 * u);

export const eased = (keys: readonly Key[]) => {
  keys.forEach((key, i) => {
    if (i > 0 && !(key.at > keys[i - 1].at))
      throw new RangeError(
        `key ${i} at ${key.at} does not follow ${keys[i - 1].at}`,
      );
  });
  return (t: number): readonly number[] => {
    const next = keys.findIndex((key) => key.at > t);
    if (next === 0) return keys[0].values;
    if (next === -1) return keys[keys.length - 1].values;
    const a = keys[next - 1];
    const b = keys[next];
    const s = smoothstep((t - a.at) / (b.at - a.at));
    return a.values.map((value, i) => value + (b.values[i] - value) * s);
  };
};

type Level = "hover" | "dip" | "release";

const LIFTS: Record<Exclude<Level, "dip">, number> = {
  hover: HOVER_LIFT,
  release: RELEASE_LIFT,
};

type Move = {
  readonly ms: number;
  readonly index: number;
  readonly level: Level;
};

const probe = (k: number): Move[] => [
  { ms: 150, index: k, level: "dip" },
  { ms: 100, index: k, level: "dip" },
  { ms: 100, index: k, level: "hover" },
  { ms: 150, index: k + 1, level: "hover" },
  { ms: 50, index: k + 1, level: "hover" },
];

const PROBED = Array.from(
  { length: MATCH_INDEX - START_INDEX },
  (_, i) => START_INDEX + i,
);

const MOVES: readonly Move[] = [
  { ms: 0, index: START_INDEX, level: "hover" },
  { ms: OPENING_HOLD_MS, index: START_INDEX, level: "hover" },
  ...PROBED.flatMap(probe),
  { ms: 300, index: MATCH_INDEX, level: "release" },
];

const KEY_MS = MOVES.reduce<number[]>(
  (sums, move) => [...sums, (sums[sums.length - 1] ?? 0) + move.ms],
  [],
);

export const KEY_TIMES: readonly number[] = KEY_MS.map((ms) => ms / MS);
export const OPENING_HOLD = OPENING_HOLD_MS / MS;
export const RELEASE_AT = KEY_TIMES[KEY_TIMES.length - 1];
export const STENCIL_SEAT_SECONDS =
  (KEY_MS[KEY_MS.length - 1] + SETTLE_MS) / MS;

export const stencilHover = (): ((t: number) => Pose) => {
  const seated = seatedBottom(TAPE);
  const dips = PROBED.map((k) => restBottom(TAPE, SCAN, k) + DIP_MARGIN);
  const bottomOf = (move: Move) =>
    move.level === "dip"
      ? dips[move.index - START_INDEX]
      : seated + LIFTS[move.level];
  const path = eased(
    MOVES.map((move, i) => ({
      at: KEY_TIMES[i],
      values: [move.index, bottomOf(move)],
    })),
  );
  return (t) => {
    const [index, bottom] = path(t);
    return stencilPose(TAPE, index, bottom);
  };
};
