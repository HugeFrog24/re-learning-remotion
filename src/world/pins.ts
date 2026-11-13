import { bitsOf, byteOfBits, hex2, type Bit } from "./bytes";
import { box, type LocalBox } from "./geometry";
import {
  PIN_PROTRUSION,
  PIN_ROW_PITCH,
  PIN_SIZE,
  PIN_SLOT_OFFSET,
  TILE_HEIGHT,
  TILE_SIZE,
} from "./units";

const PIN_FOOT = TILE_HEIGHT * 0.25;
const PIN_PREFIX = "pin-r";
const PIN_HEAD = TILE_HEIGHT + PIN_PROTRUSION;

export const rowZ = (row: number) => (row - 3.5) * PIN_ROW_PITCH;

export const slotX = (bit: Bit) => (bit ? PIN_SLOT_OFFSET : -PIN_SLOT_OFFSET);

export const tileBoxes = (byte: number): readonly LocalBox[] => [
  box("tile", [0, TILE_HEIGHT / 2, 0], [TILE_SIZE, TILE_HEIGHT, TILE_SIZE]),
  ...bitsOf(byte).map((bit, row) =>
    box(
      `${PIN_PREFIX}${row}`,
      [slotX(bit), (PIN_FOOT + PIN_HEAD) / 2, rowZ(row)],
      [PIN_SIZE, PIN_HEAD - PIN_FOOT, PIN_SIZE],
    ),
  ),
];

export const pinBit = (pin: LocalBox): Bit => {
  const x = pin.center[0];
  if (x !== slotX(0) && x !== slotX(1)) {
    throw new RangeError(`${pin.name} sits in no bit slot`);
  }
  return x === slotX(1) ? 1 : 0;
};

export const isPin = (box: LocalBox): boolean =>
  box.name.startsWith(PIN_PREFIX);

export const byteOfPins = (boxes: readonly LocalBox[]): number =>
  byteOfBits(boxes.filter(isPin).map(pinBit));

export const glyphOf = (byte: number): string => hex2(byte);
