import { readFileSync, readdirSync } from "node:fs";
import { expect, test } from "vitest";

const filesIn = (root: string) =>
  readdirSync(root, { recursive: true, encoding: "utf8" }).map((file) =>
    `${root}/${file}`.split("\\").join("/"),
  );

test("[TIME-02] no unseeded randomness or wall-clock reads", () => {
  const offenders = filesIn("src")
    .filter((file) => /\.tsx?$/.test(file))
    .filter((file) => !file.endsWith(".test.ts") && !file.startsWith("src/tooling/"))
    .filter((file) =>
      /Math\.random|Date\.now|new Date\(|performance\.now/.test(readFileSync(file, "utf8")),
    );
  expect(offenders).toEqual([]);
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
