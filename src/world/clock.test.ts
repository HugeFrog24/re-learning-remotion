import { expect, test } from "vitest";
import { STEADY, heldClock, storyTimeOfFrame } from "./clock";

const SAMPLES = Array.from({ length: 2000 }, (_, i) => i * 0.0173);

test("a steady clock is the film's own", () => {
  for (const t of SAMPLES) {
    expect(STEADY.storyAt(t)).toBe(t);
    expect(STEADY.filmAt(t)).toBe(t);
  }
  expect(STEADY.held).toBe(0);
});

test("a hold stops the story for its seconds while the film runs on", () => {
  const clock = heldClock([{ at: 2, seconds: 0.5 }]);
  expect(clock.held).toBe(0.5);
  expect(clock.storyAt(1.5)).toBe(1.5);
  expect(clock.storyAt(2)).toBe(2);
  expect(clock.storyAt(2.25)).toBe(2);
  expect(clock.storyAt(2.5)).toBeCloseTo(2, 12);
  expect(clock.storyAt(3.5)).toBeCloseTo(3, 12);
  expect(clock.filmAt(1.5)).toBe(1.5);
  expect(clock.filmAt(2)).toBe(2);
  expect(clock.filmAt(3)).toBeCloseTo(3.5, 12);
});

test("holds add up and film time round-trips story time", () => {
  const clock = heldClock([{ at: 5, seconds: 0.3 }, { at: 1, seconds: 0.2 }]);
  expect(clock.held).toBeCloseTo(0.5, 12);
  expect(clock.filmAt(4)).toBeCloseTo(4.2, 12);
  expect(clock.filmAt(6)).toBeCloseTo(6.5, 12);
  for (const story of SAMPLES) expect(clock.storyAt(clock.filmAt(story)), `${story}`).toBeCloseTo(story, 9);
  let last = -Infinity;
  for (const t of SAMPLES) {
    expect(clock.storyAt(t), `${t}`).toBeGreaterThanOrEqual(last - 1e-12);
    last = clock.storyAt(t);
  }
});

test("storyTimeOfFrame agrees at 24/30/50/60 fps at every half second", () => {
  for (const clock of [STEADY, heldClock([{ at: 2, seconds: 0.5 }])]) {
    for (let t = 0; t <= 10; t += 0.5) {
      const expected = clock.storyAt(t);
      for (const fps of [24, 30, 50, 60]) {
        expect(storyTimeOfFrame(t * fps, fps, clock)).toBe(expected);
      }
    }
  }
});
