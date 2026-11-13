export const boxDownsample = (
  rgba: Uint8Array,
  width: number,
  height: number,
  factor: number,
): Uint8Array => {
  if (width % factor !== 0 || height % factor !== 0) {
    throw new Error(`${width}x${height} is not divisible by ${factor}`);
  }
  if (rgba.length !== width * height * 4) {
    throw new Error(`expected ${width * height * 4} bytes, got ${rgba.length}`);
  }
  const outW = width / factor;
  const outH = height / factor;
  const out = new Uint8Array(outW * outH * 4);
  const count = factor * factor;
  for (let y = 0; y < outH; y++) {
    for (let x = 0; x < outW; x++) {
      for (let c = 0; c < 4; c++) {
        let sum = 0;
        for (let dy = 0; dy < factor; dy++) {
          const row = ((y * factor + dy) * width + x * factor) * 4 + c;
          for (let dx = 0; dx < factor; dx++) sum += rgba[row + dx * 4];
        }
        out[(y * outW + x) * 4 + c] = Math.round(sum / count);
      }
    }
  }
  return out;
};

export type ImageDiff = { meanAbs: number; worstBlock: number };

export type BlockSpot = { x: number; y: number };

export const compareImages = (
  a: Uint8Array,
  b: Uint8Array,
  width: number,
  height: number,
  block = 64,
): ImageDiff & { worstAt: BlockSpot } => {
  const expected = width * height * 4;
  if (a.length !== expected || b.length !== expected) {
    throw new Error(
      `expected ${expected} bytes, got ${a.length} and ${b.length}`,
    );
  }
  let total = 0;
  let worstBlock = 0;
  let worstAt = { x: 0, y: 0 };
  for (let by = 0; by < height; by += block) {
    for (let bx = 0; bx < width; bx += block) {
      let sum = 0;
      const yEnd = Math.min(by + block, height);
      const xEnd = Math.min(bx + block, width);
      for (let y = by; y < yEnd; y++) {
        for (let x = bx; x < xEnd; x++) {
          const i = (y * width + x) * 4;
          sum +=
            Math.abs(a[i] - b[i]) +
            Math.abs(a[i + 1] - b[i + 1]) +
            Math.abs(a[i + 2] - b[i + 2]);
        }
      }
      total += sum;
      const mean = sum / ((yEnd - by) * (xEnd - bx) * 3) / 255;
      if (mean > worstBlock) {
        worstBlock = mean;
        worstAt = { x: bx, y: by };
      }
    }
  }
  return { meanAbs: total / (width * height * 3) / 255, worstBlock, worstAt };
};
