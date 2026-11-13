export type ListingLine = {
  readonly address: bigint;
  readonly bytes: readonly number[];
  readonly text: string;
};

export const FUNCTION_START = 0x140012a30n;
export const SCAN_MATCH = 0x140012a39n;

const line = (
  address: bigint,
  bytes: readonly number[],
  text: string,
): ListingLine => ({ address, bytes, text });

const padding = (from: bigint, count: number): ListingLine[] =>
  Array.from({ length: count }, (_, i) =>
    line(from + BigInt(i), [0xcc], "int 3"),
  );

export const DEMO_TAPE: readonly ListingLine[] = [
  line(0x140012a20n, [0x48, 0x8b, 0xcb], "mov rcx, rbx"),
  line(0x140012a23n, [0x48, 0x83, 0xc4, 0x20], "add rsp, 20h"),
  line(0x140012a27n, [0x5b], "pop rbx"),
  line(0x140012a28n, [0xc3], "ret"),
  ...padding(0x140012a29n, 7),
  line(0x140012a30n, [0x48, 0x83, 0xec, 0x28], "sub rsp, 28h"),
  line(0x140012a34n, [0xf3, 0x0f, 0x10, 0x41, 0x10], "movss xmm0, [rcx+10h]"),
  line(0x140012a39n, [0xf3, 0x0f, 0x5c, 0xc1], "subss xmm0, xmm1"),
  line(0x140012a3dn, [0xf3, 0x0f, 0x11, 0x41, 0x10], "movss [rcx+10h], xmm0"),
  line(0x140012a42n, [0xe8, 0xb9, 0x2b, 0x00, 0x00], "call 140015600h"),
  line(0x140012a47n, [0x48, 0x83, 0xc4, 0x28], "add rsp, 28h"),
  line(0x140012a4bn, [0xc3], "ret"),
  ...padding(0x140012a4cn, 4),
];

export const PATCHED_SUBSS: readonly ListingLine[] = Array.from(
  { length: 4 },
  (_, i) => line(SCAN_MATCH + BigInt(i), [0x90], "nop"),
);

export const HOOKED_ENTRY: readonly ListingLine[] = [
  line(0x140012a30n, [0xe9, 0xcb, 0xd5, 0x07, 0x00], "jmp near ptr 140090000h"),
  line(0x140012a35n, [0x0f, 0x10, 0x41, 0x10], "movups xmm0, [rcx+10h]"),
];

export const UPDATED_STORE: readonly ListingLine[] = [
  line(0x140012a3dn, [0xf3, 0x0f, 0x11, 0x41, 0x14], "movss [rcx+14h], xmm0"),
];

export const tapeBytes = (lines: readonly ListingLine[]): number[] =>
  lines.flatMap((entry) => [...entry.bytes]);
