import ts from "typescript";

const RULE_LINE = /^- \*\*([A-Z]+-\d{2})\*\* \((test|planned)\) (.+)$/;
const TITLE_ID = /^\[([A-Z]+-\d{2})\]/;
const RUNNERS = new Set(["test", "it", "describe"]);

export type Rule = { id: string; status: "test" | "planned" };

export const parseContinuity = (markdown: string): readonly Rule[] =>
  markdown.split("\n").flatMap((line) => {
    const match = RULE_LINE.exec(line.trimEnd());
    return match ? [{ id: match[1], status: match[2] as Rule["status"] }] : [];
  });

const rootName = (expression: ts.Expression): string | undefined => {
  if (ts.isIdentifier(expression)) {
    return expression.text;
  }
  if (ts.isPropertyAccessExpression(expression) || ts.isCallExpression(expression)) {
    return rootName(expression.expression);
  }
  return undefined;
};

export const citedIds = (testSource: string): readonly string[] => {
  const source = ts.createSourceFile("cited.ts", testSource, ts.ScriptTarget.Latest, true);
  const ids: string[] = [];
  const visit = (node: ts.Node) => {
    if (ts.isCallExpression(node)) {
      const root = rootName(node.expression);
      const title = node.arguments[0];
      if (
        root !== undefined &&
        RUNNERS.has(root) &&
        title !== undefined &&
        (ts.isStringLiteral(title) || ts.isNoSubstitutionTemplateLiteral(title))
      ) {
        const match = TITLE_ID.exec(title.text);
        if (match) {
          ids.push(match[1]);
        }
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(source);
  return ids;
};
