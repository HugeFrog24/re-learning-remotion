import { Vector3 } from "three";
import { cameraFor, nearPlaneCorners } from "../render/lens";
import { cameraAt, type CameraSetup } from "../world/camera";
import { reachOf, solidsAt, type Scene } from "../world/body";
import { contacts, sphere } from "./collision";
import { sampleTimes } from "./sweep";

export const CAMERA_CLEARANCE = 0.03;
export const CAMERA_MAX_SPEED = 0.5;
export const CAMERA_MAX_ACCEL = 2;
export const NEAR_PLANE = "near plane";

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
