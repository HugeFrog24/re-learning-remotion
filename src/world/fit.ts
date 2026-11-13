import { contacts, deepest, smallestClearing } from "../physics/collision";
import { toObb, type Pose } from "./geometry";
import { tileBoxes } from "./pins";
import { candidateOffsets } from "./scan";
import { stencilBoxes, type Stencil } from "./stencil";
import { checkSpan, poseOver, tilePose, tileTop, type Tape } from "./tape";
import { PIN_PROTRUSION, TOUCH_EPSILON } from "./units";

export const seatedBottom = (tape: Tape): number =>
  tileTop(tape) + PIN_PROTRUSION;

export const stencilPose = (tape: Tape, index: number, bottomY: number): Pose =>
  poseOver(tape, index, bottomY);

const penetrationAt = (tape: Tape, stencil: Stencil, index: number) => {
  checkSpan(tape, index, stencil.length);
  const tiles = stencil.flatMap((_, cell) =>
    tileBoxes(tape.bytes[index + cell]).map((local) =>
      toObb(local, tilePose(tape, index + cell)),
    ),
  );
  const boxes = stencilBoxes(stencil);
  return (bottomY: number) => {
    const pose = stencilPose(tape, index, bottomY);
    const shapes = boxes.map((local) => toObb(local, pose));
    return Math.max(0, deepest(contacts(shapes, tiles)) - TOUCH_EPSILON);
  };
};

export const fitsAt = (tape: Tape, stencil: Stencil, index: number): boolean =>
  penetrationAt(tape, stencil, index)(seatedBottom(tape)) === 0;

export const seatsOf = (tape: Tape, stencil: Stencil): number[] =>
  candidateOffsets(tape.bytes.length, stencil.length).filter((index) =>
    fitsAt(tape, stencil, index),
  );

export const restBottom = (
  tape: Tape,
  stencil: Stencil,
  index: number,
): number => {
  const penetration = penetrationAt(tape, stencil, index);
  const seated = seatedBottom(tape);
  return (
    seated +
    smallestClearing(
      (lift) => penetration(seated + lift),
      2 * PIN_PROTRUSION,
      PIN_PROTRUSION / 4,
    )
  );
};
