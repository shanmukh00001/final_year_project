# V-Lab ECE: User Flows

All diagrams use Mermaid. Node names are normative; implementations of state machines (e.g., XState machines in `apps/web/src/state/machines/`) must use the **same state and event names**.

## 1. Pyodide Worker Lifecycle (State Machine)

```mermaid
stateDiagram-v2
    [*] --> Uninitialized
    Uninitialized --> Booting: APP_MOUNTED spawn worker
    Booting --> LoadingRuntime: WORKER_SCRIPT_LOADED
    LoadingRuntime --> LoadingPackages: PYODIDE_READY
    LoadingRuntime --> Failed: NETWORK_ERROR or WASM_UNSUPPORTED
    LoadingPackages --> Bootstrapping: PACKAGES_LOADED
    LoadingPackages --> Failed: PACKAGE_LOAD_ERROR
    Bootstrapping --> Ready: VLAB_MODULE_INSTALLED
    Bootstrapping --> Failed: BOOTSTRAP_ERROR
    Ready --> Running: RUN_REQUESTED
    Ready --> Restarting: RESTART_REQUESTED
    Running --> Ready: RUN_COMPLETED
    Running --> Ready: RUN_FAILED python exception
    Running --> Cancelling: STOP_REQUESTED
    Running --> Terminated: RUN_TIMEOUT
    Running --> Terminated: OOM_DETECTED
    Cancelling --> Ready: INTERRUPT_ACKNOWLEDGED
    Cancelling --> Terminated: CANCEL_GRACE_EXPIRED
    Restarting --> Booting: WORKER_TERMINATED
    Terminated --> Booting: AUTO_RESPAWN
    Failed --> Booting: RETRY attempts less than 3
    Failed --> [*]: GIVE_UP show offline help
```

**Rules**

- `Ready`, `Running`, `Cancelling`, and `Terminated` are the only states in which the UI shows the editor as enabled; Run is disabled outside `Ready`.
- On `Terminated` the console prints a red system message explaining the reason (timeout, out of memory, cancelled) and the kernel variables are reset.
- Retry uses exponential backoff 1 s, 2 s, 4 s.

## 2. Workspace Compilation / Execution Flow (End-to-End)

```mermaid
flowchart TD
    A([User presses Run / Ctrl+Enter]) --> B{Worker state is Ready?}
    B -- No --> B1[Show toast: Engine not ready, queue run until Ready] --> B2{Ready within 60 s?}
    B2 -- Yes --> C
    B2 -- No --> Z1[Show engine failure panel with Retry]
    B -- Yes --> C[Lint step: parse Python with lightweight AST check in main thread]
    C --> D{Syntax error?}
    D -- Yes --> D1[Mark line in editor, print SyntaxError to console] --> END1([Run aborted, state stays Ready])
    D -- No --> E[Static policy scan: forbidden imports and attributes]
    E --> F{Policy violation?}
    F -- Yes --> F1[Show E_POLICY_VIOLATION with offending line] --> END1
    F -- No --> G[Create runId, post RUN_CODE message to worker]
    G --> H[Worker: reset stdout/stderr buffers, set interrupt flag to 0, start wall-clock timer]
    H --> I[Worker: detect imports, load missing allowlisted packages]
    I --> J{Packages loaded?}
    J -- No --> J1[Worker posts RUN_FAILED with E_PACKAGE_LOAD] --> END2
    J -- Yes --> K[Worker: runPythonAsync with user code in persistent globals]
    K --> L{Outcome}
    L -- Stdout/Stderr text --> L1[Worker posts STREAM_OUTPUT batched at most 60 per second] --> K
    L -- vlab.plot / pyplot.show --> L2[Worker serialises figure spec JSON or PNG and posts FIGURE_READY] --> L3[UI plot adapter renders in Plotly/ECharts] --> K
    L -- Python exception --> M[Worker maps traceback to user lines, posts RUN_FAILED] --> END2
    L -- Completed --> N[Worker snapshots globals metadata, posts VARIABLES_UPDATED then RUN_COMPLETED]
    L -- Timeout or OOM or Cancel unresponsive --> O[Main thread terminates worker and posts system message] --> P[Respawn worker, state Terminated then Booting]
    N --> Q[UI updates console, variable inspector, plot panel, status bar with elapsed ms]
    M --> Q2[UI shows error inline in editor and console]
    Q --> END3([Run finished, state Ready])
    Q2 --> END2([Run finished with error, state Ready])
    END2 --> END2
```

(Note: `END2` is a terminal marker; implementations must not loop.)

## 3. Cooperative Cancellation Sequence

