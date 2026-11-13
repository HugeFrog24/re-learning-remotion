import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["src/**/*.render.test.ts"],
    testTimeout: 900_000,
    hookTimeout: 900_000,
    execArgv: ["--max-semi-space-size=64"],
    fileParallelism: false,
  },
});
