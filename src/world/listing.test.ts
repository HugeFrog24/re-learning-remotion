import { describe, expect, it } from "vitest";
import {
  Decoder,
  DecoderOptions,
  Formatter,
  FormatterSyntax,
  MemorySizeOptions,
} from "iced-x86";
import {
  DEMO_TAPE,
  HOOKED_ENTRY,
  PATCHED_SUBSS,
  UPDATED_STORE,
  tapeBytes,
  type ListingLine,
} from "./listing";

const LISTINGS: Record<string, readonly ListingLine[]> = {
  DEMO_TAPE,
  PATCHED_SUBSS,
  HOOKED_ENTRY,
  UPDATED_STORE,
};

const decodeLine = (line: ListingLine) => {
  const decoder = new Decoder(
    64,
    Uint8Array.from(line.bytes),
    DecoderOptions.None,
  );
  decoder.ip = line.address;
  const instruction = decoder.decode();
  const formatter = new Formatter(FormatterSyntax.Masm);
  formatter.uppercaseHex = true;
  formatter.hexPrefix = "";
  formatter.hexSuffix = "h";
  formatter.spaceAfterOperandSeparator = true;
  formatter.memorySizeOptions = MemorySizeOptions.Never;
  formatter.branchLeadingZeros = false;
  const result = {
    length: instruction.length,
    text: formatter.format(instruction),
  };
  formatter.free();
  instruction.free();
  decoder.free();
  return result;
};

describe("listings", () => {
  it("[ACC-01] every listed byte string decodes to exactly its text", () => {
    for (const [name, lines] of Object.entries(LISTINGS)) {
      for (const line of lines) {
        const decoded = decodeLine(line);
        expect(decoded.length, `${name} ${line.address.toString(16)}`).toBe(
          line.bytes.length,
        );
        expect(decoded.text, `${name} ${line.address.toString(16)}`).toBe(
          line.text,
        );
      }
    }
  });

  it("[ACC-02] addresses follow instruction lengths", () => {
    for (const [name, lines] of Object.entries(LISTINGS)) {
      for (let i = 0; i + 1 < lines.length; i++) {
        expect(lines[i + 1].address, name).toBe(
          lines[i].address + BigInt(lines[i].bytes.length),
        );
      }
    }
    expect(DEMO_TAPE[0].address).toBe(0x140012a20n);
    expect(tapeBytes(DEMO_TAPE).length).toBe(48);
  });
});
