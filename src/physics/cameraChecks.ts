import { Vector3 } from "three";
import { cameraFor, nearPlaneCorners } from "../render/lens";
import { cameraAt, type CameraSetup, type Shot } from "../world/camera";
import {
  reachOf,
  solidsAt,
  staticBody,
  type Body,
  type Scene,
} from "../world/body";
import { IDENTITY_POSE, type Vec3 } from "../world/geometry";
import { contacts, sphere } from "./collision";
import { roughMotion, teleports } from "./plausibility";
import { sampleTimes } from "./sweep";

export const CAMERA_CLEARANCE = 0.03;
export const CAMERA_MAX_SPEED = 0.5;
export const CAMERA_MAX_ACCEL = 2;
export const CAMERA_MAX_TURN_RATE = 0.5;
export const CAMERA_MAX_TURN_ACCEL = 2;
export const CAMERA_MAX_FOV_RATE = 10;
export const CAMERA_MAX_ROLL_RATE = 0.2;
export const NEAR_PLANE = "near plane";

type CameraPart = "position" | "target" | "view" | "fov" | "roll";

type Channel = {
  readonly part: CameraPart;
  readonly along: (setup: CameraSetup) => Vec3;
  readonly maxRate: number;
  readonly maxAccel?: number;
};

const viewDirection = ({ position, target }: CameraSetup): Vec3 => {
  const [x, y, z] = target.map((value, i) => value - position[i]);
  const length = Math.hypot(x, y, z);
  return [x / length, y / length, z / length];
};

const CHANNELS: readonly Channel[] = [
  {
    part: "position",
    along: (setup) => setup.position,
    maxRate: CAMERA_MAX_SPEED,
    maxAccel: CAMERA_MAX_ACCEL,
  },
  {
    part: "target",
    along: (setup) => setup.target,
    maxRate: CAMERA_MAX_SPEED,
    maxAccel: CAMERA_MAX_ACCEL,
  },
  {
    part: "view",
    along: viewDirection,
    maxRate: CAMERA_MAX_TURN_RATE,
    maxAccel: CAMERA_MAX_TURN_ACCEL,
  },
  { part: "fov", along: (setup) => [setup.fov, 0, 0], maxRate: CAMERA_MAX_FOV_RATE },
  { part: "roll", along: (setup) => [setup.roll, 0, 0], maxRate: CAMERA_MAX_ROLL_RATE },
];

export type RoughCamera = {
  readonly shot: string;
  readonly part: CameraPart;
  readonly t: number;
} & ({ readonly rate: number } | { readonly accel: number });

export const roughCamera = (shot: Shot, hz: number): RoughCamera[] => {
  const opts = { hz, from: shot.from, to: shot.to };
  return CHANNELS.flatMap(({ part, along, maxRate, maxAccel }) => {
    const track: Body = {
      ...staticBody(`camera-${shot.name}-${part}`, [], IDENTITY_POSE),
      motion: "kinematic",
      maxSpeed: maxRate,
      maxAccel: maxAccel ?? Infinity,
      poseAt: (t) => ({
        position: along(shot.at(t)),
        quaternion: IDENTITY_POSE.quaternion,
      }),
    };
    const name = { shot: shot.name, part };
    return [
      ...teleports(track, opts).map(({ t, distance }) => ({
        ...name,
        t,
        rate: distance * hz,
      })),
      ...(maxAccel === undefined
        ? []
        : roughMotion(track, opts).map(({ t, accel }) => ({ ...name, t, accel }))),
    ];
  });
};

const nearPlaneReach = (setup: CameraSetup): number => {
  const camera = cameraFor(setup);
  return Math.max(
    ...nearPlaneCorners(camera).map((corner) =>
      corner.distanceTo(camera.position),
    ),
  );
};

export const cameraClearance = (
  scene: Scene,
  opts: { hz: number },
): { t: number; against: string; depth: number }[] => {
  const found: { t: number; against: string; depth: number }[] = [];
  const reaches = scene.bodies.map(
    (body) => [body, reachOf(body) + CAMERA_CLEARANCE] as const,
  );
  for (const t of sampleTimes(opts.hz, 0, scene.duration)) {
    const setup = cameraAt(scene.shots, t);
    const nearReach = nearPlaneReach(setup);
    if (nearReach > CAMERA_CLEARANCE) {
      found.push({ t, against: NEAR_PLANE, depth: nearReach - CAMERA_CLEARANCE });
    }
    const [x, y, z] = setup.position;
    const lens = sphere("camera", new Vector3(x, y, z), CAMERA_CLEARANCE);
    const solids = reaches
      .filter(([body, reach]) => {
        const [bx, by, bz] = body.poseAt(t).position;
        return Math.hypot(bx - x, by - y, bz - z) <= reach;
      })
      .flatMap(([body]) => solidsAt(body, t));
    for (const contact of contacts([lens], solids)) {
      found.push({ t, against: contact.b, depth: contact.depth });
    }
  }
  return found;
};
