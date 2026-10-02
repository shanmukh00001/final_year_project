# V-Lab ECE: REST API Specification

Base path: `/api` (same origin as the SPA). Content type: `application/json; charset=utf-8`.
Canonical route paths in this file **override** shorthand paths shown in diagrams in earlier docs.

## 1. Conventions

### 1.1 Authentication

`Authorization: Bearer <accessToken>` on all routes except those marked **Public**. Refresh uses an httpOnly cookie (see `SECURITY_ARCHITECTURE.md`).

### 1.2 Success Envelope

```json
{ "data": {}, "meta": { "requestId": "uuid" } }
```

Lists add `"meta": { "page": 1, "pageSize": 25, "total": 133, "requestId": "uuid" }`.

### 1.3 Error Envelope

```json
{
  "error": {
    "code": "E_VALIDATION",
    "message": "Human-readable summary",
    "details": [{ "path": "email", "message": "Invalid email" }],
    "requestId": "uuid"
  }
}
```

### 1.4 Error Codes

| HTTP | Code                                                           | Meaning                                                   |
| ---- | -------------------------------------------------------------- | --------------------------------------------------------- |
| 400  | `E_BAD_REQUEST`                                                | Malformed JSON                                            |
| 401  | `E_UNAUTHENTICATED`                                            | Missing, invalid, or expired token                        |
| 401  | `E_INVALID_CREDENTIALS`                                        | Wrong email/password (generic)                            |
| 403  | `E_FORBIDDEN`                                                  | Role lacks permission                                     |
| 403  | `E_ACCOUNT_DISABLED`                                           | User deactivated                                          |
| 404  | `E_NOT_FOUND`                                                  | Also returned for resources the caller may not know exist |
| 409  | `E_CONFLICT`, `E_LIMIT_WORKSPACE_COUNT`, `E_ALREADY_SUBMITTED` | State conflicts                                           |
| 413  | `E_LIMIT_WORKSPACE`                                            | Payload above 200 KB                                      |
| 422  | `E_VALIDATION`, `E_EMAIL_DOMAIN`, `E_MARKS_RANGE`              | Semantic validation                                       |
| 429  | `E_RATE_LIMITED`                                               | Includes `Retry-After`                                    |
| 500  | `E_INTERNAL`                                                   | No internals leaked                                       |

### 1.5 Pagination, Sorting

Query: `page` (default 1), `pageSize` (default 25, max 100), `sort` (e.g. `-createdAt`). Server-side only.

### 1.6 Rate Limits

| Scope                                  | Limit                                                                                           |
| -------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `POST /api/auth/*`                     | 10 requests per minute per IP; login lockout after 5 failures per email in 15 min (AC-AUTH-005) |
| Authenticated API                      | 120 requests per minute per user                                                                |
| `POST /api/assignments/:id/submission` | 10 per minute per user                                                                          |
| `POST /api/events/engine`              | 30 per minute per IP                                                                            |

### 1.7 Validation

All bodies are validated with Zod schemas exported from `packages/shared/src/schemas/*.ts` using `.strict()` (unknown keys → 422). Strings are trimmed. No operator keys (`$`-prefixed) are accepted anywhere (NoSQL injection guard).

## 2. Auth

| Method | Path                        | Auth   | Description                                           |
| ------ | --------------------------- | ------ | ----------------------------------------------------- |
| POST   | `/api/auth/register`        | Public | Register (students; professor/admin created by admin) |
| POST   | `/api/auth/login`           | Public | Returns access token, sets refresh cookie             |
| POST   | `/api/auth/refresh`         | Cookie | Rotates refresh token; returns new access token       |
| POST   | `/api/auth/logout`          | Cookie | Revokes token family; clears cookie                   |
| GET    | `/api/auth/me`              | Bearer | Current user                                          |
| PATCH  | `/api/auth/me`              | Bearer | Update name and preferences                           |
| POST   | `/api/auth/password/forgot` | Public | Always `202` (no account enumeration)                 |
| POST   | `/api/auth/password/reset`  | Public | Consumes reset token                                  |
| POST   | `/api/auth/password/change` | Bearer | Requires current password                             |

**POST `/api/auth/register`**

```json
// request
{ "email": "23je0001@iitism.ac.in", "password": "S3cure-passphrase!", "name": "Shanmukh Kumar",
  "rollNo": "23JE0001", "programme": "BTech", "batchYear": 2023 }
// 201
{ "data": { "user": { "id": "66f0...", "email": "23je0001@iitism.ac.in", "name": "Shanmukh Kumar",
  "role": "student", "rollNo": "23JE0001", "programme": "BTech", "batchYear": 2023, "sectionIds": [] },
  "accessToken": "eyJ...", "expiresIn": 900 }, "meta": { "requestId": "..." } }
```

