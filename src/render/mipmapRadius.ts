import type { MipmapBlurPass } from "postprocessing";

export const POSTPROCESSING_VERSION = "6.39.6";

type Hookable = {
  setSize: (width: number, height: number) => void;
  radius: number;
};

type Hooked = {
  upsamplingMaterial: Hookable;
  upsamplingMipmaps: unknown[];
  render: MipmapBlurPass["render"];
};

export const mipWeights = (
  levels: number,
  radius: number,
  fineSteps: number,
): number[] => {
  const weights = new Array<number>(levels).fill(0);
  weights[levels - 1] = 1;
  for (let i = levels - 2; i >= 0; i--) {
    const r = i < fineSteps ? 1 : radius;
    for (let k = i + 1; k < levels; k++) weights[k] *= r;
    weights[i] += 1 - r;
  }
  return weights;
};

export const pinFineMipSteps = (
  pass: MipmapBlurPass,
  fineSteps: number,
  radius: number,
): void => {
  if (fineSteps <= 0) return;
  const hooked = pass as unknown as Hooked;
  const material = hooked.upsamplingMaterial;
  const setSize = material.setSize.bind(material);
  const render = hooked.render.bind(pass);
  let step = 0;
  material.setSize = (width, height) => {
    setSize(width, height);
    const fromFinest = hooked.upsamplingMipmaps.length - 1 - step;
    material.radius = fromFinest < fineSteps ? 1 : radius;
    step++;
  };
  hooked.render = (...args) => {
    step = 0;
    render(...args);
  };
};
