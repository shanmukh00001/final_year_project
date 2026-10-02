// AC-DEP-004: Check total static deploy size
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.resolve(__dirname, "..", "apps", "web", "dist");

function getDirSize(dir) {
  let size = 0;
  if (!fs.existsSync(dir)) {
    return 0;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      size += getDirSize(full);
    } else {
      size += stat.size;
    }
  }
  return size;
}

const totalBytes = getDirSize(distDir);
const totalMb = totalBytes / (1024 * 1024);

// eslint-disable-next-line no-console
console.log(`Total static build size: ${totalMb.toFixed(2)} MB`);