Errors: `422 E_EMAIL_DOMAIN`, `422 E_VALIDATION` (password < 10 chars), `409 E_CONFLICT` (email exists; returns the same shape as a validation error to avoid enumeration where feasible; registration cannot hide it fully, so rate limiting applies).

**POST `/api/auth/login`**

```json
// request
{ "email": "23je0001@iitism.ac.in", "password": "S3cure-passphrase!" }
// 200  (Set-Cookie: vlab_rt=...; HttpOnly; Secure; SameSite=Strict; Path=/api/auth; Max-Age=1209600)
{ "data": { "user": { "id": "66f0...", "role": "student", "name": "Shanmukh Kumar", "preferences": { "theme": "system", "editorFontSize": 14, "liveRun": false } },
  "accessToken": "eyJ...", "expiresIn": 900 } }
```

Errors: `401 E_INVALID_CREDENTIALS`, `403 E_ACCOUNT_DISABLED`, `429 E_RATE_LIMITED`.

**POST `/api/auth/refresh`**: request body empty, header `X-Requested-With: vlab`. 200 same shape as login without `user`. `401` on missing/reused token; reuse revokes the whole family.

## 3. Catalogue

Experiment definitions ship inside the SPA bundle (`packages/experiments`). The API only supplies enable/disable overrides.

| Method | Path                               | Auth   | Description                            |
| ------ | ---------------------------------- | ------ | -------------------------------------- |
| GET    | `/api/catalog/settings`            | Public | `{ disabled: ["DIP-07"], serverTime }` |
| PUT    | `/api/admin/catalog/:experimentId` | Admin  | Body `{ "enabled": false }`            |

```json
// GET /api/catalog/settings 200
{ "data": { "disabled": ["DIP-07"], "serverTime": "2026-10-01T10:00:00.000Z" } }
```

## 4. Saved Workspaces (Student, Professor, Admin: own data only)

| Method | Path                                            | Description                                                                   |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| GET    | `/api/workspaces?experimentId=&page=&pageSize=` | List own                                                                      |
| POST   | `/api/workspaces`                               | Create                                                                        |
| GET    | `/api/workspaces/:id`                           | Read own                                                                      |
| PUT    | `/api/workspaces/:id`                           | Replace; requires `If-Match: <revision>` header, `409 E_CONFLICT` on mismatch |
| DELETE | `/api/workspaces/:id`                           | Delete own                                                                    |

```json
// POST /api/workspaces request
{ "name": "FIR attempt 1", "experimentId": "DSP-03", "experimentVersion": 2,
  "files": [{ "path": "main.py", "content": "import numpy as np\nfrom scipy import signal\n..." }],
  "mainFile": "main.py", "parameters": { "numtaps": 51, "fc": 0.3 }, "layout": { "version": 1, "panes": {} } }
// 201
{ "data": { "id": "66f1...", "name": "FIR attempt 1", "experimentId": "DSP-03", "revision": 1, "sizeBytes": 1432,
  "createdAt": "2026-10-01T10:05:00.000Z", "updatedAt": "2026-10-01T10:05:00.000Z" } }
```

Errors: `413 E_LIMIT_WORKSPACE`, `409 E_LIMIT_WORKSPACE_COUNT` (51st), `409 E_CONFLICT` (duplicate name), `404` for another user's id (AC-SAVE-004).

## 5. Assignments (Student view)

| Method | Path                              | Description                                                                           |
| ------ | --------------------------------- | ------------------------------------------------------------------------------------- |
| GET    | `/api/assignments?status=`        | Assignments for the student's sections; `status` filter by derived status             |
| GET    | `/api/assignments/:id`            | Detail incl. effective due date (extension-aware)                                     |
| PUT    | `/api/assignments/:id/workspace`  | Upsert the student's working draft (stored in `saved_workspaces` with `assignmentId`) |
| POST   | `/api/assignments/:id/submission` | Submit snapshot                                                                       |
| GET    | `/api/assignments/:id/submission` | Own submission with grade                                                             |

**Derived status** (computed server-side): `not_started`, `in_progress`, `submitted`, `late_submitted`, `graded`, `missed`.

