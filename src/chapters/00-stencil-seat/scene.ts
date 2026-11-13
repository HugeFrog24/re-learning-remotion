import type { Scene } from "../../world/body";
import type { BakeTrack } from "../../world/track";
import { stencilSeatShots } from "./cameras";
import { RELEASE_AT, STENCIL_SEAT_SECONDS, stencilHover } from "./choreography";
import { fixedBodies, stencilBody } from "./initialState";

export const stencilSeatScene = (track: BakeTrack | null): Scene => ({
  id: "stencil-seat",
  duration: STENCIL_SEAT_SECONDS,
  bodies: [...fixedBodies(), stencilBody(RELEASE_AT, stencilHover(), track)],
  shots: stencilSeatShots(),
});
