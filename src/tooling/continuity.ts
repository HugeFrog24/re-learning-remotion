const RULE_LINE = /^- \*\*([A-Z]+-\d{2})\*\* \((test|planned)\) (.+)$/;
const TITLE_ID =
  /\b(?:test|it|describe)(?:\.\w+)*(?:\([^)]*\))?\s*\(\s*["'`]\[([A-Z]+-\d{2})\]/g;

export type Rule = { id: string; status: "test" | "planned" };

export const parseContinuity = (markdown: string): readonly Rule[] =>
  markdown.split("\n").flatMap((line) => {
    const match = RULE_LINE.exec(line.trimEnd());
    return match ? [{ id: match[1], status: match[2] as Rule["status"] }] : [];
  });

export const citedIds = (testSource: string): readonly string[] =>
  Array.from(testSource.matchAll(TITLE_ID), (match) => match[1]);
