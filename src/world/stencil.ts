import { bitsOf } from "./bytes";
import { box, type LocalBox } from "./geometry";
import { rowZ, slotX } from "./pins";
import {
  BLOCKER_SIZE,
  PIN_PROTRUSION,
  RIM_WIDTH,
  STENCIL_PLATE_THICKNESS,
  TILE_PITCH,
  TILE_SIZE,
} from "./units";

export type Stencil = readonly (number | null)[];

const PLATE_Y = STENCIL_PLATE_THICKNESS / 2;
const RIM_Z = TILE_SIZE / 2 - RIM_WIDTH / 2;

const solidCell = (cell: number, x: number, byte: number): LocalBox[] => [
  box(
    `plate-c${cell}`,
    [x, PLATE_Y, 0],
    [TILE_SIZE, STENCIL_PLATE_THICKNESS, TILE_SIZE],
  ),
  ...bitsOf(byte).map((bit, row) =>
    box(
      `blocker-c${cell}-r${row}`,
      [x - slotX(bit), -PIN_PROTRUSION / 2, rowZ(row)],
      [BLOCKER_SIZE, PIN_PROTRUSION, BLOCKER_SIZE],
    ),
  ),
];

const wildcardCell = (cell: number, x: number): LocalBox[] =>
  (
    [
      ["a", -RIM_Z],
      ["b", RIM_Z],
    ] as const
  ).map(([side, z]) =>
    box(
      `rim-c${cell}-${side}`,
      [x, PLATE_Y, z],
      [TILE_SIZE, STENCIL_PLATE_THICKNESS, RIM_WIDTH],
    ),
  );

export const stencilBoxes = (stencil: Stencil): readonly LocalBox[] =>
  stencil.flatMap((byte, cell) =>
    byte === null
      ? wildcardCell(cell, cell * TILE_PITCH)
      : solidCell(cell, cell * TILE_PITCH, byte),
  );