```json
// GET /api/assignments 200
{ "data": [{
    "id": "66f0a1b2c3d4e5f607182930", "courseCode": "DSP", "experimentId": "DSP-03",
    "title": "FIR Filter Design: Window Method", "dueAt": "2026-11-15T18:29:00.000Z",
    "effectiveDueAt": "2026-11-15T18:29:00.000Z", "maxMarks": 10, "allowLate": true,
    "status": "in_progress", "grade": null }],
  "meta": { "page": 1, "pageSize": 25, "total": 1, "requestId": "..." } }

// POST /api/assignments/:id/submission request
{ "files": [{ "path": "main.py", "content": "..." }], "parameters": { "numtaps": 51 },
  "experimentVersion": 2, "reportText": "Kaiser beta=8 gave 60 dB stopband attenuation.",
  "outputsMeta": [{ "figureId": "bode", "kind": "bode", "traceCount": 2 }],
  "engine": { "pyodideVersion": "314.0.3", "numpy": "2.4.3", "scipy": "1.17.1" } }
// 200
{ "data": { "id": "66f2...", "status": "submitted", "isLate": false,
  "firstSubmittedAt": "2026-11-10T09:00:00.000Z", "lastSubmittedAt": "2026-11-10T09:00:00.000Z" } }
```

Errors: `404` if not in the student's sections; `409 E_ALREADY_SUBMITTED` if `allowResubmit == false` and one exists; `403 E_PAST_DEADLINE` if past effective due date and late not allowed (or past `lateUntil`); `413 E_LIMIT_WORKSPACE`.

## 6. Professor

| Method | Path                                                                      | Description                                         |
| ------ | ------------------------------------------------------------------------- | --------------------------------------------------- |
| GET    | `/api/professor/sections`                                                 | Sections the professor teaches                      |
| GET    | `/api/professor/assignments`                                              | Own assignments (paged)                             |
| POST   | `/api/professor/assignments`                                              | Create (status `draft` or `published`)              |
| GET    | `/api/professor/assignments/:id`                                          | Detail                                              |
| PUT    | `/api/professor/assignments/:id`                                          | Update (cannot change `experimentId` after publish) |
| POST   | `/api/professor/assignments/:id/publish`                                  | Publish                                             |
| POST   | `/api/professor/assignments/:id/close`                                    | Close                                               |
| DELETE | `/api/professor/assignments/:id`                                          | Only if `draft` or no submissions                   |
| POST   | `/api/professor/assignments/:id/extensions`                               | Body `{ "userId": "...", "dueAt": "..." }`          |
| GET    | `/api/professor/assignments/:id/submissions?section=&status=&sort=&page=` | Roster with status per assigned student             |
| GET    | `/api/professor/submissions/:id`                                          | Full snapshot (read-only workspace load)            |
| PUT    | `/api/professor/submissions/:id/grade`                                    | Set or override grade                               |
| GET    | `/api/professor/assignments/:id/analytics`                                | Distribution and rates                              |
| GET    | `/api/professor/assignments/:id/similarity?threshold=0.8`                 | Similar pairs                                       |
| GET    | `/api/professor/assignments/:id/grades.csv`                               | CSV export                                          |

```json
// POST /api/professor/assignments request
{ "courseCode": "DSP", "experimentId": "DSP-03", "experimentVersion": 2,
  "title": "FIR Filter Design: Window Method", "instructions": "## Task\nDesign...",
  "sectionIds": ["66f0a1b2c3d4e5f607182921"], "dueAt": "2026-11-15T18:29:00.000Z",
  "allowLate": true, "lateUntil": "2026-11-18T18:29:00.000Z", "allowResubmit": true, "maxMarks": 10,
  "starterCodeOverride": null, "parameterOverrides": { "numtaps": 51 }, "status": "published" }
// 201 { "data": { "id": "66f0a1b2c3d4e5f607182930", "status": "published" } }

// PUT /api/professor/submissions/:id/grade request
{ "marks": 8.5, "feedback": "Good window comparison. Add transition width discussion." }
// 200
{ "data": { "submissionId": "66f2...", "grade": { "marks": 8.5, "feedback": "...", "gradedAt": "2026-11-16T07:30:00.000Z" }, "status": "graded" } }
```

Errors: `422 E_MARKS_RANGE` (outside `[0, maxMarks]` or not a multiple of 0.5), `403 E_FORBIDDEN` if the professor is not assigned to the assignment's sections, `422 E_VALIDATION` (`feedback` > 2000 chars).

```json
// GET /api/professor/assignments/:id/analytics 200
{ "data": { "assigned": 62, "submitted": 54, "submissionRate": 0.87, "graded": 40,
  "histogram": { "binEdges": [0,1,2,3,4,5,6,7,8,9,10], "counts": [0,0,1,2,3,5,9,10,7,3] },
  "mean": 6.9, "median": 7.0 } }

// GET /api/professor/assignments/:id/similarity 200
{ "data": { "threshold": 0.8, "pairs": [{ "a": "66f2...", "b": "66f3...", "score": 0.97 }] } }
```

