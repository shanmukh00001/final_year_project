# V-Lab ECE: Technology Stack

> **Agent instruction: version protocol.**
>
> 1. Versions marked **VERIFIED** were confirmed against upstream release data on 2026-10-01.
> 2. For all others the table gives the **required major line**. At scaffold time run `pnpm view <pkg> version` (and `dist-tags`) to find the newest stable release on that major line, install it with `pnpm add -E` (exact, no caret), and record the resolved version in `docs/architecture/RESOLVED_VERSIONS.md`.
> 3. If the newest stable major differs from this table, **do not upgrade silently**; stop and raise a blocker.
> 4. Never use `latest`, `^`, `~`, or `*` in any `package.json`.

## 1. Runtime and Tooling

| Layer                  | Choice                                   | Version                                         | Rationale                                                     |
| ---------------------- | ---------------------------------------- | ----------------------------------------------- | ------------------------------------------------------------- |
| Node.js                | Node.js LTS                              | 24.x (fallback 22.x if Vercel runtime lacks 24) | Active LTS; native `fetch`, ESM                               |
| Package manager        | pnpm                                     | 10.x                                            | Strict, fast, workspace support                               |
| Monorepo orchestration | Turborepo                                | 2.x                                             | Cached builds across `apps/*` and `packages/*`                |
| Language               | TypeScript                               | 5.x (strict)                                    | Shared types between web, API, and worker                     |
| Bundler / dev server   | Vite                                     | 7.x (or current stable on that line)            | Fast HMR, first-class Web Worker (`?worker`) and WASM support |
| Linting                | ESLint (flat config) + typescript-eslint | 9.x / 8.x                                       | See `CODING_STANDARDS.md`                                     |
| Formatting             | Prettier                                 | 3.x                                             | Deterministic formatting                                      |

## 2. Frontend

| Concern               | Library                                                         | Version line                | Rationale                                                                                                                                                              |
| --------------------- | --------------------------------------------------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI framework          | React                                                           | 19.x                        | Specified by project; concurrent rendering                                                                                                                             |
| Routing               | react-router                                                    | 7.x (data router, SPA mode) | Route-level code splitting and loaders                                                                                                                                 |
| Styling               | Tailwind CSS                                                    | 4.x (`@tailwindcss/vite`)   | Specified; CSS-first `@theme` tokens (`DESIGN_SYSTEM.md`)                                                                                                              |
| Split panes           | react-resizable-panels                                          | 3.x                         | Nested groups, persistence, keyboard resize                                                                                                                            |
| Code editor           | monaco-editor + @monaco-editor/react                            | monaco 0.5x / wrapper 4.x   | VS Code feel; **self-hosted** via `loader.config({ monaco })` and Vite worker imports (CSP compliant)                                                                  |
| Phone editor          | In-house `LiteEditor` (textarea + line gutter)                  | n/a                         | Monaco is poor on touch devices (see `RESPONSIVE_DESIGN.md`)                                                                                                           |
| Client state          | Zustand                                                         | 5.x                         | Small, selector-based stores                                                                                                                                           |
| State machines        | XState                                                          | 5.x                         | Worker lifecycle machine matching `USER_FLOWS.md` state names                                                                                                          |
| Server state          | TanStack Query                                                  | 5.x                         | Caching, retries for API reads                                                                                                                                         |
| Forms and validation  | react-hook-form + zod                                           | 7.x / 4.x                   | Same Zod schemas as backend                                                                                                                                            |
| Plotting              | **Plotly.js** via custom partial bundle                         | 3.x                         | See ADR-003. Imports: `plotly.js/lib/core` + `scatter`, `scattergl`, `bar`, `heatmap`, `image`, `surface`, `scatter3d`, `histogram`; target ≤ 1.2 MB gzip, lazy-loaded |
| Plot wrapper          | Thin in-house adapter (no react-plotly)                         | n/a                         | Full control over `Plotly.react`, resize observer, and typed-array input                                                                                               |
| Markdown + math       | react-markdown + remark-math + rehype-katex + KaTeX             | 10.x / 6.x / 7.x / 0.16.x   | Experiment theory text; KaTeX CSS and fonts self-hosted                                                                                                                |
| IndexedDB             | idb                                                             | 8.x                         | Promise API over IndexedDB                                                                                                                                             |
| Icons                 | lucide-react                                                    | current stable              | Tree-shakeable                                                                                                                                                         |
| Service worker        | Workbox (workbox-build, workbox-routing, workbox-strategies)    | 7.x                         | Cache strategies in `SYSTEM_ARCHITECTURE.md` §10                                                                                                                       |
| Fonts                 | @fontsource-variable/inter, @fontsource-variable/jetbrains-mono | current                     | Self-hosted (CSP, COEP)                                                                                                                                                |
| Date handling         | date-fns                                                        | 4.x                         | Due dates, relative times                                                                                                                                              |
| Unit testing          | Jest + ts-jest or @swc/jest, Testing Library                    | Jest 30.x / RTL 16.x        | Specified in testing docs (Batch 3)                                                                                                                                    |
| E2E                   | Cypress                                                         | 15.x                        | Specified in testing docs (Batch 3)                                                                                                                                    |
| Accessibility testing | axe-core + cypress-axe                                          | 4.x / 1.x                   | AC-UI-001                                                                                                                                                              |

## 3. Simulation Engine (Browser)

