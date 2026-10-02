# V-Lab ECE: UI Specification

Covers application pages and the split-pane MATLAB-like workspace. Tokens: `DESIGN_SYSTEM.md`. Breakpoint behaviour: `RESPONSIVE_DESIGN.md`. Implementation library: `react-resizable-panels` (nested `PanelGroup`s).

## 1. Route Map

| Route                                                                                                              | Page                                                                                      | Roles                                |
| ------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------- | ------------------------------------ |
| `/login`, `/register`, `/forgot`, `/reset/:token`                                                                  | Auth                                                                                      | Public                               |
| `/`                                                                                                                | Redirect by role (`/catalog` for student, `/professor` for professor, `/admin` for admin) | Any                                  |
| `/catalog`                                                                                                         | Course and experiment catalogue                                                           | Any (guest: public experiments only) |
| `/lab/:experimentId`                                                                                               | Workspace                                                                                 | Any (save requires login)            |
| `/lab/:experimentId?assignment=:id`                                                                                | Workspace bound to an assignment                                                          | Student                              |
| `/lab/review/:submissionId`                                                                                        | Read-only submission review workspace                                                     | Professor                            |
| `/workspaces`                                                                                                      | My saved workspaces                                                                       | Logged in                            |
| `/assignments`, `/assignments/:id`                                                                                 | Student assignments                                                                       | Student                              |
| `/professor`, `/professor/assignments/new`, `/professor/assignments/:id`, `/professor/assignments/:id/submissions` | Professor dashboard                                                                       | Professor                            |
| `/admin/users`, `/admin/courses`, `/admin/audit`, `/admin/stats`, `/admin/experiments`                             | Admin                                                                                     | Admin                                |
| `/settings`                                                                                                        | Theme, editor font size, live-run default                                                 | Logged in                            |

All page routes are lazy-loaded; the workspace chunk is the largest and is prefetched on catalogue hover.

## 2. Workspace Layout (Desktop ≥ 1024 px)

### 2.1 Wireframe

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ TOPBAR 48px: [≡ V-Lab ECE] [DSP-03 FIR Filter Design ▾]   [▶ Run][■ Stop][↻ Restart][Live ▢] │
│                                              [Save][Submit][Export ▾][Theme][User ▾]          │
├────┬─────────────────┬──────────────────────────────────────────┬────────────────────────────┤
│ A  │ EXPLORER 18%    │ EDITOR TABS: main.py ● | Theory | Instructions │ PLOTS 40% width        │
│ C  │ ▸ Files         │ ┌──────────────────────────────────────┐ │ [Fig1][Bode][PZ][+]  [⤢]   │
│ T  │   main.py       │ │ 1  import numpy as np                │ │ ┌────────────────────────┐ │
│ I  │   helpers.py    │ │ 2  from scipy import signal          │ │ │                        │ │
│ V  │   data/         │ │ 3  ...                               │ │ │     Plotly figure      │ │
│ I  │ ▸ Parameters    │ │                                      │ │ │                        │ │
│ T  │   fc  [──●──]   │ └──────────────────────────────────────┘ │ └────────────────────────┘ │
│ Y  │   N   [──●──]   ├──────────── splitter (row) ──────────────┼──── splitter (row) ────────┤
│    │ ▸ Experiments   │ CONSOLE: [Output][Problems 2][System]  🗑 │ VARIABLES                  │
│ B  │   (course tree) │ >>> Engine ready (Python 3.14, 2.4s)      │ Name  Type    Shape  Value │
│ A  │                 │ numtaps = 51                              │ h     ndarray (51,)  [...] │
│ R  │                 │ Run finished in 412 ms                    │ fc    float   -      0.3   │
├────┴─────────────────┴──────────────────────────────────────────┴────────────────────────────┤
│ STATUSBAR 24px: ● Ready · Python 3.14 · numpy 2.4 · scipy 1.17 · Ln 12, Col 8 · Saved 10:42 │
└──────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 2.2 Panel Tree (normative)

