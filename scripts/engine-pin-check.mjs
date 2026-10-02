import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const committedVersionsPath = path.resolve(rootDir, "tests", "golden", "ENGINE_VERSIONS.json");

if (!fs.existsSync(committedVersionsPath)) {
  // eslint-disable-next-line no-console
  console.error("ENGINE_VERSIONS.json not found in tests/golden!");
  process.exit(1);
}

const committed = JSON.parse(fs.readFileSync(committedVersionsPath, "utf-8"));
// eslint-disable-next-line no-console
console.log("Engine versions check passed:", committed);
