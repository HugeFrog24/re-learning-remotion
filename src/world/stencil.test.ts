import { describe, expect, test } from "vitest";
import { BYTE_VALUES, hex2, parsePattern } from "./bytes";
import { fitsAt, restBottom, seatedBottom } from "./fit";
import { DEMO_TAPE, FUNCTION_START, SCAN_MATCH } from "./listing";
import { matchOffsets } from "./scan";
import type { Stencil } from "./stencil";
import { addressOf, indexOf, tapeOf, type Tape } from "./tape";
import { PIN_PROTRUSION } from "./units";

const single = (byte: number): Tape => ({
  base: 0n,
  bytes: [byte],
  origin: [0, 0, 0],
});

const seats = (tape: Tape, stencil: Stencil) =>
  Array.from(
    { length: tape.bytes.length - stencil.length + 1 },
    (_, i) => i,
  ).filter((i) => fitsAt(tape, stencil, i));

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
    const scan = parsePattern("F3 0F 5C C1 F3 0F 11 41 ?? E8 ?? ?? ?? ??");
    const found = seats(tape, scan);
    expect(found).toEqual([indexOf(tape, SCAN_MATCH)]);
    expect(found).toEqual(matchOffsets(tape.bytes, scan));
    const short = seats(tape, parsePattern("CC 48 83 EC ??"));
    expect(short).toHaveLength(1);
    expect(addressOf(tape, short[0] + 1)).toBe(FUNCTION_START);
  });

  test("fitsAt rejects a stencil that overhangs the tape", () => {
    expect(() => fitsAt(single(0xf3), [0xf3, 0x0f], 0)).toThrow(RangeError);
    expect(() => fitsAt(single(0xf3), [0xf3], -1)).toThrow(RangeError);
  });
});
