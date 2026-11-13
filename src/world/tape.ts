import { IDENTITY_POSE, type Pose, type Vec3 } from "./geometry";
import { tapeBytes, type ListingLine } from "./listing";
import { TILE_HEIGHT, TILE_PITCH } from "./units";

export type Tape = {
  readonly base: bigint;
  readonly bytes: readonly number[];
  readonly origin: Vec3;
};

export const tapeOf = (lines: readonly ListingLine[], origin: Vec3): Tape => {
  if (lines.length === 0) {
    throw new RangeError("a tape needs at least one listing line");
  }
  return { base: lines[0].address, bytes: tapeBytes(lines), origin };
};

export const checkSpan = (tape: Tape, index: number, length = 1) => {
  if (
    !Number.isInteger(index) ||
    index < 0 ||
    index + length > tape.bytes.length
  ) {
    throw new RangeError(
      `bytes ${index}…${index + length - 1} lie outside a tape of ${tape.bytes.length}`,
    );
  }
};

export const poseOver = (tape: Tape, index: number, y: number): Pose => ({
  position: [tape.origin[0] + index * TILE_PITCH, y, tape.origin[2]],
  quaternion: IDENTITY_POSE.quaternion,
});

export const tilePose = (tape: Tape, index: number): Pose => {
  checkSpan(tape, index);
  return poseOver(tape, index, tape.origin[1]);
};

export const tileTop = (tape: Tape): number => tape.origin[1] + TILE_HEIGHT;

export const indexOf = (tape: Tape, address: bigint): number => {
  const index = Number(address - tape.base);
  checkSpan(tape, index);
  return index;
};

export const addressOf = (tape: Tape, index: number): bigint => {
  checkSpan(tape, index);
  return tape.base + BigInt(index);
};

export const TILE_ID_PREFIX = "tile-";

export const tileId = (tape: Tape, index: number): string =>
  `${TILE_ID_PREFIX}${addressOf(tape, index).toString(16).toUpperCase()}`;
