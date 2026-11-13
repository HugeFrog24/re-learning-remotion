import { expect, test } from "vitest";
import { unwired, wiringOf } from "./wiring";

const SAMPLE = `import { capToGpu, mirrorTarget } from "./resolution";
import type { Scene } from "../world/body";
const Mirror = () => {
  const { ratio, maxTextureSize } = useRenderPixels();
  const target = mirrorTarget(ratio,
    maxTextureSize);
  material.uniforms.blur.value = target.blurTexels;
  const options = { textureWidth: target.width };
  return <Bloom levels={bloom.levels} radius={2} name="glow" />;
};`;

test("the wiring reader sees imports, calls, JSX props, bindings and assignments, whatever the formatting", () => {
  expect(
    unwired(wiringOf(SAMPLE), {
      absent: ["cameraAt"],
      imports: { "./resolution": ["capToGpu", "mirrorTarget"] },
      calls: {
        mirrorTarget: [["ratio", "maxTextureSize"]],
        useRenderPixels: [[]],
      },
      values: {
        target: ["mirrorTarget(ratio, maxTextureSize)"],
        ratio: ["useRenderPixels()"],
        "material.uniforms.blur.value": ["target.blurTexels"],
        textureWidth: ["target.width"],
      },
      props: {
        "Bloom.levels": ["bloom.levels"],
        "Bloom.radius": ["2"],
        "Bloom.name": ['"glow"'],
        "Bloom.missing": [],
      },
    }),
  ).toEqual([]);
});

test("the wiring check names every mismatch", () => {
  expect(
    unwired(wiringOf(SAMPLE), {
      absent: ["maxTextureSize"],
      imports: { "./resolution": ["mirrorTarget"] },
      calls: { mirrorTarget: [["1", "maxTextureSize"]] },
      values: { textureWidth: ["1080"] },
      props: { "Bloom.levels": ["6"] },
    }),
  ).toEqual([
    "maxTextureSize is used",
    'import from ./resolution is ["capToGpu","mirrorTarget"], not ["mirrorTarget"]',
    'mirrorTarget() is [["ratio","maxTextureSize"]], not [["1","maxTextureSize"]]',
    'textureWidth is ["target.width"], not ["1080"]',
    '<Bloom.levels> is ["bloom.levels"], not ["6"]',
  ]);
});
