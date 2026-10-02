# V-Lab ECE: Threat Model & Security Architecture

**Document Version:** 1.0.0  
**Methodology:** Microsoft STRIDE & OWASP Risk Assessment

---

## 1. System Assets & Trust Boundaries

```
[ Public Internet ]
        │
        ▼ (TLS 1.3 / HTTPS)
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 1: Web Client (Browser Sandbox)             │
│ • React SPA Shell                                           │
│ • Monaco Python Code Editor                                 │
│ • Plotly / Canvas / SVG Renderers                           │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ TRUST BOUNDARY 2: Pyodide Web Worker (Wasm Sandbox)     │ │
│ │ • Isolated CPython 3.14 WebAssembly Engine              │ │
│ │ • NumPy / SciPy / Matplotlib Wasm Modules               │ │
│ │ • PolicyGuard Memory & Execution Limits                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────────────┬──────────────────────────────┘
                               │ (REST JSON API + Bearer JWT + X-Session-Proof)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 3: Express API Server                        │
│ • JWT Authentication & Session Token Lifecycle              │
│ • RBAC Authorization Middleware (Student / Prof / Admin)    │
│ • Plagiarism Winnowing AST Similarity Engine                │
│ • Rate Limiting & Input Sanitization Layer                  │
└──────────────────────────────┬──────────────────────────────┘
                               │ (MongoDB Wire Protocol with Auth)
                               ▼
┌─────────────────────────────────────────────────────────────┐
│ TRUST BOUNDARY 4: Database Storage                          │
│ • Users, Workspaces, Assignments, Submissions, Audit Logs   │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. STRIDE Threat Analysis & Mitigations

| Threat Category            | Potential Attack Vector                                                                  | Impact   | Mitigation Strategy                                                                                                       |
| :------------------------- | :--------------------------------------------------------------------------------------- | :------- | :------------------------------------------------------------------------------------------------------------------------ |
| **Spoofing**               | Student impersonating faculty or another student to submit/grade lab.                    | High     | Cryptographically signed JWTs, bcrypt password hashes, and strict `requireRole(['professor'])` middleware.                |
| **Tampering**              | Student modifying API payload to alter grades or submission timestamps.                  | High     | Server-side timestamping using UTC clock; grade modification restricted strictly to authenticated course faculty.         |
| **Repudiation**            | User denying performing admin role changes or grading actions.                           | Medium   | Mandatory event logging to immutable MongoDB `AuditLog` collection with user ID, action, timestamp, and IP hash.          |
| **Information Disclosure** | Student accessing unreleased assignment solutions, or peer submissions.                  | High     | Strict workspace isolation; student submissions only queryable by submitting student or assigned course faculty.          |
| **Denial of Service**      | Malicious infinite loop in Python code (`while True: pass`) or massive array allocation. | Medium   | Client-side Web Worker execution with 30s timeout killer; main UI thread remains responsive.                              |
| **Elevation of Privilege** | Student promoting own account to `admin` via API parameter tampering.                    | Critical | User `role` field protected from standard user update routes; role mutation restricted to `/api/v1/admin/users/:id/role`. |

---

## 3. Residual Risk & Mitigation Matrix

1. **Client-Side Simulation Integrity:** Python simulations run locally in the browser. A student could theoretically reverse engineer or inspect JS memory.
   - _Mitigation:_ Assignments are validated by professors through the side-by-side code review and the server-side AST-normalized Winnowing similarity detector.
2. **COOP/COEP Header Dependency:** Cross-origin asset loading required strict headers.
   - _Mitigation:_ All Pyodide and WebAssembly wheels are locally bundled and served under `/pyodide/314.0.3/` with immutable cache headers.
