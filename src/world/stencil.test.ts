import { describe, expect, test } from "vitest";
import { BYTE_VALUES, hex2, parsePattern } from "./bytes";
import { fitsAt, restBottom, seatedBottom, seatsOf } from "./fit";
import { DEMO_TAPE, FUNCTION_START, SCAN_MATCH, SCAN_PATTERN } from "./listing";
import { matchOffsets } from "./scan";
import { stencilBoxes } from "./stencil";
import { addressOf, indexOf, tapeOf, type Tape } from "./tape";
import { PIN_PROTRUSION, TILE_PITCH } from "./units";

const single = (byte: number): Tape => ({
  base: 0n,
  bytes: [byte],
  origin: [0, 0, 0],
});

describe("stencil", () => {
  test("[ACC-06] a cell fits only its own byte (all 256 × 256 pairs)", () => {
    const wrong = BYTE_VALUES.flatMap((a) =>
      BYTE_VALUES.filter((e) => fitsAt(single(a), [e], 0) !== (a === e)).map(
        (e) => `actual ${hex2(a)} expected ${hex2(e)}`,
      ),
    );
    expect(wrong).toEqual([]);
  });

  test("a wildcard cell fits every byte", () => {
    expect(BYTE_VALUES.filter((a) => !fitsAt(single(a), [null], 0))).toEqual([]);
  });

  test("rest height: seated on a match, one pin higher on a mismatch", () => {
    const seated = seatedBottom(single(0xf3));
    expect(Math.abs(restBottom(single(0xf3), [0xf3], 0) - seated)).toBeLessThan(
      1e-6,
    );
    expect(
      Math.abs(restBottom(single(0xf2), [0xf3], 0) - (seated + PIN_PROTRUSION)),
    ).toBeLessThan(1e-6);
  });

  test("[ACC-03] the scan pattern seats exactly once on the demo tape, at the subss; the short stencil seats once, before the function", () => {
    const tape = tapeOf(DEMO_TAPE, [0, 0, 0]);
    expect(tape.base).toBe(0x140012a20n);
    const scan = parsePattern(SCAN_PATTERN);
    const found = seatsOf(tape, scan);
    expect(found).toEqual([indexOf(tape, SCAN_MATCH)]);
    expect(found).toEqual(matchOffsets(tape.bytes, scan));
    const short = seatsOf(tape, parsePattern("CC 48 83 EC ??"));
    expect(short).toHaveLength(1);
    expect(addressOf(tape, short[0] + 1)).toBe(FUNCTION_START);
  });

  test("stencil plate layer is one continuous piece", () => {
    const stencil = parsePattern("CC 48 83 EC ??");
    const extents = stencilBoxes(stencil)
      .filter((box) => box.center[1] - box.size[1] / 2 >= 0)
      .map((box) => [
        box.center[0] - box.size[0] / 2,
        box.center[0] + box.size[0] / 2,
      ])
      .sort((a, b) => a[0] - b[0] || a[1] - b[1])
      .filter(
        (extent, i, all) =>
          i === 0 || extent[0] !== all[i - 1][0] || extent[1] !== all[i - 1][1],
      );
    expect(extents).toHaveLength(stencil.length);
    const ends = [
      extents[0][0] + TILE_PITCH / 2,
      extents[extents.length - 1][1] -
        ((stencil.length - 1) * TILE_PITCH + TILE_PITCH / 2),
      ...extents.slice(1).map((extent, i) => extent[0] - extents[i][1]),
    ];
    expect(ends.filter((gap) => Math.abs(gap) >= 1e-12)).toEqual([]);
  });

  test("fitsAt rejects a stencil that overhangs the tape", () => {
    expect(() => fitsAt(single(0xf3), [0xf3, 0x0f], 0)).toThrow(RangeError);
    expect(() => fitsAt(single(0xf3), [0xf3], -1)).toThrow(RangeError);
  });
});
