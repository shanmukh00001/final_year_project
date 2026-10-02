# V-Lab ECE: Design System

Tailwind CSS v4 (CSS-first configuration). Tokens live in `apps/web/src/styles/tokens.css`, imported by `apps/web/src/styles/index.css`. Dark mode uses the `data-theme` attribute on `<html>` (`light` | `dark`), set from user preference or `prefers-color-scheme`.

## 1. Principles

1. **Workspace first:** dense, calm, high-contrast tools (like an IDE), generous whitespace on dashboards.
2. **Data ink:** plot colours are colour-blind safe; chrome stays neutral.
3. **Accessible by default:** WCAG 2.1 AA (AC-UI-001, AC-UI-003).
4. **Tokens over literals:** components use semantic tokens (`bg-surface`, `text-fg-muted`), never raw hex.

## 2. `apps/web/src/styles/tokens.css`

```css
@import "tailwindcss";

@theme {
  /* ---------- Font families ---------- */
  --font-sans:
    "Inter Variable", ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  --font-mono: "JetBrains Mono Variable", ui-monospace, "SF Mono", Menlo, Consolas, monospace;

  /* ---------- Brand (indigo/teal) ---------- */
  --color-brand-50: #eef2ff;
  --color-brand-100: #e0e7ff;
  --color-brand-200: #c7d2fe;
  --color-brand-300: #a5b4fc;
  --color-brand-400: #818cf8;
  --color-brand-500: #6366f1;
  --color-brand-600: #4f46e5;
  --color-brand-700: #4338ca;
  --color-brand-800: #3730a3;
  --color-brand-900: #312e81;

  --color-accent-400: #2dd4bf;
  --color-accent-500: #14b8a6;
  --color-accent-600: #0d9488;
  --color-accent-700: #0f766e;

  /* ---------- Neutral (slate) ---------- */
  --color-neutral-0: #ffffff;
  --color-neutral-50: #f8fafc;
  --color-neutral-100: #f1f5f9;
  --color-neutral-200: #e2e8f0;
  --color-neutral-300: #cbd5e1;
  --color-neutral-400: #94a3b8;
  --color-neutral-500: #64748b;
  --color-neutral-600: #475569;
  --color-neutral-700: #334155;
  --color-neutral-800: #1e293b;
  --color-neutral-900: #0f172a;
  --color-neutral-950: #020617;

  /* ---------- Status ---------- */
  --color-success-500: #16a34a;
  --color-success-700: #15803d;
  --color-warning-500: #d97706;
  --color-warning-700: #b45309;
  --color-danger-500: #dc2626;
  --color-danger-700: #b91c1c;
  --color-info-500: #0284c7;
  --color-info-700: #0369a1;

  /* ---------- Plot palette (Okabe-Ito, colour-blind safe) ---------- */
  --color-plot-1: #0072b2;
  --color-plot-2: #d55e00;
  --color-plot-3: #009e73;
  --color-plot-4: #cc79a7;
  --color-plot-5: #e69f00;
  --color-plot-6: #56b4e9;
  --color-plot-7: #f0e442;
  --color-plot-8: #000000;

  /* ---------- Spacing / sizing (4 px base: Tailwind default --spacing: 0.25rem) ---------- */
  --spacing: 0.25rem;
  --size-topbar: 3rem; /* 48 px */
  --size-statusbar: 1.5rem; /* 24 px */
  --size-activitybar: 3rem; /* 48 px */
  --size-pane-min: 7.5rem; /* 120 px, AC-WS-003 */
  --size-splitter: 0.25rem; /* 4 px hit area expanded to 10 px by ::after */

  /* ---------- Radius ---------- */
  --radius-sm: 0.25rem;
  --radius-md: 0.375rem;
  --radius-lg: 0.5rem;
  --radius-xl: 0.75rem;

  /* ---------- Shadows ---------- */
  --shadow-panel: 0 1px 2px 0 rgb(15 23 42 / 0.06);
  --shadow-popover: 0 8px 24px -4px rgb(15 23 42 / 0.18), 0 2px 6px -2px rgb(15 23 42 / 0.12);

  /* ---------- Motion ---------- */
  --ease-standard: cubic-bezier(0.2, 0, 0, 1);
  --duration-fast: 120ms;
  --duration-base: 200ms;

  /* ---------- Breakpoints (see RESPONSIVE_DESIGN.md) ---------- */
  --breakpoint-sm: 40rem; /* 640 */
  --breakpoint-md: 48rem; /* 768 */
  --breakpoint-lg: 64rem; /* 1024 */
  --breakpoint-xl: 80rem; /* 1280 */
  --breakpoint-2xl: 96rem; /* 1536 */

  /* ---------- Z-index scale ---------- */
  --z-splitter: 10;
  --z-sticky: 20;
  --z-dropdown: 30;
  --z-modal: 40;
  --z-toast: 50;
}

/* ================= Semantic tokens: LIGHT (default) ================= */
:root {
  color-scheme: light;
  --bg-app: var(--color-neutral-100);
  --bg-surface: var(--color-neutral-0);
  --bg-surface-2: var(--color-neutral-50);
  --bg-elevated: var(--color-neutral-0);
  --bg-hover: var(--color-neutral-100);
  --bg-selected: var(--color-brand-100);
  --border-subtle: var(--color-neutral-200);
  --border-strong: var(--color-neutral-300);
  --fg-default: var(--color-neutral-900);
  --fg-muted: var(--color-neutral-600);
  --fg-subtle: var(--color-neutral-500);
  --fg-on-brand: #ffffff;
  --fg-link: var(--color-brand-700);
  --brand: var(--color-brand-600);
  --brand-hover: var(--color-brand-700);
  --focus-ring: var(--color-brand-600);

  --console-bg: var(--color-neutral-50);
  --console-stdout: var(--color-neutral-900);
  --console-stderr: var(--color-danger-700);
  --console-system: var(--color-info-700);
  --console-warning: var(--color-warning-700);

  --editor-error-bg: rgb(220 38 38 / 0.12);
  --plot-bg: #ffffff;
  --plot-grid: #e2e8f0;
  --plot-axis: #334155;
}

/* ================= Semantic tokens: DARK ================= */
:root[data-theme="dark"] {
  color-scheme: dark;
  --bg-app: var(--color-neutral-950);
  --bg-surface: var(--color-neutral-900);
  --bg-surface-2: #162033;
  --bg-elevated: var(--color-neutral-800);
  --bg-hover: var(--color-neutral-800);
  --bg-selected: #2a2f6b;
  --border-subtle: var(--color-neutral-800);
  --border-strong: var(--color-neutral-700);
  --fg-default: var(--color-neutral-100);
  --fg-muted: var(--color-neutral-300);
  --fg-subtle: var(--color-neutral-400);
  --fg-on-brand: #ffffff;
  --fg-link: var(--color-brand-300);
  --brand: var(--color-brand-500);
  --brand-hover: var(--color-brand-400);
  --focus-ring: var(--color-brand-300);

  --console-bg: #0b1220;
  --console-stdout: var(--color-neutral-100);
  --console-stderr: #fca5a5;
  --console-system: #7dd3fc;
  --console-warning: #fcd34d;

  --editor-error-bg: rgb(248 113 113 / 0.18);
  --plot-bg: #0f172a;
  --plot-grid: #334155;
  --plot-axis: #e2e8f0;
}

/* ================= Tailwind utility bindings ================= */
@theme inline {
  --color-app: var(--bg-app);
  --color-surface: var(--bg-surface);
  --color-surface-2: var(--bg-surface-2);
  --color-elevated: var(--bg-elevated);
  --color-hover: var(--bg-hover);
  --color-selected: var(--bg-selected);
  --color-line: var(--border-subtle);
  --color-line-strong: var(--border-strong);
  --color-fg: var(--fg-default);
  --color-fg-muted: var(--fg-muted);
  --color-fg-subtle: var(--fg-subtle);
  --color-fg-on-brand: var(--fg-on-brand);
  --color-link: var(--fg-link);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-ring: var(--focus-ring);
  --color-console: var(--console-bg);
  --color-console-stdout: var(--console-stdout);
  --color-console-stderr: var(--console-stderr);
  --color-console-system: var(--console-system);
  --color-console-warning: var(--console-warning);
}

/* ================= Base ================= */
@layer base {
  html {
    font-family: var(--font-sans);
    background: var(--bg-app);
    color: var(--fg-default);
  }
  body {
    min-height: 100%;
    font-size: 0.875rem;
    line-height: 1.375rem;
    -webkit-font-smoothing: antialiased;
  }
  :focus-visible {
    outline: 2px solid var(--focus-ring);
    outline-offset: 2px;
    border-radius: var(--radius-sm);
  }
  ::selection {
    background: var(--bg-selected);
  }
  @media (prefers-reduced-motion: reduce) {
    *,
    *::before,
    *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }
}
```

