import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");
const acFilePath = path.resolve(rootDir, "docs", "ACCEPTANCE_CRITERIA.md");

if (!fs.existsSync(acFilePath)) {
  // eslint-disable-next-line no-console
  console.error("ACCEPTANCE_CRITERIA.md not found!");
  process.exit(1);
}

const acContent = fs.readFileSync(acFilePath, "utf-8");
const acRegex = /AC-[A-Z]+-\d{3}/g;
const declaredAcs = Array.from(new Set(acContent.match(acRegex) ?? [])).sort();

// Find test files in tests, apps/web/src, apps/api/src, cypress
function scanDir(dir: string, fileList: string[] = []): string[] {
  if (!fs.existsSync(dir)) {
    return fileList;
  }
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      if (file !== "node_modules" && file !== "dist" && file !== ".turbo") {
        scanDir(fullPath, fileList);
      }
    } else if (file.endsWith(".test.ts") || file.endsWith(".test.tsx") || file.endsWith(".cy.ts")) {
      fileList.push(fullPath);
    }
  }
  return fileList;
}

const testFiles = scanDir(path.resolve(rootDir, "apps"))
  .concat(scanDir(path.resolve(rootDir, "tests")))
  .concat(scanDir(path.resolve(rootDir, "packages")))
  .concat(scanDir(path.resolve(rootDir, "cypress")));

const coveredAcs = new Set<string>();

for (const tf of testFiles) {
  const content = fs.readFileSync(tf, "utf-8");
  const matches = content.match(acRegex);
  if (matches) {
    for (const m of matches) {
      coveredAcs.add(m);
    }
  }
}

// eslint-disable-next-line no-console
console.log(
  `AC Coverage Report: ${coveredAcs.size}/${declaredAcs.length} Acceptance Criteria tested.`,
);
for (const ac of declaredAcs) {
  const status = coveredAcs.has(ac) ? "[x] Covered" : "[ ] Pending";
  // eslint-disable-next-line no-console
  console.log(`  ${ac}: ${status}`);
}