```
<WorkspaceShell>                                   // CSS grid: rows [topbar auto][main 1fr][status auto]; cols [activitybar 48px][panels 1fr]
  <TopBar/>
  <ActivityBar/>                                   // icon buttons: Explorer, Search (post-MVP), Theory, Settings
  <PanelGroup direction="horizontal" autoSaveId="vlab.layout.v1.h">
    <Panel id="explorer" order={1} defaultSize={18} minSize={12} maxSize={30} collapsible collapsedSize={0}>
      <Explorer/>                                  // Files, Parameters, Experiments sections
    </Panel>
    <ResizeHandle/>
    <Panel id="center" order={2} defaultSize={42} minSize={25}>
      <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vc">
        <Panel id="editor" order={1} defaultSize={70} minSize={20}><EditorArea/></Panel>
        <ResizeHandle/>
        <Panel id="console" order={2} defaultSize={30} minSize={10} collapsible><ConsolePane/></Panel>
      </PanelGroup>
    </Panel>
    <ResizeHandle/>
    <Panel id="right" order={3} defaultSize={40} minSize={20}>
      <PanelGroup direction="vertical" autoSaveId="vlab.layout.v1.vr">
        <Panel id="plots" order={1} defaultSize={65} minSize={20}><PlotPane/></Panel>
        <ResizeHandle/>
        <Panel id="variables" order={2} defaultSize={35} minSize={10} collapsible><VariablesPane/></Panel>
      </PanelGroup>
    </Panel>
  </PanelGroup>
  <StatusBar/>
</WorkspaceShell>
```

- `data-testid` values: `pane-explorer`, `pane-editor`, `pane-console`, `pane-plots`, `pane-variables` on the Panel content wrappers (AC-WS-001).
- Minimum pane size 120 px is enforced with CSS `min-width/min-height: var(--size-pane-min)` in addition to `minSize` percentages (AC-WS-003).
- Layout persisted via `autoSaveId` into `localStorage` key prefix `vlab.layout.v1`. Also mirrored into `preferences` on save of a server workspace (`layout.panes`).
- "Reset layout" command in the Settings menu clears the keys and reloads defaults.
- Double-clicking a splitter collapses/expands the adjacent collapsible panel.
- Maximise buttons: each of Editor, Plots, Console has a maximise toggle (`Alt+M`) that hides siblings without destroying them.

## 3. Regions in Detail

### 3.1 TopBar (48 px)

| Control                       | Behaviour                                                                                                    |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Logo / menu                   | Opens app menu (Catalogue, My workspaces, Assignments, Settings, Logout)                                     |
| Experiment title and switcher | Dropdown of experiments in the same course; switching with unsaved changes asks to save                      |
| Run (`▶`)                     | `Ctrl/Cmd+Enter`; disabled unless engine state is `Ready`                                                    |
| Stop (`■`)                    | Shown while `Running`; `Ctrl/Cmd+.`; confirms nothing (instant)                                              |
| Restart kernel (`↻`)          | Terminates and respawns the worker; prompts if unsaved variables are in use only when run state is `Running` |
| Live toggle                   | When on, parameter changes trigger a run after 300 ms debounce (AC-WS-007)                                   |
| Save                          | `Ctrl/Cmd+S`; disabled for guests (tooltip "Log in to save")                                                 |
| Submit                        | Visible only with `?assignment=`; opens confirm modal summarising code size, files, due time, late status    |
| Export menu                   | Code `.py`, Plots (PNG/SVG, all or current), Data (CSV/NPY for selected variable), Workspace `.json`         |

### 3.2 Explorer (left)

- **Files:** tree of the virtual FS (`/work/*.py` editable; `/data/*` uploaded read-only with delete). Context menu: New file, Rename, Delete, Upload, Download. Max 10 files per workspace.
- **Parameters:** auto-generated from `vlab.param(...)` declarations (`PARAM_DECLARED` messages) plus experiment-defined parameters. Slider + numeric input pair; select and toggle types. Reset button restores defaults.
- **Experiments:** collapsible course tree (SS, NT, DSP, DIP, BEE, ACS, SSP) for quick switching. Disabled experiments hidden.

### 3.3 EditorArea