| Component    | Choice                                             | Version                                                                                                                                        | Notes                                                                                      |
| ------------ | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Pyodide      | npm package `pyodide`                              | **314.0.3 (VERIFIED: current as of July 2026 per PyScript release notes; Pyodide moved to a Python-version-based scheme, 314 = CPython 3.14)** | Pin exactly; assets copied to `apps/web/public/pyodide/314.0.3/` by a `postinstall` script |
| CPython      | Bundled with Pyodide                               | 3.14                                                                                                                                           | Do not run a separate Python                                                               |
| numpy        | From Pyodide's `pyodide-lock.json`                 | ~2.4 (**VERIFIED** line in Pyodide package channel, May 2026)                                                                                  | Exact version is whatever the pinned lockfile resolves; record it                          |
| scipy        | From `pyodide-lock.json`                           | ~1.17 (**VERIFIED** line)                                                                                                                      | Same rule                                                                                  |
| matplotlib   | From `pyodide-lock.json`                           | ~3.10 (**VERIFIED** line)                                                                                                                      | Lazy; Agg backend only                                                                     |
| OpenCV.js    | Self-hosted build of `opencv.js` (WASM)            | 4.x (pin the build artefact hash in `/public/opencv/MANIFEST.json`)                                                                            | DIP only; loaded in `opencv.worker.ts`                                                     |
| Worker comms | Native `postMessage` + Zod validation              | n/a                                                                                                                                            | No Comlink: keeps the protocol explicit and transfer lists visible                         |
| Interrupt    | `pyodide.setInterruptBuffer` + `SharedArrayBuffer` | n/a                                                                                                                                            | Needs COOP/COEP                                                                            |

**Gate (mandatory CI job `engine-pin-check`):** reads `pyodide-lock.json`, writes numpy/scipy/matplotlib versions to `tests/golden/ENGINE_VERSIONS.json`; fails the build if they differ from the committed file. Upgrading Pyodide means regenerating goldens (see `TEST_PLAN.md`).

## 4. Backend

| Concern          | Library                                      | Version line                | Rationale                                                      |
| ---------------- | -------------------------------------------- | --------------------------- | -------------------------------------------------------------- |
| HTTP framework   | Express                                      | 5.x                         | Specified (MERN); native async error propagation               |
| ODM              | Mongoose                                     | 8.x                         | Schemas, validators, indexes                                   |
| Database         | MongoDB Atlas                                | M0 shared tier, MongoDB 8.x | Specified; free tier                                           |
| Validation       | zod (shared)                                 | 4.x                         | One schema set for client and server                           |
| Auth tokens      | jose                                         | 6.x                         | Standards-compliant JWT (HS256)                                |
| Password hashing | bcryptjs                                     | 3.x                         | Pure JS, no native build on Vercel                             |
| Security headers | helmet                                       | 8.x                         | Baseline headers                                               |
| CORS             | cors                                         | 2.x                         | Origin allowlist                                               |
| Rate limiting    | Custom Mongo-backed limiter (TTL collection) | n/a                         | In-memory limiters are ineffective across serverless instances |
| Cookies          | cookie                                       | 1.x                         | Parse and serialise                                            |
| CSV              | csv-parse / csv-stringify                    | 6.x                         | Import and export                                              |
| Email            | Resend SDK (or Nodemailer + SMTP)            | current                     | Password reset only; provider chosen by env                    |
| Logging          | pino                                         | 9.x                         | JSON logs with redaction                                       |
| Testing          | Jest + supertest + mongodb-memory-server     | 30.x / 7.x / 10.x           | API tests without a live cluster                               |

## 5. Hosting and Delivery

| Concern        | Choice                                                                  | Notes                                          |
| -------------- | ----------------------------------------------------------------------- | ---------------------------------------------- |
| Hosting        | Vercel (single project)                                                 | Static SPA + one Express function; same origin |
| Database host  | MongoDB Atlas M0                                                        | Region: nearest to Mumbai (`ap-south-1`)       |
| CI             | GitHub Actions                                                          | `CI_CD.md` (Batch 4)                           |
| Error tracking | Sentry browser SDK (self-hosting optional) or lightweight custom beacon | Decided in `MONITORING.md` (Batch 4)           |

## 6. Explicitly Rejected

| Option                               | Reason                                                                           |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| ECharts                              | Weaker log-axis subplots and 3D requires extra package (echarts-gl); see ADR-003 |
| Flask/FastAPI backend executing code | Violates zero-compute-cost constraint (ADR-001)                                  |
| Redux Toolkit                        | More boilerplate than needed                                                     |
| Create React App                     | Deprecated                                                                       |
| Next.js                              | SSR unnecessary; SPA + Vite is simpler for worker/WASM assets                    |
| Public CDN for Pyodide               | Breaks COEP/offline guarantees (ADR-012)                                         |
| Comlink                              | Hides transfer semantics we need explicit                                        |

## 7. Scaffold Commands (run in order)

```bash
corepack enable && corepack prepare pnpm@10 --activate
pnpm init && echo "24" > .nvmrc
printf "packages:\n  - apps/*\n  - packages/*\n" > pnpm-workspace.yaml
pnpm add -D -w -E turbo typescript prettier eslint typescript-eslint
pnpm create vite apps/web --template react-ts
pnpm --filter web add -E react react-dom react-router zustand xstate @tanstack/react-query zod idb \
  react-resizable-panels monaco-editor @monaco-editor/react plotly.js react-markdown remark-math rehype-katex katex \
  date-fns lucide-react react-hook-form @fontsource-variable/inter @fontsource-variable/jetbrains-mono pyodide
pnpm --filter web add -D -E tailwindcss @tailwindcss/vite workbox-build jest cypress cypress-axe axe-core
mkdir -p apps/api packages/shared packages/experiments packages/vlab-py
pnpm --filter api add -E express mongoose zod jose bcryptjs helmet cors cookie pino csv-parse csv-stringify
pnpm --filter api add -D -E jest supertest mongodb-memory-server @types/express
```

After each install, record the resolved versions as described at the top of this file.
