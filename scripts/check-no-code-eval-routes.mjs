// AC-ASG-004: Confirm API has no code evaluation or process execution imports
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const apiSrcDir = path.resolve(__dirname, "..", "apps", "api", "src");

const forbiddenImports = ["child_process", "vm", "worker_threads", "eval(", "new Function("];

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
    } else if (f.endsWith(".ts")) {
      const content = fs.readFileSync(full, "utf-8");
      for (const pattern of forbiddenImports) {
        if (content.includes(pattern)) {
          // eslint-disable-next-line no-console
          console.error(
            `Violation: Backend code contains forbidden execution module '${pattern}' in ${full}`,
          );
          process.exit(1);
        }
      }
    }
  }
}

scanDir(apiSrcDir);
// eslint-disable-next-line no-console
console.log("No backend code-evaluation routes or modules detected.");
