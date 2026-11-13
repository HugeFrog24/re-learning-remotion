export type Hold = { readonly at: number; readonly seconds: number };

export type StoryClock = {
  storyAt(filmT: number): number;
  filmAt(storyT: number): number;
  readonly held: number;
};

export const heldClock = (holds: readonly Hold[]): StoryClock => {
  const sorted = [...holds].sort((a, b) => a.at - b.at);
  return {
    held: sorted.reduce((sum, hold) => sum + hold.seconds, 0),
    storyAt: (filmT) => {
      let held = 0;
      for (const hold of sorted) {
        if (filmT <= hold.at + held) return filmT - held;
        if (filmT < hold.at + held + hold.seconds) return hold.at;
        held += hold.seconds;
      }
      return filmT - held;
    },
    filmAt: (storyT) =>
      storyT +
      sorted
        .filter((hold) => hold.at < storyT)
        .reduce((sum, hold) => sum + hold.seconds, 0),
  };
};

export const STEADY = heldClock([]);

export const storyTimeOfFrame = (
  frame: number,
  fps: number,
  clock: StoryClock,
): number => clock.storyAt(frame / fps);
