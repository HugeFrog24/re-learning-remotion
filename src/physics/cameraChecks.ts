import { Vector3 } from "three";
import { cameraAt } from "../world/camera";
import { solidsAt, type Scene } from "../world/body";
import { contacts, sphere } from "./collision";

export const CAMERA_CLEARANCE = 0.03;
export const CAMERA_MAX_SPEED = 0.5;
export const CAMERA_MAX_ACCEL = 2;

export const cameraClearance = (
  scene: Scene,
  opts: { hz: number },
): { t: number; against: string; depth: number }[] => {
  const found: { t: number; against: string; depth: number }[] = [];
  const steps = Math.floor(scene.duration * opts.hz);
  for (let i = 0; i <= steps; i++) {
    const t = i / opts.hz;
    const [x, y, z] = cameraAt(scene.shots, t).position;
    const lens = sphere("camera", new Vector3(x, y, z), CAMERA_CLEARANCE);
    const solids = scene.bodies.flatMap((body) => solidsAt(body, t));
    for (const contact of contacts([lens], solids)) {
      found.push({ t, against: contact.b, depth: contact.depth });
    }
  }
  return found;
};
