---
trigger: always_on
description: "Core architectural constraints and instructions for V-Lab ECE."
---
# GLOBAL AGENT RULES (V-Lab ECE)

1. **The Docs are Law:** The `/docs` directory is the single source of truth. If a rule here conflicts with `/docs`, `/docs` wins.
2. **Strict TypeScript:** `any` is strictly banned. Use `unknown` and type-narrow. `tsc --noEmit` must always pass.
3. **Zero Server Compute:** You must NEVER execute mathematical simulations on the backend. All Pyodide execution happens in the Client Web Worker.
4. **Read Before Writing:** Always read the relevant `/docs` file for the current phase before modifying files.
5. **No Placeholders:** Write complete, production-ready code. Do not leave `// TODO: Implement logic` comments.
6. **No Phantom Fixes:** Do not claim a bug is fixed unless you have actually written the code and run the relevant test to prove it via MCP terminal commands.