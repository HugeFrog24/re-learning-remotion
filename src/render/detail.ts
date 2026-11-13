export type Picture = {
  readonly rgba: Uint8Array;
  readonly width: number;
  readonly height: number;
};

export type Region = {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
};

export type Quad = readonly (readonly [x: number, y: number])[];

const CHANNELS = 3;

export const insideQuad = (quad: Quad, x: number, y: number): boolean => {
  const sides = quad.map(([ax, ay], i) => {
    const [bx, by] = quad[(i + 1) % quad.length];
    return (bx - ax) * (y - ay) - (by - ay) * (x - ax);
  });
  return sides.every((side) => side >= 0) || sides.every((side) => side <= 0);
};

const blank = ({ width, height }: Region): Picture => ({
  rgba: new Uint8Array(width * height * 4),
  width,
  height,
});

export const crop = (picture: Picture, region: Region): Picture => {
  const out = blank(region);
  for (let y = 0; y < region.height; y++) {
    const from = ((region.y + y) * picture.width + region.x) * 4;
    out.rgba.set(
      picture.rgba.subarray(from, from + region.width * 4),
      y * region.width * 4,
    );
  }
  return out;
};

const taps = (at: number, factor: number, size: number) => {
  const source = (at + 0.5) / factor - 0.5;
  const low = Math.floor(source);
  const clamp = (i: number) => Math.min(size - 1, Math.max(0, i));
  return { a: clamp(low), b: clamp(low + 1), f: source - low };
};

export const enlarge = (
  picture: Picture,
  factor: number,
  region: Region,
): Picture => {
  const out = blank(region);
  const { rgba, width, height } = picture;
  for (let y = 0; y < region.height; y++) {
    const row = taps(region.y + y, factor, height);
    for (let x = 0; x < region.width; x++) {
      const col = taps(region.x + x, factor, width);
      const at = (py: number, px: number, c: number) =>
        rgba[(py * width + px) * 4 + c];
      for (let c = 0; c < 4; c++) {
        const top = at(row.a, col.a, c) * (1 - col.f) + at(row.a, col.b, c) * col.f;
        const bottom =
          at(row.b, col.a, c) * (1 - col.f) + at(row.b, col.b, c) * col.f;
        out.rgba[(y * region.width + x) * 4 + c] = Math.round(
          top * (1 - row.f) + bottom * row.f,
        );
      }
    }
  }
  return out;
};

const stepEnergy = (rgba: Uint8Array, i: number, j: number) => {
  let sum = 0;
  for (let c = 0; c < CHANNELS; c++) sum += (rgba[i + c] - rgba[j + c]) ** 2;
  return sum;
};

export const subBlockEnergy = (
  picture: Picture,
  factor: number,
  keep: (x: number, y: number) => boolean = () => true,
): number => {
  const { rgba, width, height } = picture;
  let sum = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (!keep(x, y)) continue;
      const i = (y * width + x) * 4;
      if ((x + 1) % factor !== 0 && x + 1 < width && keep(x + 1, y)) {
        sum += stepEnergy(rgba, i, i + 4);
      }
      if ((y + 1) % factor !== 0 && y + 1 < height && keep(x, y + 1)) {
        sum += stepEnergy(rgba, i, i + width * 4);
      }
    }
  }
  return sum;
};

export const quadRegion = (quad: Quad, factor: number): Region => {
  const xs = quad.map(([x]) => x);
  const ys = quad.map(([, y]) => y);
  const [left, top] = [Math.floor(Math.min(...xs)), Math.floor(Math.min(...ys))];
  const [right, bottom] = [Math.ceil(Math.max(...xs)), Math.ceil(Math.max(...ys))];
  return {
    x: left * factor,
    y: top * factor,
    width: (right - left) * factor,
    height: (bottom - top) * factor,
  };
};

export const detailRatio = (
  big: Picture,
  base: Picture,
  factor: number,
  quads: readonly Quad[],
): { real: number; enlarged: number; ratio: number } => {
  let real = 0;
  let enlarged = 0;
  for (const quad of quads) {
    const region = quadRegion(quad, factor);
    const keep = (x: number, y: number) =>
      insideQuad(
        quad,
        (region.x + x + 0.5) / factor,
        (region.y + y + 0.5) / factor,
      );
    real += subBlockEnergy(crop(big, region), factor, keep);
    enlarged += subBlockEnergy(enlarge(base, factor, region), factor, keep);
  }
  return { real, enlarged, ratio: real / enlarged };
};
