import { defineConfig } from "vite";
import path from "node:path";

export default defineConfig({
  envDir: path.resolve(__dirname, "../.."),
  server: {
    port: 3000,
  },
  build: {
    target: "es2022",
  },
});
