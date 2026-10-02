# V-Lab ECE: Engineering Standards & Guidelines

**Document Version:** 1.0.0  
**Stack:** TypeScript 5.x, React 19, Express 4.x, Pyodide (CPython 3.14 Wasm), Monaco Editor, Plotly, Vite, Turborepo

---

## 1. Code Style & Formatting

1. **TypeScript Strictness:** Strict null checks, no implicit any, and `exactOptionalPropertyTypes: true` are enabled across all packages (`shared`, `api`, `web`).
2. **Component Architecture:** Functional React components with hooks; UI components must maintain clear separation from numerical simulation engines.
3. **Styling System:** CSS variables and design tokens for theme switching (Dark & Light modes), maintaining WCAG 2.1 AA compliant contrast ratios ($\ge 4.5:1$).
4. **Error Handling:** Async/await with explicit try/catch blocks; API controllers use central error middleware returning structured JSON error payloads.

---

## 2. Naming Conventions

- **React Components:** PascalCase (e.g. `AssignmentEditorModal.tsx`, `ImageInspector.tsx`).
- **Hooks & Utilities:** camelCase (e.g. `usePyodideWorker.ts`, `similarity.service.ts`).
- **Mongoose Models:** PascalCase singular (e.g. `User.ts`, `Assignment.ts`, `Submission.ts`).
- **REST Endpoints:** kebab-case plural resources (e.g. `/api/v1/professor/assignments/:id/similarity`).
- **Experiment IDs:** Course prefix followed by 2-digit number (e.g. `DSP-01`, `SS-03`, `NT-06`, `DIP-02`).

---

## 3. Git Workflow & Commit Guidelines

- **Branching Strategy:** Feature branches branched from `main` and merged via Pull Requests.
- **Conventional Commits:**
  - `feat(...)`: New user-facing feature or domain capability.
  - `fix(...)`: Bug fix or numerical regression resolution.
  - `docs(...)`: Documentation or specification updates.
  - `test(...)`: Unit, integration, or numerical test enhancements.
- **Verification Gate:** No commit or PR merge without clean `pnpm run lint`, `pnpm run typecheck`, and `pnpm test`.
