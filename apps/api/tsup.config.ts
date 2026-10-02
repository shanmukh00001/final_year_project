import { defineConfig } from "tsup";

export default defineConfig({
  entry: { app: "src/app.ts" },
  format: ["esm"],
  target: "node24",
  platform: "node",
  outDir: "dist",
  clean: true,
  sourcemap: true,
  splitting: false,
  noExternal: [/^@vlab\//],
  external: [
    "mongoose",
    "express",
    "jose",
    "bcryptjs",
    "helmet",
    "cors",
    "cookie",
    "pino",
    "zod",
    "csv-parse",
    "csv-stringify",
  ],
});
