import { loadFont } from "@remotion/google-fonts/JetBrainsMono";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useDelayRender } from "remotion";
import { CanvasTexture, SRGBColorSpace } from "three";
import { GLYPH } from "./look";

const WEIGHT = "700";
const CAP_HEIGHT_PER_EM = 0.73;
const ADVANCE_PER_EM = 0.6;
const GLYPH_CHARACTERS = 2;

export const GLYPH_TEXT_HEIGHT = GLYPH.em * CAP_HEIGHT_PER_EM;
export const GLYPH_TEXT_WIDTH = GLYPH.em * ADVANCE_PER_EM * GLYPH_CHARACTERS;

export type FacePaint = {
  readonly width: number;
  readonly height: number;
  readonly ground: string;
  readonly border?: { readonly width: number; readonly color: string };
  readonly stripe?: { readonly height: number; readonly color: string };
  readonly text?: {
    readonly glyph: string;
    readonly color: string;
    readonly em: number;
  };
};

export type Faces = (face: FacePaint) => CanvasTexture;

export const paintFace = (
  face: FacePaint,
  family: string,
  texels: number,
): CanvasTexture => {
  const perMetre = texels / Math.max(face.width, face.height);
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(face.width * perMetre));
  canvas.height = Math.max(1, Math.round(face.height * perMetre));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("glyph textures need a 2D canvas");
  ctx.fillStyle = face.ground;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  if (face.stripe) {
    ctx.fillStyle = face.stripe.color;
    ctx.fillRect(0, 0, canvas.width, face.stripe.height * perMetre);
  }
  if (face.border) {
    ctx.strokeStyle = face.border.color;
    ctx.lineWidth = 2 * face.border.width * perMetre;
    ctx.strokeRect(0, 0, canvas.width, canvas.height);
  }
  if (face.text) {
    ctx.fillStyle = face.text.color;
    ctx.font = `${WEIGHT} ${face.text.em * perMetre}px "${family}"`;
    ctx.textAlign = "center";
    ctx.textBaseline = "alphabetic";
    const ink = ctx.measureText(face.text.glyph);
    ctx.fillText(
      face.text.glyph,
      canvas.width / 2,
      (canvas.height +
        ink.actualBoundingBoxAscent -
        ink.actualBoundingBoxDescent) /
        2,
    );
  }
  const texture = new CanvasTexture(canvas);
  texture.colorSpace = SRGBColorSpace;
  return texture;
};

export const useGlyphFont = (): string | null => {
  const { delayRender, continueRender, cancelRender } = useDelayRender();
  const [family, setFamily] = useState<string | null>(null);

  useLayoutEffect(() => {
    const hold = delayRender("Loading the glyph font");
    let held = true;
    const release = () => {
      if (!held) return;
      held = false;
      continueRender(hold);
    };
    const font = loadFont("normal", { weights: [WEIGHT], subsets: ["latin"] });
    font
      .waitUntilDone()
      .then(() => {
        setFamily(font.fontFamily);
        release();
      })
      .catch((error: unknown) => cancelRender(error));
    return release;
  }, [delayRender, continueRender, cancelRender]);

  return family;
};

export const useFaces = (family: string, texels: number): Faces => {
  const faces = useMemo(() => {
    const painted = new Map<string, CanvasTexture>();
    return {
      paint: (face: FacePaint) => {
        const key = JSON.stringify(face);
        const known = painted.get(key);
        if (known) return known;
        const made = paintFace(face, family, texels);
        painted.set(key, made);
        return made;
      },
      dispose: () => painted.forEach((texture) => texture.dispose()),
    };
  }, [family, texels]);

  useEffect(() => faces.dispose, [faces]);

  return faces.paint;
};
