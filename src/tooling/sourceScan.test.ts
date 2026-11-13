import { readFileSync, readdirSync } from "node:fs";
import { isBuiltin } from "node:module";
import { posix } from "node:path";
import ts from "typescript";
import { expect, test } from "vitest";

const filesIn = (root: string) =>
  readdirSync(root, { recursive: true, encoding: "utf8" }).map((file) =>
    `${root}/${file}`.split("\\").join("/"),
  );

const isTest = (file: string) => /\.test\.tsx?$/.test(file);

const sources = () =>
  filesIn("src")
    .filter((file) => /\.tsx?$/.test(file))
    .filter((file) => !isTest(file) && !file.startsWith("src/tooling/"));

const offending = (pattern: RegExp, files: readonly string[]) =>
  files.filter((file) => pattern.test(readFileSync(file, "utf8")));

const NODE_ONLY_MODULES = ["src/bake/simulate", "src/bake/inputs"];

const nodeOnly = (file: string, specifier: string) =>
  isBuiltin(specifier) ||
  specifier.startsWith("@dimforge/") ||
  (specifier.startsWith(".") &&
    NODE_ONLY_MODULES.includes(
      posix
        .join(posix.dirname(file), specifier)
        .replace(/\.[cm]?[jt]sx?$/, ""),
    ));

const nodeImports = (file: string, text: string) =>
  ts
    .preProcessFile(text, true, true)
    .importedFiles.map((reference) => reference.fileName)
    .filter((specifier) => nodeOnly(file, specifier));

const UNSEEDED =
  /Math\.random|Date\.now|\bDate\(|performance\.now|getRandomValues|randomUUID/;
const SELF_RUNNING = /\buseFrame\b/;

test("[TIME-02] no unseeded randomness or wall-clock reads", () => {
  expect(offending(UNSEEDED, sources())).toEqual([]);
});

test("the TIME-02 pattern sees every way of reading randomness or the clock", () => {
  const caught = `Math.random()
Date.now()
new Date()
const today = Date();
String(Date(0))
performance.now()
crypto.getRandomValues(bytes)
globalThis.crypto.getRandomValues(new Uint8Array(4))
crypto.randomUUID()`.split("\n");
  const allowed = `seeded(7)()
toDate(x)
update()
const dated = 1;`.split("\n");
  expect(caught.filter((line) => !UNSEEDED.test(line))).toEqual([]);
  expect(allowed.filter((line) => UNSEEDED.test(line))).toEqual([]);
});

test("no source runs its own animation loop with R3F's useFrame", () => {
  expect(sources().length).toBeGreaterThan(0);
  expect(offending(SELF_RUNNING, sources())).toEqual([]);
  expect(SELF_RUNNING.test('import { useFrame } from "@react-three/fiber";')).toBe(
    true,
  );
  expect(SELF_RUNNING.test("useFrame((state) => state.clock)")).toBe(true);
  expect(SELF_RUNNING.test("const frame = useCurrentFrame();")).toBe(false);
});

test("only the bake modules and tests load Rapier, Node built-ins or the Node-only bake modules", () => {
  const guarded = filesIn("src").filter(
    (file) =>
      /\.tsx?$/.test(file) &&
      !isTest(file) &&
      !NODE_ONLY_MODULES.some((module) => file === `${module}.ts`),
  );
  expect(guarded).toContain("src/bake/registry.ts");
  expect(
    guarded.flatMap((file) =>
      nodeImports(file, readFileSync(file, "utf8")).map(
        (specifier) => `${file} -> ${specifier}`,
      ),
    ),
  ).toEqual([]);
});

test("the import guard sees every way of naming a Node-only module", () => {
  const sample = [
    'import { readFileSync } from "fs";',
    "import { createHash } from 'crypto';",
    'import "path";',
    'import { simulate } from "../bake/simulate.ts";',
    'export { SIM_HZ } from "./inputs";',
    'const rapier = await import("@dimforge/rapier3d-deterministic-compat");',
    "const files = import('node:fs/promises');",
    'import { Vector3 } from "three";',
    'import { BAKES } from "./registry";',
    'const quoted = "from \\"fs\\"";',
  ].join("\n");
  expect(nodeImports("src/bake/registry.ts", sample)).toEqual([
    "fs",
    "crypto",
    "path",
    "../bake/simulate.ts",
    "./inputs",
    "@dimforge/rapier3d-deterministic-compat",
    "node:fs/promises",
  ]);
});

test("[REF-01] reference hooking libraries are never named", () => {
  const line = readFileSync("AGENTS.md", "utf8")
    .split("\n")
    .find((text) => text.startsWith("Reference repositories"));
  const names = line!
    .split(":")[1]
    .split(",")
    .map((name) => name.trim().toLowerCase());
  expect(names.length).toBeGreaterThan(0);
  const offenders = ["src", "public", "docs"]
    .flatMap((root) => {
      try {
        return filesIn(root);
      } catch {
        return [];
      }
    })
    .filter((file) => /\.(ts|tsx|md|json|mjs|html)$/.test(file))
    .filter(
      (file) =>
        !file.startsWith("docs/superpowers/specs/") &&
        !file.startsWith("docs/superpowers/plans/"),
    )
    .filter((file) => file !== "src/tooling/fixtures/cited-sample.txt")
    .filter((file) => {
      const text = readFileSync(file, "utf8").toLowerCase();
      return names.some((name) => text.includes(name));
    });
  expect(offenders).toEqual([]);
});
