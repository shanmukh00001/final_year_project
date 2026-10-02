// AC-PERF-001: Check initial app shell JS bundle size <= 300 KB gzip
import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "apps", "web", "dist");

if (!fs.existsSync(distDir)) {
  // eslint-disable-next-line no-console
  console.log("apps/web/dist not found, skipping bundle check.");
  process.exit(0);
}

const assetsDir = path.join(distDir, "assets");
if (fs.existsSync(assetsDir)) {
  const files = fs.readdirSync(assetsDir);
  for (const f of files) {
    if (
      f.endsWith(".js") &&
      !f.includes("monaco") &&
      !f.includes("plotly") &&
      !f.includes("pyodide")
    ) {
      const content = fs.readFileSync(path.join(assetsDir, f));
      const gzipped = zlib.gzipSync(content);
      const sizeKb = gzipped.length / 1024;
      if (sizeKb > 300) {
        // eslint-disable-next-line no-console
        console.error(
          `Bundle size violation: ${f} is ${sizeKb.toFixed(1)} KB gzipped (max 300 KB)`,
        );
        process.exit(1);
      }
    }
  }
}

// eslint-disable-next-line no-console
console.log("Bundle size check passed.");
