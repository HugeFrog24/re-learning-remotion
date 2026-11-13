export type Bit = 0 | 1;

const BIT_COUNT = 8;
const WILDCARD = "??";
const HEX_BYTE = /^[0-9A-F]{2}$/i;

export const BYTE_VALUES: readonly number[] = Array.from(
  { length: 0x100 },
  (_, byte) => byte,
);

const checkByte = (byte: number) => {
  if (!Number.isInteger(byte) || byte < 0 || byte > 0xff) {
    throw new RangeError(`not a byte: ${byte}`);
  }
};

export const bitsOf = (byte: number): readonly Bit[] => {
  checkByte(byte);
  return Array.from(
    { length: BIT_COUNT },
    (_, i) => ((byte >> (BIT_COUNT - 1 - i)) & 1) as Bit,
  );
};

export const byteOfBits = (bits: readonly Bit[]): number => {
  if (bits.length !== BIT_COUNT) {
    throw new RangeError(`expected ${BIT_COUNT} bits, got ${bits.length}`);
  }
  return bits.reduce<number>((byte, bit) => (byte << 1) | bit, 0);
};

export const hex2 = (byte: number): string => {
  checkByte(byte);
  return byte.toString(16).toUpperCase().padStart(2, "0");
};

export const parsePattern = (text: string): readonly (number | null)[] =>
  text
    .trim()
    .split(/\s+/)
    .map((token) => {
      if (token === WILDCARD) {
        return null;
      }
      if (!HEX_BYTE.test(token)) {
        throw new SyntaxError(`not a pattern byte: ${token}`);
      }
      return Number.parseInt(token, 16);
    });
