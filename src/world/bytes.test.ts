import { describe, expect, test } from "vitest";
import { BYTE_VALUES, bitsOf, byteOfBits, hex2, parsePattern } from "./bytes";

describe("bytes", () => {
  test("bitsOf lists the most significant bit first", () => {
    expect(bitsOf(0xf3)).toEqual([1, 1, 1, 1, 0, 0, 1, 1]);
  });

  test("byteOfBits inverts bitsOf for every byte", () => {
    expect(BYTE_VALUES.filter((b) => byteOfBits(bitsOf(b)) !== b)).toEqual([]);
  });

  test("hex2 pads to two uppercase digits", () => {
    expect(hex2(0x0f)).toBe("0F");
  });

  test("parsePattern reads bytes and wildcards", () => {
    expect(parsePattern("F3 0F 5C C1 F3 0F 11 41 ?? E8 ?? ?? ?? ??")).toEqual([
      0xf3, 0x0f, 0x5c, 0xc1, 0xf3, 0x0f, 0x11, 0x41, null, 0xe8, null, null,
      null, null,
    ]);
  });

  test("parsePattern rejects a non-hex token", () => {
    expect(() => parsePattern("F3 G0")).toThrow();
  });

  test("bitsOf rejects values outside a byte", () => {
    expect(() => bitsOf(256)).toThrow(RangeError);
  });
});
