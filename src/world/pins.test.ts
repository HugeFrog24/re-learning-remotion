import { describe, expect, test } from "vitest";
import { contacts } from "../physics/collision";
import { BYTE_VALUES, byteOfBits, hex2 } from "./bytes";
import { toObb } from "./geometry";
import { DEMO_TAPE } from "./listing";
import { glyphOf, pinBit, tileBoxes } from "./pins";
import { tapeOf, tilePose } from "./tape";

describe("pins", () => {
  test("[ACC-05] pins encode exactly the tile's byte", () => {
    expect(
      BYTE_VALUES.filter(
        (b) =>
          byteOfBits(tileBoxes(b).slice(1).map(pinBit)) !== b ||
          glyphOf(b) !== hex2(b),
      ),
    ).toEqual([]);
  });

  test("neighbouring tiles' pins never touch", () => {
    const tape = tapeOf(DEMO_TAPE, [0, 0, 0]);
    const pinsOf = (index: number) =>
      tileBoxes(tape.bytes[index])
        .slice(1)
        .map((box) => toObb(box, tilePose(tape, index)));
    for (let i = 0; i + 1 < tape.bytes.length; i++) {
      expect(contacts(pinsOf(i), pinsOf(i + 1)), `tiles ${i}, ${i + 1}`).toEqual(
        [],
      );
    }
  });
});
