# V-Lab ECE: Test Strategy & Verification Architecture

**Document Version:** 1.0.0  
**Testing Frameworks:** Jest, React Testing Library, TypeScript strict compiler, ESLint, Chrome DevTools MCP

---

## 1. Testing Pyramid & Verification Levels

```
                   ▲
                  / \
                 /   \
                / E2E \   ◄── Chrome DevTools Browser Subagent (User Journeys)
               /───────\
              / Integr. \ ◄── API Endpoints & DB Mongoose Tests (Supertest)
             /───────────\
            / Component /  ◄── React Testing Library (Workspace, Modals, Portals)
           /─────────────\
          /  Unit & Math  \◄── Numerical Golden Tests, AST Winnowing, Tokenizer
         /─────────────────\
```

---

## 2. Test Suites Overview

| Test Suite | Package | Focus & Coverage |
| :--- | :--- | :--- |
| `numerical.test.ts` | `@vlab/web` | Golden mathematical verification for DSP, Signals & Systems, Circuit theory, and State Space equations. |
| `curriculum.test.ts` | `@vlab/web` | Schema validation, starter code integrity, and parameter range checks for all 51 catalog experiments. |
| `workerEngine.test.ts` | `@vlab/web` | Pyodide Web Worker message protocol, execution timeouts, error forwarding, and state synchronization. |
| `contrast.test.ts` | `@vlab/web` | WCAG 2.1 AA compliant color contrast ratios across light and dark themes. |
| `workspace.test.tsx` | `@vlab/web` | Monaco code editor, keyboard shortcuts (Ctrl+Enter, Shift+Enter), split pane resizing, and plot canvas. |
| `professor.test.tsx` | `@vlab/web` | Assignment creation modal, submission roster, rubric grading interface, and CSV gradebook export. |
| `admin.test.tsx` | `@vlab/web` | System vitals cards, bulk CSV student roster parser, RBAC role updates, and DIP canvas inspector. |
| `auth.test.ts` | `@vlab/api` | User registration, password hashing, JWT issuance, refresh rotation, and `X-Session-Proof` CSRF guard. |
| `workspaces.test.ts`| `@vlab/api` | Workspace persistence, state serialization, and fork operations. |
| `assignments.test.ts`| `@vlab/api` | Assignment lifecycle, deadline enforcement, student submissions, and grading endpoints. |
| `similarity.test.ts`| `@vlab/api` | AST normalization, Winnowing rolling hash fingerprints, and pairwise Jaccard similarity matrix calculations. |

---

## 3. Execution & Continuous Integration Commands

- **Full Test Run:** `pnpm test`
- **Lint Check:** `pnpm run lint` (Enforces 0 warnings, 0 errors)
- **Typecheck:** `pnpm run typecheck` (Validates `@vlab/shared`, `@vlab/api`, `@vlab/web` + worker tsconfig)
- **Full Verification Suite:** `pnpm run verify`
