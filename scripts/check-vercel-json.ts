import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const vercelJsonPath = path.resolve(rootDir, "vercel.json");

if (!fs.existsSync(vercelJsonPath)) {
  // eslint-disable-next-line no-console
  console.error("vercel.json is missing!");
  process.exit(1);
}

const parsed = JSON.parse(fs.readFileSync(vercelJsonPath, "utf-8"));
if (!parsed.headers || !parsed.rewrites) {
  // eslint-disable-next-line no-console
  console.error("vercel.json invalid: missing headers or rewrites!");
  process.exit(1);
}

// eslint-disable-next-line no-console
console.log("vercel.json validated successfully.");
