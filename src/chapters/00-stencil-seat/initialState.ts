import { staticBody, type Body, type Material } from "../../world/body";
import { parsePattern } from "../../world/bytes";
import { box, IDENTITY_POSE, type Pose, type Vec3 } from "../../world/geometry";
import { DEMO_TAPE, SCAN_PATTERN } from "../../world/listing";
import { tileBoxes } from "../../world/pins";
import { tapeOf, tileId, tilePose } from "../../world/tape";
import { releasedPose, type BakeTrack } from "../../world/track";
import { stencilBoxes } from "../../world/stencil";
import { TILE_PITCH, TILE_SIZE } from "../../world/units";

export const TAPE = tapeOf(DEMO_TAPE, [0, 0, 0]);
export const SCAN = parsePattern(SCAN_PATTERN);
export const STENCIL_ID = "stencil";

const CARDBOARD: Material = { density: 600, friction: 0.6, restitution: 0.05 };
const STENCIL_MAX_SPEED = 0.5;
const STENCIL_MAX_ACCEL = 12;

const RAIL_DEPTH = 0.01;
const RAIL_HALF_WIDTH = 0.03;
const FLOOR_HALF_SPAN = 3;
const FLOOR_DEPTH = 0.1;

const slab = (id: string, min: Vec3, max: Vec3): Body => {
  const [x, y, z] = min.map((low, i) => (low + max[i]) / 2);
  const [w, h, d] = min.map((low, i) => max[i] - low);
  return staticBody(id, [box("slab", [0, 0, 0], [w, h, d])], {
    position: [x, y, z],
    quaternion: IDENTITY_POSE.quaternion,
  });
};

export const fixedBodies = (): readonly Body[] => [
  ...TAPE.bytes.map((byte, index) =>
    staticBody(tileId(TAPE, index), tileBoxes(byte), tilePose(TAPE, index)),
  ),
  slab(
    "rail",
    [-TILE_SIZE / 2, -RAIL_DEPTH, -RAIL_HALF_WIDTH],
    [TAPE.bytes.length * TILE_PITCH, 0, RAIL_HALF_WIDTH],
  ),
  slab(
    "floor",
    [-FLOOR_HALF_SPAN, -RAIL_DEPTH - FLOOR_DEPTH, -FLOOR_HALF_SPAN],
    [FLOOR_HALF_SPAN, -RAIL_DEPTH, FLOOR_HALF_SPAN],
  ),
];

export const stencilBody = (
  releaseAt: number,
  hoverAt: (t: number) => Pose,
  track: BakeTrack | null,
): Body => {
  const release = { at: releaseAt, material: CARDBOARD, hoverAt };
  return {
    id: STENCIL_ID,
    motion: "simulated",
    hovering: true,
    maxSpeed: STENCIL_MAX_SPEED,
    maxAccel: STENCIL_MAX_ACCEL,
    impacts: [],
    localBoxes: stencilBoxes(SCAN),
    poseAt: releasedPose(STENCIL_ID, release, track),
    release,
  };
};