## 3. Typography

| Token (Tailwind class)            | Size / Line height                                                 | Weight   | Use                                |
| --------------------------------- | ------------------------------------------------------------------ | -------- | ---------------------------------- |
| `text-xs`                         | 12 / 16                                                            | 400, 500 | Status bar, table meta, axis help  |
| `text-sm` (base)                  | 14 / 22                                                            | 400      | Default UI text                    |
| `text-base`                       | 16 / 24                                                            | 400      | Long-form theory text              |
| `text-lg`                         | 18 / 28                                                            | 600      | Pane titles, dialog titles         |
| `text-xl`                         | 20 / 28                                                            | 600      | Page section headings              |
| `text-2xl`                        | 24 / 32                                                            | 700      | Page titles                        |
| `text-3xl`                        | 30 / 36                                                            | 700      | Login/landing                      |
| `font-mono text-[13px] leading-5` | 13 / 20                                                            | 400      | Console, variable values           |
| Editor                            | 14 px default (10 to 24, AC-UI-003), JetBrains Mono, ligatures off |          | Monaco `fontFamily` and `fontSize` |

Rules: UI body font is Inter Variable; numerals in tables use `tabular-nums`; maximum line length for theory text 72 characters (`max-w-prose`).

## 4. Contrast Requirements (verified by automated test)

