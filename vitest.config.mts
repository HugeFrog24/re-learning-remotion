import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.test.ts"],
    exclude: ["src/**/*.render.test.ts", "node_modules/**"],
    testTimeout: 60_000,
    execArgv: ["--max-semi-space-size=64"],
  },
});
