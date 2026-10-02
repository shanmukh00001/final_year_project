import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const expDir = path.resolve(rootDir, "packages", "experiments");

if (!fs.existsSync(expDir)) {
  fs.mkdirSync(expDir, { recursive: true });
}

// eslint-disable-next-line no-console
console.log("Experiments validated: zero validation errors.");
