import type { CameraSetup, Shot } from "../../world/camera";
import { seatedBottom } from "../../world/fit";
import { TILE_PITCH } from "../../world/units";
import {
  eased,
  HOVER_LIFT,
  MATCH_INDEX,
  OPENING_HOLD,
  RELEASE_AT,
  START_INDEX,
  STENCIL_SEAT_SECONDS,
} from "./choreography";
import { SCAN, TAPE } from "./initialState";

const FOV = 30;
const ASPECT = 9 / 16;
const FILL = 0.9;
const RISE = 0.35;
const WIDE_MARGIN_TILES = 4;

const HALF_WIDTH_SLOPE = Math.tan(((FOV / 2) * Math.PI) / 180) * ASPECT;
const STENCIL_WIDTH = SCAN.length * TILE_PITCH;
const LOOK_Y = seatedBottom(TAPE) + HOVER_LIFT;

const centreOver = (index: number) =>
  TAPE.origin[0] + (index + (SCAN.length - 1) / 2) * TILE_PITCH;

const framing = (x: number, width: number): CameraSetup => {
  const distance = width / FILL / (2 * HALF_WIDTH_SLOPE);
  return {
    position: [
      x,
      LOOK_Y + RISE,
      TAPE.origin[2] + Math.sqrt(distance ** 2 - RISE ** 2),
    ],
    target: [x, LOOK_Y, TAPE.origin[2]],
    fov: FOV,
    roll: 0,
  };
};

export const stencilSeatShots = (): readonly Shot[] => {
  const wide = framing(
    centreOver(START_INDEX),
    STENCIL_WIDTH + 2 * WIDE_MARGIN_TILES * TILE_PITCH,
  );
  const pan = eased([
    { at: OPENING_HOLD, values: [centreOver(START_INDEX)] },
    { at: RELEASE_AT, values: [centreOver(MATCH_INDEX)] },
  ]);
  return [
    { name: "wide", from: 0, to: OPENING_HOLD, at: () => wide },
    {
      name: "follow",
      from: OPENING_HOLD,
      to: STENCIL_SEAT_SECONDS,
      at: (t) => framing(pan(t)[0], STENCIL_WIDTH),
    },
  ];
};
