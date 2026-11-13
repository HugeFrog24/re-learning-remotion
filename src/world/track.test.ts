import { describe, expect, it } from "vitest";
import type { Pose } from "./geometry";
import {
  encodePose,
  releasedPose,
  sampleTrack,
  type BakeTrack,
} from "./track";

const yaw = (angle: number) => [0, Math.sin(angle / 2), 0, Math.cos(angle / 2)];

const track: BakeTrack = {
  id: "t",
  hz: 30,
  from: 0.1,
  poses: {
    b: [
      [0, 0, 0, ...yaw(0)],
      [0.4, 0.2, -0.2, ...yaw(1)],
      [0.8, 0.2, -0.2, ...yaw(1.5)],
    ].flat(),
  },
};

const stored = (source: BakeTrack, k: number): Pose => {
  const step = source.poses.b.slice(7 * k, 7 * k + 7);
  return {
    position: [step[0], step[1], step[2]],
    quaternion: [step[3], step[4], step[5], step[6]],
  };
};

const stepTime = (k: number) => track.from + k / track.hz;

describe("sampleTrack", () => {
  it("returns the stored pose at step times", () => {
    for (const k of [0, 1, 2]) {
      expect(sampleTrack(track, "b", stepTime(k))).toEqual(stored(track, k));
    }
  });

  it("lerps the position and slerps the rotation at a half step", () => {
    const pose = sampleTrack(track, "b", stepTime(1.5));
    pose.position.forEach((value, i) =>
      expect(value).toBeCloseTo([0.6, 0.2, -0.2][i], 12),
    );
    pose.quaternion.forEach((value, i) =>
      expect(value).toBeCloseTo(yaw(1.25)[i], 12),
    );
    expect(Math.hypot(...pose.quaternion)).toBeCloseTo(1, 12);
  });

  it("clamps before the first step and after the last", () => {
    expect(sampleTrack(track, "b", track.from - 1)).toEqual(stored(track, 0));
    expect(sampleTrack(track, "b", stepTime(2) + 1)).toEqual(stored(track, 2));
  });

  it("random access order doesn't matter", () => {
    const long: BakeTrack = {
      id: "long",
      hz: 1,
      from: 0,
      poses: {
        b: Array.from({ length: 8 }, (_, k) => [
          k,
          k * k,
          -k,
          ...yaw(k / 4),
        ]).flat(),
      },
    };
    const times = [5, 1, 1.25, 4.5, 0.5];
    const visited = times.map((t) => sampleTrack(long, "b", t));
    const fresh = times.map((t) => sampleTrack(structuredClone(long), "b", t));
    expect(visited).toEqual(fresh);
    expect(visited[1]).toEqual(stored(long, 1));
  });

  it("rejects a body the track does not hold", () => {
    expect(() => sampleTrack(track, "missing", stepTime(0))).toThrow(/missing/);
  });
});

describe("encodePose", () => {
  it("rounds to 1e-7 and never writes a negative zero", () => {
    const encoded = encodePose({
      position: [0.12345678, -0.00000004, -1e-12],
      quaternion: [0, -0.70710678118, 0, 0.70710678118],
    });
    expect(encoded).toEqual([0.1234568, 0, 0, 0, -0.7071068, 0, 0.7071068]);
    expect(encoded.some((value) => Object.is(value, -0))).toBe(false);
  });
});

describe("releasedPose", () => {
  const release = {
    at: track.from,
    hoverAt: (t: number): Pose => ({
      position: [t, 1, 0],
      quaternion: [0, 0, 0, 1],
    }),
  };

  it("hovers before release and follows the track from release on", () => {
    const poseAt = releasedPose("b", release, track);
    expect(poseAt(0.05)).toEqual(release.hoverAt(0.05));
    expect(poseAt(release.at)).toEqual(stored(track, 0));
    expect(poseAt(stepTime(1))).toEqual(stored(track, 1));
  });

  it("refuses to pose a released body without a bake", () => {
    const poseAt = releasedPose("b", release, null);
    expect(poseAt(0.05)).toEqual(release.hoverAt(0.05));
    expect(() => poseAt(release.at)).toThrow(/b/);
  });
});
