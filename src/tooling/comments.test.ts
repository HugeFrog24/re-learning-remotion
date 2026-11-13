import { readFileSync } from "node:fs";
import { expect, test } from "vitest";
import { ROOTS, filesUnder, stripComments } from "../../scripts/strip-comments.mjs";

test("stripComments keeps directives and removes ordinary comments", () => {
  const input = [
    "// eslint-disable-next-line no-console",
    "console.log(1); // trailing",
    "/* block */",
    "const a = 1;",
    "",
  ].join("\n");
  const output = stripComments(input, "x.ts");
  expect(output).toContain("// eslint-disable-next-line no-console");
  expect(output).not.toContain("trailing");
  expect(output).not.toContain("block");
  expect(output).toContain("const a = 1;");
});

test("no comments remain in source files", () => {
  const files = ROOTS.flatMap((root) => {
    try {
      return filesUnder(root);
    } catch {
      return [];
    }
  });
  expect(files.map((file) => file.split("\\").join("/"))).toEqual(
    expect.arrayContaining([
      "vitest.config.mts",
      "vitest.render.config.mts",
      "scripts/strip-comments.d.mts",
      "scripts/strip-comments.mjs",
      "src/index.ts",
    ]),
  );
  const dirty = files.filter((file) => {
    const text = readFileSync(file, "utf8");
    return stripComments(text, file) !== text;
  });
  expect(dirty).toEqual([]);
});
