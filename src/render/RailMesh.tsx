import { RectAreaLightUniformsLib } from "three/examples/jsm/lights/RectAreaLightUniformsLib.js";
import type { LocalBox } from "../world/geometry";
import { BoxesMesh, OneFace, type BodyLook } from "./BoxesMesh";
import { RAIL, TUBE, UNLIT, WHITE } from "./look";

RectAreaLightUniformsLib.init();

const TubeLight: React.FC<{ readonly box: LocalBox }> = ({ box }) => {
  const [cx, cy, cz] = box.center;
  const [sx, sy, sz] = box.size;
  return (
    <rectAreaLight
      position={[
        cx,
        cy + sy / 2 + TUBE.light.lift,
        cz + sz / 2 + TUBE.light.standoff,
      ]}
      rotation={[TUBE.light.tilt, 0, 0]}
      width={sx}
      height={TUBE.light.height}
      intensity={TUBE.light.intensity}
      color={TUBE.color}
    />
  );
};

export const RailMesh: React.FC<BodyLook> = ({ faces, ...look }) => (
  <BoxesMesh
    {...look}
    receiveShadow
    Fixture={TubeLight}
    paint={(box) => (
      <OneFace
        look={RAIL}
        face="pz"
        special={{
          emissive: WHITE,
          emissiveIntensity: TUBE.intensity,
          emissiveMap: faces({
            width: box.size[1],
            height: box.size[1],
            ground: UNLIT,
            stripe: { height: TUBE.height, color: TUBE.color },
          }),
        }}
      />
    )}
  />
);
