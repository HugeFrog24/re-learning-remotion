import ts from "typescript";

export type Wiring = {
  readonly names: ReadonlySet<string>;
  readonly imports: (from: string) => readonly string[];
  readonly calls: (callee: string) => readonly (readonly string[])[];
  readonly props: (element: string, attribute: string) => readonly string[];
  readonly values: (name: string) => readonly string[];
};

const printer = ts.createPrinter({ removeComments: true });

const bindingNames = (name: ts.BindingName): string[] =>
  ts.isIdentifier(name)
    ? [name.text]
    : name.elements.flatMap((element) =>
        ts.isBindingElement(element) ? bindingNames(element.name) : [],
      );

export const wiringOf = (text: string, file = "wired.tsx"): Wiring => {
  const source = ts.createSourceFile(
    file,
    text,
    ts.ScriptTarget.Latest,
    true,
    file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const print = (node: ts.Node) =>
    printer.printNode(ts.EmitHint.Unspecified, node, source);
  const names = new Set<string>();
  const imports = new Map<string, string[]>();
  const calls = new Map<string, string[][]>();
  const props = new Map<string, string[]>();
  const values = new Map<string, string[]>();
  const add = <T>(into: Map<string, T[]>, key: string, value: T) =>
    into.set(key, [...(into.get(key) ?? []), value]);

  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node)) names.add(node.text);
    if (
      ts.isImportDeclaration(node) &&
      ts.isStringLiteral(node.moduleSpecifier) &&
      node.importClause?.namedBindings &&
      ts.isNamedImports(node.importClause.namedBindings)
    ) {
      for (const element of node.importClause.namedBindings.elements) {
        add(imports, node.moduleSpecifier.text, element.name.text);
      }
    }
    if (ts.isCallExpression(node)) {
      add(calls, print(node.expression), node.arguments.map(print));
    }
    if (ts.isJsxAttribute(node) && node.initializer) {
      const owner = node.parent.parent;
      const value = ts.isJsxExpression(node.initializer)
        ? node.initializer.expression
        : node.initializer;
      if (value) {
        add(props, `${print(owner.tagName)}.${print(node.name)}`, print(value));
      }
    }
    if (ts.isVariableDeclaration(node) && node.initializer) {
      for (const name of bindingNames(node.name)) {
        add(values, name, print(node.initializer));
      }
    }
    if (ts.isPropertyAssignment(node)) {
      add(values, print(node.name), print(node.initializer));
    }
    if (
      ts.isBinaryExpression(node) &&
      node.operatorToken.kind === ts.SyntaxKind.EqualsToken
    ) {
      add(values, print(node.left), print(node.right));
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return {
    names,
    imports: (from) => imports.get(from) ?? [],
    calls: (callee) => calls.get(callee) ?? [],
    props: (element, attribute) => props.get(`${element}.${attribute}`) ?? [],
    values: (name) => values.get(name) ?? [],
  };
};

export type Expected = {
  readonly absent?: readonly string[];
  readonly imports?: Readonly<Record<string, readonly string[]>>;
  readonly calls?: Readonly<Record<string, readonly (readonly string[])[]>>;
  readonly values?: Readonly<Record<string, readonly string[]>>;
  readonly props?: Readonly<Record<string, readonly string[]>>;
};

const differs = (what: string, actual: unknown, wanted: unknown): string[] =>
  JSON.stringify(actual) === JSON.stringify(wanted)
    ? []
    : [`${what} is ${JSON.stringify(actual)}, not ${JSON.stringify(wanted)}`];

const each = <T>(
  table: Readonly<Record<string, T>> | undefined,
  check: (key: string, wanted: T) => string[],
) => Object.entries(table ?? {}).flatMap(([key, wanted]) => check(key, wanted));

export const unwired = (wiring: Wiring, expected: Expected): string[] => [
  ...(expected.absent ?? [])
    .filter((name) => wiring.names.has(name))
    .map((name) => `${name} is used`),
  ...each(expected.imports, (from, names) =>
    differs(`import from ${from}`, wiring.imports(from), names),
  ),
  ...each(expected.calls, (callee, args) =>
    differs(`${callee}()`, wiring.calls(callee), args),
  ),
  ...each(expected.values, (name, wanted) =>
    differs(name, wiring.values(name), wanted),
  ),
  ...each(expected.props, (key, wanted) => {
    const [element, attribute] = key.split(".");
    return differs(`<${key}>`, wiring.props(element, attribute), wanted);
  }),
];
