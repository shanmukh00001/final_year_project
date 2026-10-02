# V-Lab ECE: Responsive Design

Primary target is desktop; tablets are first-class; phones get a reduced but functional experience. Breakpoints are defined in `DESIGN_SYSTEM.md`: `sm 640`, `md 768`, `lg 1024`, `xl 1280`, `2xl 1536` (px).

## 1. Device Profiles

`deviceProfile` is computed once at boot and updated on resize/orientation change (debounced 150 ms). It selects layout **and** engine limits.

| Profile   | Condition       | Layout                                | Editor     | Engine heap cap           | Plot point budget |
| --------- | --------------- | ------------------------------------- | ---------- | ------------------------- | ----------------- |
| `desktop` | width ≥ 1024 px | Full split-pane (UI_SPECIFICATION §2) | Monaco     | `MAX_WORKER_HEAP_MB` 1200 | 50,000 per trace  |
| `tablet`  | 768 to 1023 px  | Tabbed layout, optional 2-up          | Monaco     | 800                       | 30,000            |
| `phone`   | < 768 px        | Single pane + bottom tab bar          | LiteEditor | 600                       | 15,000            |

Detection: primary by viewport width via `matchMedia`; secondary hints `navigator.deviceMemory` (if present and ≤ 2 → force the lower tier's heap cap) and `matchMedia("(pointer: coarse)")` for touch target sizing.

```ts
// apps/web/src/lib/deviceProfile.ts
export type DeviceProfile = "desktop" | "tablet" | "phone";
export function computeProfile(width: number): DeviceProfile {
  if (width >= 1024) return "desktop";
  if (width >= 768) return "tablet";
  return "phone";
}
export const PROFILE_LIMITS = {
  desktop: {
    maxWorkerHeapMb: 1200,
    maxPlotPoints: 50_000,
    maxImagePixels: 4_194_304,
    maxMonteCarlo: 1_000_000,
  },
  tablet: {
    maxWorkerHeapMb: 800,
    maxPlotPoints: 30_000,
    maxImagePixels: 2_097_152,
    maxMonteCarlo: 500_000,
  },
  phone: {
    maxWorkerHeapMb: 600,
    maxPlotPoints: 15_000,
    maxImagePixels: 1_048_576,
    maxMonteCarlo: 200_000,
  },
} as const;
```

Experiments that exceed a profile's limits show a non-blocking banner: "This experiment is reduced on small screens (200k symbols instead of 1M). Use a laptop for full precision." The experiment JSON field `profileOverrides` supplies per-profile parameter caps.

## 2. Desktop (≥ 1024 px)

Full layout from `UI_SPECIFICATION.md`. Between 1024 and 1279 px, the Explorer defaults to collapsed (`defaultSize` 0) with the activity bar icon opening it as an overlay drawer. At ≥ 1536 px, max content width of non-workspace pages is 1440 px, centred.

## 3. Tablet (768 to 1023 px)

AC-UI-004: panes collapse into a tabbed layout (Editor / Console / Plots / Variables).

```
┌───────────────────────────────────────────────────────┐
│ TOPBAR: [≡] DSP-03 ▾        [▶][■][↻]   [⋯ menu]       │
├───────────────────────────────────────────────────────┤
│ TABS: [Editor] [Console] [Plots •2] [Variables]  [⫼ 2-up]
├───────────────────────────────────────────────────────┤
│                                                       │
│              active tab content (full)                │
│                                                       │
├───────────────────────────────────────────────────────┤
│ STATUS: ● Ready · Ln 12, Col 8 · Saved                │
└───────────────────────────────────────────────────────┘
```

- Tabs are persistent (all panes stay mounted; inactive ones use `hidden` + `content-visibility: auto`) so Monaco and Plotly keep state.
- **2-up mode** (toggle `⫼`, available only when width ≥ 900 px or landscape): left half Editor over Console, right half Plots over Variables, using the same panels as desktop with fixed 50/50 split.
- Badges on tabs: Plots shows the figure count; Console shows an error dot when a run fails while the tab is not active, and auto-switches focus to Console on the first error only if the user has not interacted for 2 s.
- Explorer becomes a left slide-over drawer (swipe from the left edge or `≡`).
- Orientation change preserves active tab and scroll.

## 4. Phone (< 768 px)

Single-pane view with a **bottom tab bar** (height 56 px + safe-area inset): `Code`, `Output`, `Plots`, `Vars`, `More`.

```
┌─────────────────────────┐
│ DSP-03 ▾         [▶][■] │  topbar 48px (Run always visible)
├─────────────────────────┤
│                         │
│   active pane content   │
│                         │
├─────────────────────────┤
│ Code Output Plots Vars ⋯│  bottom bar (touch targets ≥ 44 px)
└─────────────────────────┘
```

- **LiteEditor**: textarea with line-number gutter, monospace font, tab-inserts-4-spaces button in an accessory toolbar above the keyboard (`Tab`, `( )`, `[ ]`, `:`, `=`, `#`, `Run`), pinch to change font size, syntax highlighting off (performance), error line highlighted in the gutter. Read-only rendering uses a lightweight Prism-free highlighter if added later; not in MVP.
- Run result auto-navigates to `Plots` if figures were produced, otherwise to `Output`, unless the user changed tab during the run.
- Explorer, Parameters, and Theory open as full-screen sheets from `More`. Parameter sliders use large thumbs (≥ 44 px).
- Guest and student flows fully supported; **Professor grading and Admin pages** are readable but show a banner "Best used on a larger screen"; tables become stacked cards.
- File upload for DIP/DSP uses the native file picker; images above the phone pixel cap are downscaled with a notice.
- Heap cap 600 MB; if the OS kills the tab, the autosaved IndexedDB draft restores on reopen.

## 5. Complex Graph Handling

### 5.1 Interaction Model by Input Type

| Action       | Mouse/trackpad                                                         | Touch                                                                                                            |
| ------------ | ---------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Pan          | Drag in Pan mode                                                       | One-finger drag (default mode on touch is **pan**, `dragmode: "pan"`)                                            |
| Zoom         | Wheel (with `Ctrl`/`Cmd` held in embedded scroll containers), box zoom | Pinch (two fingers)                                                                                              |
| Hover values | Hover tooltip                                                          | Tap shows tooltip; tap again elsewhere dismisses; long-press shows crosshair (`hovermode: "x unified"` on phone) |
| Reset        | Double-click                                                           | Double-tap                                                                                                       |
| Box zoom     | Box tool                                                               | Toolbar button, then two-finger drag                                                                             |

Settings: `scrollZoom: false` on touch devices and inside scrollable pages (avoids scroll traps); `doubleClick: "reset+autosize"`; `responsive: true`; Plotly modebar replaced by the app's own `FigureToolbar` (44 px targets on coarse pointers); `displaylogo: false`.

### 5.2 Rendering Budgets

- Traces over the profile's point budget are downsampled by **LTTB** in the main thread (or the worker for 1e6+ points) and re-requested at full resolution on zoom (AC-PLT-004). Use `scattergl` for traces above 5,000 points; fall back to `scatter` if WebGL context creation fails.
- Limit WebGL contexts: render at most 6 live `scattergl` figures; others render as static PNG snapshots (`Plotly.toImage`) until activated (WebGL context limits are tight on mobile).
- 3D figures (`surface`, `scatter3d`): on phone, render a static PNG with a "Tap to interact" overlay; interaction opens a fullscreen viewer, and auto-rotation is disabled.
- Heatmaps/spectrograms above 1,000 x 1,000 cells are downsampled by block-max pooling to the profile's pixel budget before rendering.
- Images (DIP): show scaled bitmap in a `<canvas>` with CSS `image-rendering: pixelated` at zoom > 2x; the pixel inspector reads from the original `ImageData`, not the scaled copy.
- Redraw throttling: resizing re-renders figures with `ResizeObserver` debounced to `requestAnimationFrame` and at most once per 100 ms during drag.

### 5.3 Fullscreen Figure Viewer

Every figure has a `Fullscreen` control opening a modal using the whole viewport (`100dvh`), landscape-friendly; in portrait phones a hint "Rotate for a wider view" appears with a button that requests `screen.orientation.lock("landscape")` where supported (ignore failures silently). Esc or the back gesture closes.

### 5.4 Multi-trace Legibility

- More than 4 series: vary dash style in addition to colour (solid, dash, dot, dashdot).
- Legend position: right on desktop, bottom horizontal on phone; legend collapses to a tap-to-open overlay when more than 6 entries.
- Axis tick count: `nticks` 8 desktop, 5 tablet, 4 phone.
- Font sizes: 12 desktop, 11 tablet, 10 phone (never below 10).
- Bode plot on phone: stacked subplots keep a shared x-axis, height ratio 3:2, tick labels only on the bottom axis.

### 5.5 Data Table Alternative

Below the figure on phone/tablet when the toggle is on: virtualised table (first 200 rows, column sort), satisfying AC-PLT-007 on every profile.

## 6. Layout Mechanics

- Use CSS container queries for pane-level adaptation (e.g., the Explorer shows icons only when its container width < 160 px).
- Use `100dvh` (not `100vh`) for full-height shells; add `padding-bottom: env(safe-area-inset-bottom)` to bottom bars and `viewport-fit=cover` in the viewport meta.
- Virtual keyboard: listen to `visualViewport` resize; the bottom tab bar hides while the keyboard is open; the editor keeps the caret in view.
- Touch targets ≥ 44 x 44 px on coarse pointers (`pointer-coarse:` Tailwind variant).
- No horizontal scrolling of the page body at any width from 320 px (AC-UI-004); wide tables scroll inside `overflow-x-auto` containers.
- Honour `prefers-reduced-motion`, `prefers-color-scheme`, and `prefers-contrast: more` (increase border tokens).
- Orientation: portrait phone layout as above; landscape phone (height < 500 px) switches to a two-pane compact layout (Editor | Plots) with the bottom bar replaced by a left rail.

## 7. Page-level Responsive Rules

| Page                        | ≥ 1024         | 768 to 1023                            | < 768                                               |
| --------------------------- | -------------- | -------------------------------------- | --------------------------------------------------- |
| Catalogue grid              | 3 columns      | 2 columns                              | 1 column                                            |
| Assignments                 | Table          | Table with fewer columns (hide course) | Cards                                               |
| Professor submissions table | Full table     | Hide "section" column                  | Cards with status badge; filters in a bottom sheet  |
| Admin tables                | Full           | Horizontal scroll container            | "Best used on a larger screen" banner and card list |
| Auth card                   | 400 px centred | 400 px centred                         | Full width with 16 px padding                       |
| Dialogs                     | Centred modal  | Centred modal                          | Full-height bottom sheet                            |

## 8. Test Hooks (map to ACs)

| Test                                                                           | Viewports                 | AC                 |
| ------------------------------------------------------------------------------ | ------------------------- | ------------------ |
| No horizontal overflow (`document.scrollingElement.scrollWidth <= innerWidth`) | 320, 375, 768, 1024, 1440 | AC-UI-004          |
| Tabbed layout appears with the four tab names                                  | 800 x 1024                | AC-UI-004          |
| Bottom tab bar appears; LiteEditor mounted; Monaco not loaded                  | 390 x 844                 | AC-UI-004, ADR-010 |
| Touch pan/zoom on a figure (Cypress `touchstart/move` events)                  | 390 x 844                 | AC-PLT-001         |
| Experiment profile override banner shown                                       | 390 x 844 on ACS-02       | PRD §10            |
| Worker heap cap passed in `INIT` equals the profile value                      | all                       | AC-PERF-004        |
