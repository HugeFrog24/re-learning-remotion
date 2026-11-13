import { stencilSeatScene } from "../chapters/00-stencil-seat/scene";
import type { Scene } from "../world/body";
import type { BakeTrack } from "../world/track";

export const BAKES: readonly {
  readonly id: string;
  readonly scene: (track: BakeTrack | null) => Scene;
}[] = [{ id: "stencil-seat", scene: stencilSeatScene }];
