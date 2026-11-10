import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: {
    alias: {
      "@tinh-hoa/shared": path.resolve(__dirname, "./packages/shared/src/index.ts"),
    },
  },
  test: {
    globals: true,
    environment: "node",
  },
});
