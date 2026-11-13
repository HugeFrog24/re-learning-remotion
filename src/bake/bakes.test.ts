import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { expect, test } from "vitest";
import { sampleTimes } from "../physics/sweep";
import type { Scene } from "../world/body";
import { dropScene } from "./fixtures";
import { bakeInputs, inputHash, RAPIER_VERSION, SIM_HZ } from "./inputs";
import { BAKES } from "./registry";
import { simulate } from "./simulate";

type Manifest = Record<string, { inputHash: string }>;

const BAKE_DIR = new URL("../bakes/", import.meta.url);
const MANIFEST = new URL("manifest.json", BAKE_DIR);
const bakeFile = (id: string) => new URL(`${id}.json`, BAKE_DIR);

const readManifest = (): Manifest => JSON.parse(readFileSync(MANIFEST, "utf8"));

const rebake = async (id: string, scene: Scene) => {
  writeFileSync(bakeFile(id), `${JSON.stringify(await simulate(scene))}\n`);
  const manifest = { ...readManifest(), [id]: { inputHash: inputHash(scene) } };
  const sorted = Object.keys(manifest)
    .sort()
    .map((key) => [key, manifest[key]]);
  writeFileSync(
    MANIFEST,
    `${JSON.stringify(Object.fromEntries(sorted), null, 2)}\n`,
  );
};

test("[BAKE-01] every bake matches its inputs", async () => {
  for (const { id, scene } of BAKES) {
    const built = scene();
    if (process.env.UPDATE_BAKES === "1") await rebake(id, built);
    expect(readManifest()[id]?.inputHash).toBe(inputHash(built));
    expect(existsSync(bakeFile(id))).toBe(true);
  }
});

test("moving the release time changes the hash", () => {
  const base = inputHash(dropScene(0.1));
  expect(base).toMatch(/^[0-9a-f]{64}$/);
  expect(inputHash(dropScene(0.1))).toBe(base);
  expect(inputHash(dropScene(0.1 + 1 / SIM_HZ))).not.toBe(base);
});

test("bake inputs sample hovering up to release and kinematic paths over the scene", () => {
  const scene = dropScene(0.1);
  const inputs = bakeInputs(scene);
  expect(inputs.hz).toBe(SIM_HZ);
  expect(inputs.rapier).toBe(RAPIER_VERSION);
  const [ground, tile, drone] = inputs.bodies;
  expect(ground).toMatchObject({
    id: "floor",
    motion: "static",
    localBoxes: scene.bodies[0].localBoxes,
  });
  expect(ground.poses).toHaveLength(7);
  expect(tile).toMatchObject({
    id: "tile",
    motion: "simulated",
    release: { at: 0.1 },
  });
  expect(tile.poses).toHaveLength(7 * sampleTimes(SIM_HZ, 0, 0.1).length);
  expect(drone.poses).toHaveLength(
    7 * sampleTimes(SIM_HZ, 0, scene.duration).length,
  );
});
