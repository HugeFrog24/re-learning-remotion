import { bitsOf, byteOfBits } from "./bytes";
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
const PLATE = "plate-c";
const RIM = "rim-c";
const BLOCKER = "blocker-c";
const STENCIL_BOX = /^(plate|rim|blocker)-c\d+/;

const plateLayer = (name: string, x: number, z: number, depth: number) =>
  box(
    name,
    [x, STENCIL_PLATE_THICKNESS / 2, z],
    [TILE_PITCH, STENCIL_PLATE_THICKNESS, depth],
  );

const solidCell = (cell: number, x: number, byte: number): LocalBox[] => [
  plateLayer(`${PLATE}${cell}`, x, 0, TILE_SIZE),
  ...bitsOf(byte).map((bit, row) =>
    box(
      `${BLOCKER}${cell}-r${row}`,
      [x - slotX(bit), -PIN_PROTRUSION / 2, rowZ(row)],
      [BLOCKER_SIZE, PIN_PROTRUSION, BLOCKER_SIZE],
    ),
  ),
];

const wildcardCell = (cell: number, x: number): LocalBox[] => [
  plateLayer(`${RIM}${cell}-a`, x, -RIM_Z, RIM_WIDTH),
  plateLayer(`${RIM}${cell}-b`, x, RIM_Z, RIM_WIDTH),
];

export const stencilBoxes = (stencil: Stencil): readonly LocalBox[] =>
  stencil.flatMap((byte, cell) =>
    byte === null
      ? wildcardCell(cell, cell * TILE_PITCH)
      : solidCell(cell, cell * TILE_PITCH, byte),
  );

export const isStencil = (boxes: readonly LocalBox[]): boolean =>
  boxes.length > 0 && boxes.every((each) => STENCIL_BOX.test(each.name));

export const plateCell = (each: LocalBox): number | null =>
  each.name.startsWith(PLATE) ? Number(each.name.slice(PLATE.length)) : null;

export const stencilOf = (boxes: readonly LocalBox[]): Stencil => {
  const named = new Map(boxes.map((each) => [each.name, each]));
  const cells: (number | null)[] = [];
  for (
    let cell = 0;
    named.has(`${PLATE}${cell}`) || named.has(`${RIM}${cell}-a`);
    cell++
  ) {
    const plate = named.get(`${PLATE}${cell}`);
    cells.push(
      plate
        ? byteOfBits(
            bitsOf(0).map((_, row) => {
              const blocker = named.get(`${BLOCKER}${cell}-r${row}`);
              if (!blocker) throw new Error(`cell ${cell} lacks row ${row}`);
              return blocker.center[0] < plate.center[0] ? 1 : 0;
            }),
          )
        : null,
    );
  }
  return cells;
};
