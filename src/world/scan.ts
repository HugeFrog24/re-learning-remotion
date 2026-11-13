import type { Stencil } from "./stencil";

export const candidateOffsets = (
  tapeLength: number,
  patternLength: number,
): number[] =>
  Array.from(
    { length: Math.max(0, tapeLength - patternLength + 1) },
    (_, i) => i,
  );

export const matchOffsets = (
  bytes: readonly number[],
  pattern: Stencil,
): number[] =>
  candidateOffsets(bytes.length, pattern.length).filter((i) =>
    pattern.every((expected, k) => expected === null || expected === bytes[i + k]),
  );
