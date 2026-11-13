import type { CameraSetup, Shot } from "../../world/camera";
import { poseOver, tileTop } from "../../world/tape";
import {
  eased,
  MATCH_INDEX,
  OPENING_HOLD,
  RELEASE_AT,
  START_INDEX,
  STENCIL_SEAT_SECONDS,
} from "./choreography";
import { TAPE } from "./initialState";

const DEGREE = Math.PI / 180;
const FOV = 30;
const ELEVATION = 36 * DEGREE;

type Framing = {
  readonly yaw: number;
  readonly distance: number;
  readonly cell: number;
};

const WIDE: Framing = { yaw: 55 * DEGREE, distance: 1.6, cell: 5.5 };
const FOLLOW: Framing = { yaw: 42 * DEGREE, distance: 0.45, cell: 0.5 };

const aim = (index: number, { yaw, distance, cell }: Framing): CameraSetup => {
  const focus = poseOver(TAPE, index + cell, tileTop(TAPE)).position;
  const [x, y, z] = focus;
  const across = distance * Math.cos(ELEVATION);
  return {
    position: [
      x - across * Math.sin(yaw),
      y + distance * Math.sin(ELEVATION),
      z + across * Math.cos(yaw),
    ],
    target: focus,
    fov: FOV,
    roll: 0,
  };
};

export const stencilSeatShots = (): readonly Shot[] => {
  const wide = aim(START_INDEX, WIDE);
  const pan = eased([
    { at: OPENING_HOLD, values: [START_INDEX] },
    { at: RELEASE_AT, values: [MATCH_INDEX] },
  ]);
  return [
    { name: "wide", from: 0, to: OPENING_HOLD, at: () => wide },
    {
      name: "follow",
      from: OPENING_HOLD,
      to: STENCIL_SEAT_SECONDS,
      at: (t) => aim(pan(t)[0], FOLLOW),
    },
  ];
};