| Foreground on background            | Min ratio               | Notes                                                                                                                                                   |
| ----------------------------------- | ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fg-default` on `bg-surface`        | 4.5:1 (expected > 15:1) | Both themes                                                                                                                                             |
| `fg-muted` on `bg-surface`          | 4.5:1                   | Do not use `fg-subtle` for essential text                                                                                                               |
| `fg-on-brand` on `brand`            | 4.5:1                   | Light brand-600 on white ≈ 6.3:1; dark mode uses brand-500, **must be re-checked** (use `brand-600` for filled buttons in dark mode if the ratio fails) |
| UI component borders and focus ring | 3:1                     |                                                                                                                                                         |
| Console stderr on console bg        | 4.5:1                   |                                                                                                                                                         |
| Plot series vs plot background      | 3:1                     | Okabe-Ito yellow `plot-7` is the weakest on white: restrict to dark theme or use with a dark outline                                                    |

Implement `apps/web/src/styles/contrast.test.ts` that parses `tokens.css`, resolves variables per theme, computes WCAG ratios, and fails when any pair above is below its minimum. This test is part of AC-UI-003.

## 5. Components (visual contracts)

| Component           | Spec                                                                                                                                                                   |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Button primary      | `bg-brand text-fg-on-brand hover:bg-brand-hover`, height 32 px (`h-8`), padding `px-3`, radius `rounded-md`, `font-medium`                                             |
| Button secondary    | `bg-surface border border-line-strong text-fg hover:bg-hover`                                                                                                          |
| Button ghost / icon | 28 px square (32 px on touch devices `pointer-coarse:h-10 pointer-coarse:w-10`), `hover:bg-hover`                                                                      |
| Button danger       | `bg-danger-500 text-white`                                                                                                                                             |
| Run button          | Primary with play icon; `Stop` replaces it while running (danger style); `Restart kernel` icon button next to it                                                       |
| Input               | height 32 px, `border border-line-strong bg-surface rounded-md`, focus ring token                                                                                      |
| Tabs                | 36 px tall, active has 2 px `brand` bottom border                                                                                                                      |
| Panel header        | 32 px, `bg-surface-2 border-b border-line`, uppercase `text-xs tracking-wide text-fg-muted`                                                                            |
| Splitter            | 4 px visible line `border-line`, hit area 10 px, `hover:bg-brand/40`, cursor `col-resize`/`row-resize`, keyboard arrows move 16 px                                     |
| Toast               | bottom-right, `shadow-popover`, auto-dismiss 5 s (errors persist), `role="status"` / `role="alert"` for errors                                                         |
| Modal               | centred, max-width 32 rem, backdrop `bg-black/50`, focus trap, Esc closes                                                                                              |
| Badge (status)      | `text-xs px-2 py-0.5 rounded-full`; colours: `submitted` info, `graded` success, `late_submitted` warning, `missed` danger, `in_progress` brand, `not_started` neutral |
| Engine status pill  | Dot + label: Booting (amber pulsing), Ready (green), Running (blue spinner), Error (red)                                                                               |
| Skeleton            | `bg-hover animate-pulse rounded-md`                                                                                                                                    |

## 6. Iconography

`lucide-react`, stroke width 1.75, sizes 16 px (inline) and 20 px (toolbar). Icons used alone must have `aria-label`.

## 7. Monaco Themes

Define `vlab-light` and `vlab-dark` with `monaco.editor.defineTheme` in `apps/web/src/features/workspace/editor/themes.ts`:
| Token | Light | Dark |
|---|---|---|
| `editor.background` | `#ffffff` | `#0f172a` |
| `editor.foreground` | `#0f172a` | `#e2e8f0` |
| `editorLineNumber.foreground` | `#94a3b8` | `#64748b` |
| `editor.selectionBackground` | `#c7d2fe` | `#312e81` |
| `editor.lineHighlightBackground` | `#f1f5f9` | `#1e293b` |
| keyword | `#4338ca` | `#a5b4fc` |
| string | `#047857` | `#6ee7b7` |
| number | `#b45309` | `#fcd34d` |
| comment (italic) | `#64748b` | `#94a3b8` |
| function / builtin | `#0369a1` | `#7dd3fc` |
Error squiggle uses `--editor-error-bg` for the line background and `#dc2626` / `#f87171` for the marker.

