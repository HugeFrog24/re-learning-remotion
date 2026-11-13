import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, test } from "vitest";
import { citedIds, parseContinuity } from "./continuity";

describe("continuity parsing", () => {
  test("parses rule lines", () => {
    expect(
      parseContinuity("- **PHYS-01** (test) A\n- **CAM-01** (planned) B\nnoise"),
    ).toEqual([
      { id: "PHYS-01", status: "test" },
      { id: "CAM-01", status: "planned" },
    ]);
  });

  test("finds IDs only in test titles", () => {
    const sample = readFileSync("src/tooling/fixtures/cited-sample.txt", "utf8");
    expect(citedIds(sample)).toEqual(["PHYS-01", "CAM-02", "ACC-05", "SND-01"]);
  });

  test("cites only DOC-01 in its own source", () => {
    expect(citedIds(readFileSync("src/tooling/continuity.test.ts", "utf8"))).toEqual(["DOC-01"]);
  });
});

test("[DOC-01] every (test) rule is cited by a test and every cited ID exists", () => {
  const rules = parseContinuity(readFileSync("docs/CONTINUITY.md", "utf8"));
  const ids = rules.map((rule) => rule.id);
  expect(new Set(ids).size).toBe(ids.length);
  const cited = new Set(
    readdirSync("src", { recursive: true, encoding: "utf8" })
      .filter((file) => file.endsWith(".test.ts"))
      .flatMap((file) => citedIds(readFileSync(`src/${file}`, "utf8"))),
  );
  const untested = rules
    .filter((rule) => rule.status === "test" && !cited.has(rule.id))
    .map((rule) => rule.id);
  const unknown = [...cited].filter((id) => !ids.includes(id));
  expect(untested).toEqual([]);
  expect(unknown).toEqual([]);
});
