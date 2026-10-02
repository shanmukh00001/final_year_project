// AC-DEP-003: Confirm production build contains no __vlabTest or VITE_E2E
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "apps", "web", "dist");

function scanForPattern(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanForPattern(full);
    } else if (f.endsWith(".js")) {
      const content = fs.readFileSync(full, "utf-8");
      if (content.includes("__vlabTest") || content.includes("VITE_E2E")) {
        // eslint-disable-next-line no-console
        console.error(`Production bundle contains test hook leakage in ${f}`);
        process.exit(1);
      }
    }
  }
}

scanForPattern(distDir);
// eslint-disable-next-line no-console
console.log("No test hook leakage detected in production bundle.");
