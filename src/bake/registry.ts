import type { Scene } from "../world/body";

export const BAKES: readonly {
  readonly id: string;
  readonly scene: () => Scene;
}[] = [];
