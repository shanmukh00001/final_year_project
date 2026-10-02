// Static check for forbidden XSS/execution patterns
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcDir = path.resolve(__dirname, "..", "apps", "web", "src");

const forbidden = ["dangerouslySetInnerHTML", ".innerHTML =", "eval(", "new Function("];

function scanDir(dir) {
  if (!fs.existsSync(dir)) {
    return;
  }
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    const stat = fs.statSync(full);
    if (stat.isDirectory()) {
      scanDir(full);
    } else if (f.endsWith(".ts") || f.endsWith(".tsx")) {
      const content = fs.readFileSync(full, "utf-8");
      for (const pattern of forbidden) {
        if (content.includes(pattern)) {
          // eslint-disable-next-line no-console
          console.error(`Forbidden pattern '${pattern}' found in ${full}`);
          process.exit(1);
        }
      }
    }
  }
}

scanDir(srcDir);
// eslint-disable-next-line no-console
console.log("No forbidden patterns detected in apps/web/src.");
