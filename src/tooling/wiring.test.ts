import { expect, test } from "vitest";
import { wiringOf } from "./wiring";

const SAMPLE = [
  'import { capToGpu, mirrorTarget } from "./resolution";',
  'import type { Scene } from "../world/body";',
  "const Mirror = () => {",
  "  const { ratio, maxTextureSize } = useRenderPixels();",
  "  const target = mirrorTarget(ratio,",
  "    maxTextureSize);",
  "  material.uniforms.blur.value = target.blurTexels;",
  "  const options = { textureWidth: target.width };",
  "  return <Bloom levels={bloom.levels} radius={2} name=\"glow\" />;",
  "};",
].join("\n");

test("the wiring reader sees imports, calls, JSX props, bindings and assignments, whatever the formatting", () => {
  const wiring = wiringOf(SAMPLE);
  expect(wiring.imports("./resolution")).toEqual(["capToGpu", "mirrorTarget"]);
  expect(wiring.calls("mirrorTarget")).toEqual([["ratio", "maxTextureSize"]]);
  expect(wiring.calls("useRenderPixels")).toEqual([[]]);
  expect(wiring.values("target")).toEqual([
    "mirrorTarget(ratio, maxTextureSize)",
  ]);
  expect(wiring.values("ratio")).toEqual(["useRenderPixels()"]);
  expect(wiring.values("material.uniforms.blur.value")).toEqual([
    "target.blurTexels",
  ]);
  expect(wiring.values("textureWidth")).toEqual(["target.width"]);
  expect(wiring.props("Bloom", "levels")).toEqual(["bloom.levels"]);
  expect(wiring.props("Bloom", "radius")).toEqual(["2"]);
  expect(wiring.props("Bloom", "name")).toEqual(['"glow"']);
  expect(wiring.props("Bloom", "missing")).toEqual([]);
  expect(wiring.names.has("maxTextureSize")).toBe(true);
  expect(wiring.names.has("cameraAt")).toBe(false);
});
