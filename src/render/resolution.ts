export const BASE_WIDTH = 1080;
export const BASE_HEIGHT = 1920;
export const FINEST_PIXEL_RATIO = 4;

export const canvasDpr = (): [min: number, max: number] => [
  1,
  FINEST_PIXEL_RATIO,
];

export const inRenderPixels = (px1080: number, pixelRatio: number): number =>
  px1080 * pixelRatio;

export const textureTier = (pixelRatio: number): 1 | 2 | 4 => {
  const tier = Math.min(
    FINEST_PIXEL_RATIO,
    2 ** Math.ceil(Math.log2(Math.max(1, pixelRatio))),
  );
  return tier as 1 | 2 | 4;
};

export const capToGpu = (size: number, maxTextureSize: number): number =>
  Math.min(size, maxTextureSize);

export const GLYPH_TEXELS_1080 = 512;

export const glyphTextureSize = (
  pixelRatio: number,
  maxTextureSize: number,
): number =>
  capToGpu(GLYPH_TEXELS_1080 * textureTier(pixelRatio), maxTextureSize);

export const BLOOM_LEVELS_1080 = 6;
export const BLOOM_RADIUS = 0.85;

export const bloomConfig = (
  pixelRatio: number,
): { levels: number; radius: number; fineSteps: number } => {
  const fineSteps = Math.log2(textureTier(pixelRatio));
  return {
    levels: BLOOM_LEVELS_1080 + fineSteps,
    radius: BLOOM_RADIUS,
    fineSteps,
  };
};

export const bloomExtentFraction = (
  levels: number,
  pixelRatio: number,
): number => 2 ** levels / (BASE_HEIGHT * pixelRatio);

export const PIXEL_PARAMS_1080 = {
  reflectorBlur: 6,
} as const satisfies Readonly<Record<string, number>>;

export const mirrorTarget = (
  pixelRatio: number,
  maxTextureSize: number,
): { width: number; height: number; blurTexels: number } => {
  const wanted = BASE_HEIGHT * pixelRatio;
  const fit = capToGpu(wanted, maxTextureSize) / wanted;
  return {
    width: Math.round(BASE_WIDTH * pixelRatio * fit),
    height: Math.round(wanted * fit),
    blurTexels:
      inRenderPixels(PIXEL_PARAMS_1080.reflectorBlur, pixelRatio) * fit,
  };
};
