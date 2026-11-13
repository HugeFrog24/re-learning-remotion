export const BASE_WIDTH = 1080;
export const BASE_HEIGHT = 1920;
export const FINEST_PIXEL_RATIO = 4;
export const CANVAS_DPR: readonly [1, 4] = [1, FINEST_PIXEL_RATIO];

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
  maxTextureSize = 16384,
): number =>
  capToGpu(GLYPH_TEXELS_1080 * textureTier(pixelRatio), maxTextureSize);

export const BLOOM_LEVELS_1080 = 6;

export const bloomLevels = (pixelRatio: number): number =>
  BLOOM_LEVELS_1080 + Math.log2(textureTier(pixelRatio));

export const bloomExtentFraction = (
  levels: number,
  pixelRatio: number,
): number => 2 ** levels / (BASE_HEIGHT * pixelRatio);

export const PIXEL_PARAMS_1080 = {
  reflectorBlur: 6,
} as const satisfies Readonly<Record<string, number>>;
