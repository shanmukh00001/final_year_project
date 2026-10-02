# V-Lab ECE: Production Monitoring & Telemetry Architecture

**Document Version:** 1.0.0  
**Target:** Health Checks, APM, Client-Side Engine Telemetry, and Operational Runbooks

---

## 1. System Health & Probes

| Probe Endpoint             | Target Protocol       | Expected Response                                               | Description                                                |
| :------------------------- | :-------------------- | :-------------------------------------------------------------- | :--------------------------------------------------------- |
| `GET /api/health`          | HTTP/1.1              | `{"status": "ok", "timestamp": "...", "database": "connected"}` | Kubernetes / Load Balancer liveness and readiness probe.   |
| `GET /api/v1/admin/vitals` | HTTP/1.1 (Admin Auth) | `{"students": 420, "faculty": 18, "workspaces": 1250, ...}`     | Institutional operational metrics and storage utilization. |

---

## 2. Client-Side Simulation Telemetry

The Pyodide Web Worker reports execution metrics on every simulation run:

- **Execution Wall Time:** Captured via `performance.now()` in WebAssembly runtime.
- **Memory Allocation:** Tracked via WebAssembly heap memory sizing.
- **Engine Downgrade / Error Metrics:** Failures loading binary packages or unhandled Python runtime exceptions are forwarded to the console diagnostics pane.

---

## 3. Log Aggregation & Security Auditing

- **HTTP Access Logs:** Standard Morgan / Winston structured JSON logging with request IDs, status codes, latency, and route parameters.
- **Audit Logs:** Database-persisted events for administrative role modifications, mass CSV imports, grade submissions, and authentication failures.
- **Alerting Thresholds:**
  - Database connection loss $\rightarrow$ Critical P1 Alert.
  - API error rate $> 1\%$ in a 5-minute rolling window $\rightarrow$ P2 Alert.
  - Pyodide asset fetch failure rate $> 0.1\%$ $\rightarrow$ P2 Alert.