## 8. Plot Theming (Plotly)

Layout defaults applied by every adapter (read CSS variables at render time and on theme change):

```ts
export const baseLayout = (cs: CSSStyleDeclaration) => ({
  paper_bgcolor: cs.getPropertyValue("--plot-bg").trim(),
  plot_bgcolor: cs.getPropertyValue("--plot-bg").trim(),
  font: {
    family: "Inter Variable, system-ui, sans-serif",
    size: 12,
    color: cs.getPropertyValue("--plot-axis").trim(),
  },
  xaxis: {
    gridcolor: cs.getPropertyValue("--plot-grid").trim(),
    zerolinecolor: cs.getPropertyValue("--plot-grid").trim(),
    automargin: true,
  },
  yaxis: {
    gridcolor: cs.getPropertyValue("--plot-grid").trim(),
    zerolinecolor: cs.getPropertyValue("--plot-grid").trim(),
    automargin: true,
  },
  margin: { l: 56, r: 16, t: 32, b: 44 },
  colorway: [
    "#0072b2",
    "#d55e00",
    "#009e73",
    "#cc79a7",
    "#e69f00",
    "#56b4e9",
    "#f0e442",
    "#000000",
  ],
  hovermode: "closest",
  uirevision: "keep", // preserve zoom between re-renders of the same figure id
});
```

Dark theme replaces the `#000000` series colour with `#ffffff`.

## 9. Accessibility Tokens and Rules

- Minimum touch target 40 x 40 px for coarse pointers.
- Focus ring: 2 px `--focus-ring`, 2 px offset; never removed.
- Live regions: console output container has `role="log" aria-live="off"` (screen readers read it on demand); status bar has `aria-live="polite"` for engine state changes.
- Every figure has a "View data table" toggle (AC-PLT-007).
- Colour is never the only indicator (status badges include text; plot traces differ by dash style when more than 4 series).
