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

const RIM_Z = TILE_SIZE / 2 - RIM_WIDTH / 2;

const plateLayer = (name: string, x: number, z: number, depth: number) =>
  box(
    name,
    [x, STENCIL_PLATE_THICKNESS / 2, z],
    [TILE_PITCH, STENCIL_PLATE_THICKNESS, depth],
  );

const solidCell = (cell: number, x: number, byte: number): LocalBox[] => [
  plateLayer(`plate-c${cell}`, x, 0, TILE_SIZE),
  ...bitsOf(byte).map((bit, row) =>
    box(
      `blocker-c${cell}-r${row}`,
      [x - slotX(bit), -PIN_PROTRUSION / 2, rowZ(row)],
      [BLOCKER_SIZE, PIN_PROTRUSION, BLOCKER_SIZE],
    ),
  ),
];

const wildcardCell = (cell: number, x: number): LocalBox[] => [
  plateLayer(`rim-c${cell}-a`, x, -RIM_Z, RIM_WIDTH),
  plateLayer(`rim-c${cell}-b`, x, RIM_Z, RIM_WIDTH),
];

export const stencilBoxes = (stencil: Stencil): readonly LocalBox[] =>
  stencil.flatMap((byte, cell) =>
    byte === null
      ? wildcardCell(cell, cell * TILE_PITCH)
      : solidCell(cell, cell * TILE_PITCH, byte),
  );