```mermaid
sequenceDiagram
    participant U as User
    participant UI as React UI
    participant M as Worker Manager (main thread)
    participant W as Pyodide Worker
    participant S as SharedArrayBuffer interrupt flag

    U->>UI: Click Stop
    UI->>M: stop(runId)
    alt Cross-origin isolated (SAB available)
        M->>S: Atomics.store(flag, 0, 2) SIGINT
        W->>W: Pyodide checks interrupt buffer, raises KeyboardInterrupt
        W-->>M: RUN_CANCELLED(runId)
        M-->>UI: state Ready
    else SAB unavailable
        M->>W: worker.terminate()
        M->>M: spawn new worker, state Booting
        M-->>UI: state Booting (kernel reset notice)
    end
    opt No acknowledgement within CANCEL_GRACE_MS (2000 ms)
        M->>W: worker.terminate()
        M->>M: spawn new worker
        M-->>UI: Show "Run force-stopped, kernel reset"
    end
```

## 4. Authentication Flow

```mermaid
flowchart TD
    A([Visit /]) --> B{Has valid access token in memory?}
    B -- Yes --> H[Load dashboard by role]
    B -- No --> C{Refresh cookie present?}
    C -- Yes --> D[POST /api/auth/refresh]
    D --> E{200 OK?}
    E -- Yes --> H
    E -- No --> F[Redirect /login]
    C -- No --> G{Public route?}
    G -- Yes --> G1[Guest mode: run public experiments, saving disabled]
    G -- No --> F
    F --> I[Submit email and password]
    I --> J[POST /api/auth/login]
    J --> K{Credentials valid and account active?}
    K -- No --> L[Show generic error, rate-limit counter increments] --> F
    K -- Yes --> M[Receive access token JSON and refresh cookie httpOnly]
    M --> H
    H --> N{Role}
    N -- student --> N1[/student: catalogue, assignments, workspaces]
    N -- professor --> N2[/professor: assignments, submissions, analytics]
    N -- admin --> N3[/admin: users, courses, audit]
```

## 5. Student Assignment Lifecycle

```mermaid
stateDiagram-v2
    [*] --> NotStarted: Professor publishes assignment
    NotStarted --> InProgress: Student opens assignment, workspace draft created
    InProgress --> InProgress: Autosave and run
    InProgress --> Submitted: SUBMIT before due date
    InProgress --> LateSubmitted: SUBMIT after due date and late allowed
    InProgress --> Missed: Due date passes and late not allowed
    Submitted --> InProgress: RESUBMIT_ALLOWED before due date (replaces snapshot)
    Submitted --> UnderReview: Professor opens submission
    LateSubmitted --> UnderReview: Professor opens submission
    UnderReview --> Graded: Professor saves marks and feedback
    Graded --> Graded: Professor edits grade (audit logged)
    Missed --> LateSubmitted: Professor grants extension
    Graded --> [*]
```

## 6. Professor Grading Flow

```mermaid
sequenceDiagram
    participant P as Professor
    participant UI as Web App
    participant API as Express API
    participant DB as MongoDB
    participant W as Local Pyodide Worker

    P->>UI: Open assignment submissions
    UI->>API: GET /assignments/:id/submissions
    API->>DB: query submissions
    DB-->>API: list
    API-->>UI: list with statuses
    P->>UI: Open one submission
    UI->>API: GET /submissions/:id
    API-->>UI: code, parameters, metadata
    UI->>W: RUN_CODE (read-only workspace, professor's own browser)
    W-->>UI: figures, stdout
    P->>UI: Enter marks and feedback
    UI->>API: PUT /submissions/:id/grade
    API->>DB: update grade, write audit entry
    API-->>UI: 200 OK
    UI-->>P: Show saved, notify student
```

## 7. Experiment Session Flow (Student, happy path)

```mermaid
flowchart LR
    A[Login] --> B[Catalogue]
    B --> C[Select experiment]
    C --> D[Workspace loads starter code and theory]
    D --> E{Engine ready?}
    E -- No --> E1[Progress bar: runtime, packages, bootstrap] --> E
    E -- Yes --> F[Edit code or adjust sliders]
    F --> G[Run]
    G --> H[View plots, console, variables]
    H --> I{Satisfied?}
    I -- No --> F
    I -- Yes --> J[Save workspace or Submit assignment]
    J --> K[Export report assets optional]
```

## 8. Error and Recovery Matrix

| Failure                 | Detection                        | User-visible behaviour                           | Automatic recovery                                           |
| ----------------------- | -------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| WebAssembly unsupported | Feature check at boot            | Compatibility page with supported browsers       | None                                                         |
| Runtime download fails  | Fetch error or integrity failure | Engine failure panel, Retry button               | Retry x3 with backoff                                        |
| Python exception        | Worker `RUN_FAILED`              | Inline marker + traceback                        | State `Ready`                                                |
| Infinite loop           | Timeout or Stop                  | System message "Run stopped"                     | Interrupt or terminate and respawn                           |
| Out of memory           | Watchdog or worker `error` event | System message with advice to reduce array sizes | Terminate, respawn                                           |
| API unreachable on save | Fetch fails                      | Toast "Saved locally, will sync"                 | Retry queue, IndexedDB draft retained                        |
| Token expired           | 401                              | Silent refresh                                   | One refresh attempt, else redirect to login preserving draft |
