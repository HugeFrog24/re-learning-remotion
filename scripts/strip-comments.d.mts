export const ROOTS: readonly string[];
export const EXTENSIONS: ReadonlySet<string>;
export function filesUnder(path: string): string[];
export function stripComments(text: string, path: string): string;
