// AC-UI-003: Contrast automated verification test
// Computes WCAG 2.1 AA contrast ratios for all critical token pairs

function parseHex(hex: string): [number, number, number] {
  const clean = hex.replace("#", "");
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function luminance([r, g, b]: [number, number, number]): number {
  const a = [r, g, b].map((v) => {
    const val = v / 255;
    return val <= 0.03928 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * (a[0] ?? 0) + 0.7152 * (a[1] ?? 0) + 0.0722 * (a[2] ?? 0);
}

function contrastRatio(hex1: string, hex2: string): number {
  const lum1 = luminance(parseHex(hex1));
  const lum2 = luminance(parseHex(hex2));
  const brightest = Math.max(lum1, lum2);
  const darkest = Math.min(lum1, lum2);
  return (brightest + 0.05) / (darkest + 0.05);
}

describe("AC-UI-003: Design System Contrast Verification", () => {
  it("AC-UI-003: Light mode default text meets WCAG AA >= 4.5:1", () => {
    const fgDefaultLight = "#0f172a"; // neutral-900
    const bgSurfaceLight = "#ffffff"; // neutral-0
    const ratio = contrastRatio(fgDefaultLight, bgSurfaceLight);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Light mode muted text meets WCAG AA >= 4.5:1", () => {
    const fgMutedLight = "#475569"; // neutral-600
    const bgSurfaceLight = "#ffffff";
    const ratio = contrastRatio(fgMutedLight, bgSurfaceLight);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Dark mode default text meets WCAG AA >= 4.5:1", () => {
    const fgDefaultDark = "#f1f5f9"; // neutral-100
    const bgSurfaceDark = "#0f172a"; // neutral-900
    const ratio = contrastRatio(fgDefaultDark, bgSurfaceDark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Dark mode muted text meets WCAG AA >= 4.5:1", () => {
    const fgMutedDark = "#cbd5e1"; // neutral-300
    const bgSurfaceDark = "#0f172a";
    const ratio = contrastRatio(fgMutedDark, bgSurfaceDark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Primary Brand Button text on brand background >= 4.5:1", () => {
    const fgOnBrand = "#ffffff";
    const brand600 = "#4f46e5";
    const ratio = contrastRatio(fgOnBrand, brand600);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Console stderr on console background in light mode >= 4.5:1", () => {
    const stderrLight = "#b91c1c"; // danger-700
    const consoleBgLight = "#f8fafc"; // neutral-50
    const ratio = contrastRatio(stderrLight, consoleBgLight);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });

  it("AC-UI-003: Console stderr on console background in dark mode >= 4.5:1", () => {
    const stderrDark = "#fca5a5";
    const consoleBgDark = "#0b1220";
    const ratio = contrastRatio(stderrDark, consoleBgDark);
    expect(ratio).toBeGreaterThanOrEqual(4.5);
  });
});
