import { describe, expect, test } from "vitest";
import { contacts } from "../physics/collision";
import { BYTE_VALUES, hex2 } from "./bytes";
import { toObb } from "./geometry";
import { DEMO_TAPE } from "./listing";
import { byteOfPins, glyphOf, tileBoxes } from "./pins";
import { tapeOf, tilePose } from "./tape";
import { PIN_ROW_PITCH } from "./units";

describe("pins", () => {
  test("[ACC-05] pins encode exactly the tile's byte", () => {
    expect(
      BYTE_VALUES.filter(
        (b) =>
          byteOfPins(tileBoxes(b)) !== b ||
          glyphOf(b) !== hex2(b),
      ),
    ).toEqual([]);
    expect(
      BYTE_VALUES.filter((b) =>
        tileBoxes(b)
          .slice(1)
          .some((pin, r) => pin.center[2] !== (r - 3.5) * PIN_ROW_PITCH),
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
