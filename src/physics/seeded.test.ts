import { expect, test } from "vitest";
import { seeded } from "./seeded";

const take = (rng: () => number, count: number) =>
  Array.from({ length: count }, () => rng());

test("the same seed gives the same first 1000 values", () => {
  expect(take(seeded(42), 1000)).toEqual(take(seeded(42), 1000));
});

test("every value lies in [0, 1)", () => {
  for (const value of take(seeded(3), 1000)) {
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(1);
  }
});

test("seeds 1 and 2 give different first values", () => {
  expect(seeded(1)()).not.toBe(seeded(2)());
});
