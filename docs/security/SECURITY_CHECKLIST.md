# V-Lab ECE: Production Security Checklist & Sign-Off

**Document Version:** 1.0.0  
**Audit Standard:** OWASP Top 10 (2021), ASVS v4.0.3, Cross-Origin Isolation (COOP/COEP)  
**Status:** All Controls Implemented & Verified

---

## 1. Authentication & Session Management

- [x] **JWT Token Architecture:** Access tokens (short-lived, 15m) and cryptographically signed Refresh tokens (7d) stored with `HttpOnly`, `SameSite=Strict`, and `Secure` attributes.
- [x] **Session-Proof Guard:** Custom `X-Session-Proof` header required on mutating API endpoints to defeat ambient-credential Cross-Site Request Forgery (CSRF).
- [x] **Password Hashing:** Passwords salted and hashed with `bcrypt` using an adaptive work factor ($\ge 10$ rounds).
- [x] **Brute-Force Rate Limiting:** Auth endpoints protected by Express rate limiting middleware (5 failed attempts per IP per 15-minute window).
- [x] **Role-Based Access Control (RBAC):** Strict hierarchical authorization (`student`, `professor`, `admin`) enforced on all route handlers via `requireRole` middleware.

---

## 2. Web Worker & Client-Side Execution Sandboxing

- [x] **Cross-Origin Isolation:** Server emits `Cross-Origin-Opener-Policy: same-origin` and `Cross-Origin-Embedder-Policy: require-corp` headers to permit high-resolution timers and `SharedArrayBuffer` without Spectre exploitation risks.
- [x] **Pyodide Execution Isolation:** Python runtime executes exclusively in an isolated Web Worker thread (`pyodide.worker.ts`), preventing main thread freezing and DOM manipulation.
- [x] **Execution Timeout Guard:** Web Worker terminates and recycles if Python simulation runtime exceeds 30 seconds.
- [x] **PolicyGuard Sandboxing:** Python `sys.modules` and builtins audited; network sockets, subprocess execution, and direct host filesystem access are restricted.

---

## 3. Data Validation & API Security

- [x] **Strict Schema Validation:** All incoming request bodies validated using Zod / Mongoose schema type guards.
- [x] **NoSQL Injection Prevention:** Parameterized Mongoose queries; strict typecasting for MongoDB ObjectIDs.
- [x] **XSS & Content Security Policy (CSP):** Monaco editor and user code sanitized before rendering; Plotly scripts bundled locally without `eval()` on unsanitized remote strings.
- [x] **Input Bounds & Caps:** Array sizes, matrix dimensions (e.g. max $1024 \times 1024$ for DIP images), and parameter ranges strictly bounded.

---

## 4. Academic Integrity & Plagiarism Controls

- [x] **AST Token Normalization:** Python comments, formatting, and identifier names stripped/normalized before similarity comparison.
- [x] **Winnowing Algorithm:** Robust rolling hash fingerprinting with window parameters ($k=8, w=4$) prevents superficial obfuscation evasion.
- [x] **Automated Flagging:** Pairwise Jaccard similarity matrix computed server-side, flagging pairs exceeding 80% threshold.

---

## 5. Audit Logging & Administrative Controls

- [x] **Immutable Security Audit Trail:** Administrative actions (role elevation, user suspension, batch CSV roster import, grade modifications) recorded in MongoDB `AuditLog` collection.
- [x] **Admin Route Isolation:** `/api/v1/admin/*` endpoints restricted strictly to `admin` role with audit logging middleware.
