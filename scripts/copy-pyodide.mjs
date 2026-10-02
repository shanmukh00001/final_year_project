import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
let pyodideSrcDir = path.resolve(rootDir, "node_modules", "pyodide");
if (!fs.existsSync(pyodideSrcDir)) {
  pyodideSrcDir = path.resolve(rootDir, "apps", "web", "node_modules", "pyodide");
}
const pyodideDestDir = path.resolve(rootDir, "apps", "web", "public", "pyodide", "314.0.3");

if (!fs.existsSync(pyodideSrcDir)) {
  // eslint-disable-next-line no-console
  console.log("pyodide package not found in node_modules yet, skipping asset copy.");
  process.exit(0);
}

fs.mkdirSync(pyodideDestDir, { recursive: true });

const files = fs.readdirSync(pyodideSrcDir);
const manifest = {};

for (const file of files) {
  const srcFile = path.join(pyodideSrcDir, file);
  const destFile = path.join(pyodideDestDir, file);
  const stat = fs.statSync(srcFile);

  if (stat.isFile()) {
    const data = fs.readFileSync(srcFile);
    fs.writeFileSync(destFile, data);
    const hash = crypto.createHash("sha256").update(data).digest("hex");
    manifest[file] = hash;
  }
}

fs.writeFileSync(
  path.join(pyodideDestDir, "MANIFEST.json"),
  JSON.stringify(manifest, null, 2),
  "utf-8",
);

// eslint-disable-next-line no-console
console.log(
  `Successfully copied ${Object.keys(manifest).length} pyodide assets to ${pyodideDestDir}`,
);