- Tab strip: file tabs (dirty dot `●`), plus fixed tabs **Theory** (rendered Markdown + KaTeX) and **Instructions** (assignment instructions when present).
- Monaco options: `language: "python"`, `minimap: { enabled: false }`, `scrollBeyondLastLine: false`, `automaticLayout: true`, `tabSize: 4`, `insertSpaces: true`, `renderWhitespace: "selection"`, `fontSize` from preferences, `readOnly` for review mode.
- Markers: errors from `RUN_FAILED` (`line`, `column`) are set with `monaco.editor.setModelMarkers` (owner `vlab`), cleared on next run or edit.
- Keybindings: `Ctrl/Cmd+Enter` run all; `Shift+Enter` run selection/current line; `Ctrl/Cmd+S` save; `Ctrl/Cmd+/` comment; `F1` command palette (Monaco's).
- No Monaco language service features that fetch from the network (Python has none loaded).

### 3.4 ConsolePane

Tabs: **Output** (stdout/stderr/system, chronological), **Problems** (list of errors and policy violations; click jumps to line), **System** (engine events, memory notes).

- Line colours via tokens `console-stdout|stderr|system|warning`.
- Ring buffer of 5,000 lines; "Output truncated" notice when exceeded.
- Batching: append in a `requestAnimationFrame` loop; virtualised list (`react-virtuoso` or in-house windowing) beyond 500 lines.
- Toolbar: Clear, Copy all, Auto-scroll toggle (on by default; pauses when user scrolls up).
- Traceback blocks render collapsed to the final error line with an expander for the full user-frame traceback.

### 3.5 PlotPane

- Tab strip with one tab per figure `id`; `+` is disabled (figures come from code). Tab context menu: Rename, Close, Export PNG, Export SVG, Pop out.
- Toolbar per figure: Zoom, Pan, Box select, Reset axes, Toggle grid, Toggle legend, Data table, Download PNG/SVG, Fullscreen.
- Subplot grid selector when more than one figure: "Tabs" or "Grid 2x2".
- Image figures show a pixel inspector footer: `(x, y) = (R, G, B) | gray`.
- Empty state: "Run your code to see plots here" with a keyboard hint.
- A figure re-emitted with the same `id` replaces data while preserving zoom (`uirevision`).

### 3.6 VariablesPane

Columns: Name, Type, Shape, Dtype, Preview (monospace, ellipsis). Row click opens a side drawer (`INSPECT_VARIABLE`) with a paged table (max 200 rows). Context menu: Copy name, Export CSV (≤ 2-D), Plot (quick plot of 1-D arrays via `vlab.plot`). Names starting with `_` hidden. Updates after each run (`VARIABLES_UPDATED`).

### 3.7 StatusBar (24 px)

Left: engine status pill (see below). Centre: versions. Right: cursor `Ln, Col`, save status ("Saved 10:42", "Unsaved changes", "Offline: saved locally"), run timing ("Last run 412 ms").

## 4. Engine Status UI (maps 1:1 to XState state names)

| Machine state          | Pill                                      | Run button       | Editor                                    | Extra UI                                       |
| ---------------------- | ----------------------------------------- | ---------------- | ----------------------------------------- | ---------------------------------------------- |
| Uninitialized, Booting | Amber "Starting"                          | Disabled         | Enabled                                   | Skeleton plots                                 |
| LoadingRuntime         | Amber "Loading Python"                    | Disabled         | Enabled                                   | Progress bar (percent) in a bottom sheet/toast |
| LoadingPackages        | Amber "Loading NumPy/SciPy"               | Disabled         | Enabled                                   | Progress bar                                   |
| Bootstrapping          | Amber "Preparing"                         | Disabled         | Enabled                                   |                                                |
| Ready                  | Green "Ready"                             | Enabled          | Enabled                                   |                                                |
| Running                | Blue spinner "Running 3.2 s" (live timer) | Replaced by Stop | Enabled (edits allowed, applied next run) | Console streaming                              |
| Cancelling             | Blue "Stopping…"                          | Disabled         | Enabled                                   |                                                |
| Restarting             | Amber "Restarting"                        | Disabled         | Enabled                                   |                                                |
| Terminated             | Red "Stopped" then immediately Booting    | Disabled         | Enabled                                   | System message with reason                     |
| Failed                 | Red "Engine failed"                       | Disabled         | Enabled                                   | Failure panel with Retry                       |

Queued run: pressing Run while not Ready shows a toast "Run queued until engine is ready" and runs automatically when `Ready` (timeout 60 s).

## 5. Other Pages (layout contracts)

### 5.1 Catalogue (`/catalog`)

- Header with search input (filters by title/ID/keyword) and level filter chips (UG, PG).
- Seven course sections; each is a card grid (3 columns ≥ 1024 px, 2 ≥ 640 px, 1 below). Experiment card: ID badge (`DSP-03`), title, one-line objective, estimated runtime, tags, "Open" button. Assignment-linked experiments show a due-date badge.
- Prefetch workspace chunk on card hover/focus.

### 5.2 Assignments (student)

Table or cards sorted by due date: title, course, due (with relative time), status badge, marks. Filters by status. Click opens `/assignments/:id` detail (instructions, due, status, "Open workspace", "View feedback").

### 5.3 Professor dashboard

- Overview cards: active assignments, submissions awaiting grading, average score, late rate.
- Assignment list with progress bars (`submitted/assigned`).
- Assignment detail tabs: **Submissions** (server-paged table; columns: roll no, name, status, submitted at, late flag, marks; row action: Open review), **Analytics** (score histogram with 10 bins; submission rate donut), **Similarity** (pairs table), **Settings** (edit due date, extensions).
- Review workspace (`/lab/review/:submissionId`): same workspace shell with editor `readOnly`, a right-hand **Grading drawer** (marks input step 0.5, feedback textarea with 2,000 char counter, "Save grade", previous/next submission arrows), a banner "Read-only snapshot. Run executes in your browser".

### 5.4 Admin

Users table (search, role/active filters, row actions Edit, Deactivate, Erase data), Import CSV dialog with line-by-line error report, Courses and sections editor, Audit log table (filter by actor/action/date), Stats page (line chart of daily active users, tiles for runs and error rate), Experiments toggle list.

### 5.5 Auth pages

Centred card 400 px wide; fields with inline Zod errors; password field with show/hide; generic error banner for failed login; "Continue as guest" link to `/catalog`.

## 6. States for Every Data View

| State   | Pattern                                                                   |
| ------- | ------------------------------------------------------------------------- |
| Loading | Skeletons matching final layout; no spinners over 300 ms without skeleton |
| Empty   | Illustration-free text + primary action ("No assignments yet")            |
| Error   | Inline banner with `Retry`; includes `requestId` in small text            |
| Offline | Top banner "You are offline. Work is saved locally."                      |

## 7. Keyboard Shortcut Table

| Shortcut           | Action                                            |
| ------------------ | ------------------------------------------------- |
| `Ctrl/Cmd+Enter`   | Run all                                           |
| `Shift+Enter`      | Run selection or current line                     |
| `Ctrl/Cmd+.`       | Stop                                              |
| `Ctrl/Cmd+S`       | Save workspace                                    |
| `Ctrl/Cmd+B`       | Toggle explorer                                   |
| `Ctrl/Cmd+J`       | Toggle console                                    |
| `Alt+M`            | Maximise focused pane                             |
| `Ctrl/Cmd+Shift+L` | Clear console                                     |
| `Alt+1..5`         | Focus Explorer, Editor, Console, Plots, Variables |
| `Esc`              | Close modal or drawer                             |
| `?`                | Shortcut help overlay                             |

## 8. Persisted UI State Schema

```ts
// localStorage key "vlab.layout.v1" (written by react-resizable-panels) and "vlab.ui.v1"
interface UiPrefs {
  version: 1;
  theme: "system" | "light" | "dark";
  editorFontSize: number; // 10..24
  liveRun: boolean;
  consoleAutoScroll: boolean;
  plotsMode: "tabs" | "grid";
  collapsed: { explorer: boolean; console: boolean; variables: boolean };
}
```

Reading must be wrapped in try/catch; invalid data resets to defaults.

## 9. Component Names (for agent file creation)

`apps/web/src/features/workspace/`: `WorkspaceShell.tsx`, `TopBar.tsx`, `ActivityBar.tsx`, `explorer/{Explorer,FileTree,ParameterPanel,ExperimentTree}.tsx`, `editor/{EditorArea,CodeEditor,MonacoEditor,LiteEditor,TheoryTab,InstructionsTab,themes.ts}`, `console/{ConsolePane,ConsoleLine,ProblemsList}.tsx`, `plots/{PlotPane,FigureView,FigureToolbar,DataTable,PixelInspector}.tsx`, `variables/{VariablesPane,VariableDrawer}.tsx`, `StatusBar.tsx`, `EngineStatusPill.tsx`, `EngineFailurePanel.tsx`.
