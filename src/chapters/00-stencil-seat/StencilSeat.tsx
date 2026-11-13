import bake from "../../bakes/stencil-seat.json";
import { SceneView } from "../../render/SceneView";
import type { Scene } from "../../world/body";
import { STEADY } from "../../world/clock";
import { stencilSeatScene } from "./scene";

export { STENCIL_SEAT_SECONDS } from "./choreography";

let built: Scene | null = null;

const scene = (): Scene => {
  built ??= stencilSeatScene(bake);
  return built;
};

export const StencilSeat: React.FC = () => (
  <SceneView scene={scene()} clock={STEADY} />
);
