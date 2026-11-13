import { Color } from "three";
import type { LocalBox } from "../world/geometry";
import { byteOfPins, glyphOf, isPin, pinBit } from "../world/pins";
import {
  BoxesMesh,
  Faced,
  faceSize,
  type BodyLook,
  type Face,
} from "./BoxesMesh";
import type { FacePaint } from "./glyphTexture";
import { EDGE, GLASS, GLYPH, PIN_DARK, PIN_LIT, UNLIT, WHITE } from "./look";

const GLYPH_PAINT = new Color(GLYPH.color)
  .multiplyScalar(1 / EDGE.intensity)
  .getStyle();

const slabFace = (box: LocalBox, face: Face, glyph: string): FacePaint => {
  const [width, height] = faceSize(box.size, face);
  const edged = {
    width,
    height,
    ground: UNLIT,
    border: { width: EDGE.width, color: EDGE.color },
  };
  return face === "pz"
    ? { ...edged, text: { glyph, color: GLYPH_PAINT, em: GLYPH.em * height } }
    : edged;
};

export const TileMesh: React.FC<BodyLook> = ({ boxes, pose, faces }) => {
  const glyph = glyphOf(byteOfPins(boxes));
  return (
    <BoxesMesh
      boxes={boxes}
      pose={pose}
      castShadow
      receiveShadow
      paint={(box) =>
        isPin(box) ? (
          <meshStandardMaterial
            color={UNLIT}
            toneMapped={false}
            {...(pinBit(box) ? PIN_LIT : PIN_DARK)}
          />
        ) : (
          <Faced
            paint={(face, slot) => (
              <meshPhysicalMaterial
                attach={slot}
                {...GLASS}
                emissive={WHITE}
                emissiveIntensity={EDGE.intensity}
                emissiveMap={faces(slabFace(box, face, glyph))}
              />
            )}
          />
        )
      }
    />
  );
};
