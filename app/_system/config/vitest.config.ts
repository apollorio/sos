import { defineConfig } from "vitest/config";
export default defineConfig({
  test: { environment: "node", testTimeout: 600_000, include: ["tests/**/*.test.ts"] },
});
