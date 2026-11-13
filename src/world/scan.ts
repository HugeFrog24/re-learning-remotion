import type { Stencil } from "./stencil";

export const matchOffsets = (
  bytes: readonly number[],
  pattern: Stencil,
): number[] =>
  Array.from(
    { length: Math.max(0, bytes.length - pattern.length + 1) },
    (_, i) => i,
  ).filter((i) =>
    pattern.every((expected, k) => expected === null || expected === bytes[i + k]),
  );
