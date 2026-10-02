// Relative L2 Norm calculation for real or complex arrays
export function relL2(a: Float64Array | number[], b: Float64Array | number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Array lengths do not match: ${a.length} vs ${b.length}`);
  }

  let diffNormSq = 0;
  let bNormSq = 0;

  for (let i = 0; i < a.length; i++) {
    const valA = a[i] ?? 0;
    const valB = b[i] ?? 0;
    const diff = valA - valB;
    diffNormSq += diff * diff;
    bNormSq += valB * valB;
  }

  const diffNorm = Math.sqrt(diffNormSq);
  const bNorm = Math.sqrt(bNormSq);

  return diffNorm / Math.max(bNorm, 1e-300);
}

export function assertClose(actual: number, expected: number, tol = 1e-9): boolean {
  return Math.abs(actual - expected) <= tol;
}
