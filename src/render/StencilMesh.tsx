import type { LocalBox } from "../world/geometry";
import { glyphOf } from "../world/pins";
import { plateCell, stencilOf } from "../world/stencil";
import { BoxesMesh, faceSize, OneFace, type BodyLook } from "./BoxesMesh";
import type { Faces } from "./glyphTexture";
import { CARDBOARD, PRINT, WHITE } from "./look";

const PRINTED_FACE = "py";

const printed = (box: LocalBox, glyph: string, faces: Faces) => {
  const [width, height] = faceSize(box.size, PRINTED_FACE);
  return faces({
    width,
    height,
    ground: CARDBOARD.color,
    text: { glyph, color: PRINT.ink, em: PRINT.em * Math.min(width, height) },
  });
};

export const StencilMesh: React.FC<BodyLook> = ({ faces, ...look }) => {
  const expected = stencilOf(look.boxes);
  return (
    <BoxesMesh
      {...look}
      castShadow
      receiveShadow
      paint={(box) => {
        const cell = plateCell(box);
        const byte = cell === null ? null : expected[cell];
        if (byte === null) return <meshStandardMaterial {...CARDBOARD} />;
        return (
          <OneFace
            look={CARDBOARD}
            face={PRINTED_FACE}
            special={{ color: WHITE, map: printed(box, glyphOf(byte), faces) }}
          />
        );
      }}
    />
  );
};