CSV header exactly: `roll_no,name,email,marks,max_marks,status,submitted_at`, UTF-8 with BOM (AC-PROF-003).

## 7. Admin

| Method | Path                                               | Description                             |
| ------ | -------------------------------------------------- | --------------------------------------- |
| GET    | `/api/admin/users?role=&q=&isActive=&page=`        | List/search                             |
| POST   | `/api/admin/users`                                 | Create user (any role)                  |
| GET    | `/api/admin/users/:id`                             | Read                                    |
| PATCH  | `/api/admin/users/:id`                             | Update name, role, sections, `isActive` |
| POST   | `/api/admin/users/import`                          | Multipart CSV (≤ 1 MB, ≤ 2,000 rows)    |
| DELETE | `/api/admin/users/:id/data`                        | Erase user and data (`PRIVACY.md`)      |
| GET    | `/api/admin/courses`                               | List                                    |
| POST   | `/api/admin/courses/:courseId/sections`            | Add section                             |
| PATCH  | `/api/admin/courses/:courseId/sections/:sectionId` | Rename, set professors                  |
| GET    | `/api/admin/audit?actor=&action=&from=&to=&page=`  | Audit log (read-only)                   |
| GET    | `/api/admin/stats?from=&to=`                       | Usage statistics                        |

```json
// POST /api/admin/users/import  (multipart field "file"; CSV header: email,name,rollNo,programme,batchYear,sectionNames)
// 200
{ "data": { "created": 482, "skippedDuplicates": 13, "errors": [{ "line": 77, "message": "Invalid programme 'Btech2'" }] } }

// PATCH /api/admin/users/:id request
{ "role": "professor", "isActive": true }
// 200 { "data": { "id": "66f0...", "role": "professor", "isActive": true } }
// Side effects: tokenVersion++ ; audit_logs entry user.role_change

// GET /api/admin/stats 200
{ "data": { "from": "2026-10-01", "to": "2026-10-31",
  "dailyActiveUsers": [{ "date": "2026-10-01", "count": 112 }],
  "totalRuns": 18432, "engineErrorRate": 0.004, "coldStartP75Ms": 14200, "warmStartP75Ms": 3600 } }
```

## 8. Telemetry (privacy-minimal)

| Method | Path                 | Auth     | Description                   |
| ------ | -------------------- | -------- | ----------------------------- |
| POST   | `/api/events/engine` | Optional | Anonymous-by-default counters |

```json
{
  "event": "engine_ready",
  "durationMs": 3510,
  "cache": "warm",
  "isolated": true,
  "deviceProfile": "desktop",
  "pyodideVersion": "314.0.3"
}
```

Allowed `event` values: `engine_ready`, `run_started`, `run_completed`, `run_failed`, `engine_crash`. **No code, filenames, or output** is ever sent. 204 on success.

## 9. Health

`GET /api/health` (Public) → `{ "data": { "status": "ok", "db": "up", "time": "..." } }`. Does not leak versions.

## 10. Role Matrix

| Route group             | student | professor | admin | guest                      |
| ----------------------- | ------- | --------- | ----- | -------------------------- |
| `/api/auth/*`           | yes     | yes       | yes   | register/login/forgot only |
| `/api/catalog/settings` | yes     | yes       | yes   | yes                        |
| `/api/workspaces*`      | own     | own       | own   | no                         |
| `/api/assignments*`     | yes     | no        | no    | no                         |
| `/api/professor/*`      | no      | yes       | no    | no                         |
| `/api/admin/*`          | no      | no        | yes   | no                         |
| `/api/events/engine`    | yes     | yes       | yes   | yes                        |

## 11. Implementation Notes for the Agent

- Route modules: `apps/api/src/routes/{auth,catalog,workspaces,assignments,professor,admin,events}.ts`.
- Middleware order: `requestId` → `helmet` → `cors` → `json({ limit: "300kb" })` → `rateLimit` → `authenticate` (where required) → `authorize(...roles)` → `validate(zodSchema)` → handler → `errorHandler`.
- Assignment authorisation for professors: the assignment's `sectionIds` must intersect the professor's sections, or `createdBy == professorId`; otherwise `403`.
- Every state-changing admin/professor action writes an `audit_logs` entry in the same request.
- The API **must not** expose any route that evaluates, imports, or transpiles submitted code (CI check `no-code-eval-routes`).
