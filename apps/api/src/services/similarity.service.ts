import crypto from "node:crypto";

const PYTHON_KEYWORDS_AND_BUILTINS = new Set([
  "import",
  "from",
  "as",
  "def",
  "return",
  "if",
  "elif",
  "else",
  "for",
  "while",
  "break",
  "continue",
  "pass",
  "try",
  "except",
  "finally",
  "raise",
  "with",
  "class",
  "lambda",
  "is",
  "in",
  "not",
  "and",
  "or",
  "True",
  "False",
  "None",
  "vlab",
  "np",
  "numpy",
  "scipy",
  "signal",
  "fft",
  "linalg",
  "plot",
  "print",
  "range",
  "len",
  "abs",
  "sin",
  "cos",
  "tan",
  "exp",
  "log",
  "log10",
  "pi",
  "linspace",
  "arange",
  "zeros",
  "ones",
  "array",
]);

/**
 * Normalizes Python code into an invariant structural token stream:
 * 1. Strips comments (#) and multiline docstrings (""" / ''')
 * 2. Replaces numeric literals with _NUM_
 * 3. Replaces string literals with _STR_
 * 4. Normalizes user variables and function names to _ID_
 * 5. Normalizes whitespace
 */
export function normalizePythonCode(code: string): string {
  // 1. Strip comments
  let cleaned = code.replace(/#.*$/gm, "");

  // 2. Strip multiline docstrings
  cleaned = cleaned.replace(/"""[\s\S]*?"""/g, "");
  cleaned = cleaned.replace(/'''[\s\S]*?'''/g, "");

  // 3. Normalize string literals to _STR_
  cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, "_STR_");

  // 4. Normalize numeric literals (floats, ints, scientific) to _NUM_
  cleaned = cleaned.replace(/\b\d+(\.\d+)?([eE][+-]?\d+)?\b/g, "_NUM_");

  // 5. Replace user identifiers with _ID_ while preserving python/numpy keywords
  const tokenized = cleaned.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\b/g, (token) => {
    if (PYTHON_KEYWORDS_AND_BUILTINS.has(token) || token === "_NUM_" || token === "_STR_") {
      return token;
    }
    return "_ID_";
  });

  // 6. Collapse whitespace
  return tokenized.replace(/\s+/g, " ").trim();
}

/**
 * Generates Winnowing fingerprints of a string.
 */
export function generateWinnowingFingerprints(
  text: string,
  k: number = 8,
  w: number = 4,
): Set<string> {
  if (text.length <= k) {
    const hash = crypto.createHash("md5").update(text).digest("hex").slice(0, 12);
    return new Set([hash]);
  }

  const kgrams: string[] = [];
  const hashes: number[] = [];

  for (let i = 0; i <= text.length - k; i++) {
    const kgram = text.substring(i, i + k);
    kgrams.push(kgram);
    const h = crypto.createHash("md5").update(kgram).digest().readUInt32BE(0);
    hashes.push(h);
  }

  const fingerprints = new Set<string>();

  for (let i = 0; i <= hashes.length - w; i++) {
    let minHash = hashes[i]!;
    let minIdx = i;

    for (let j = 1; j < w; j++) {
      if (hashes[i + j]! <= minHash) {
        minHash = hashes[i + j]!;
        minIdx = i + j;
      }
    }

    const fingerprintStr = `${minHash.toString(16)}_${kgrams[minIdx] ?? ""}`;
    fingerprints.add(fingerprintStr);
  }

  return fingerprints;
}

/**
 * Computes Jaccard code similarity score [0.0 .. 1.0].
 */
export function calculateCodeSimilarity(
  codeA: string,
  codeB: string,
  k: number = 8,
  w: number = 4,
): { similarity: number; commonFingerprints: number } {
  if (!codeA.trim() || !codeB.trim()) {
    return { similarity: 0, commonFingerprints: 0 };
  }

  const normA = normalizePythonCode(codeA);
  const normB = normalizePythonCode(codeB);

  if (normA === normB) {
    return { similarity: 1.0, commonFingerprints: 100 };
  }

  const fpA = generateWinnowingFingerprints(normA, k, w);
  const fpB = generateWinnowingFingerprints(normB, k, w);

  let intersectionCount = 0;
  for (const fp of fpA) {
    if (fpB.has(fp)) {
      intersectionCount++;
    }
  }

  const unionCount = fpA.size + fpB.size - intersectionCount;
  if (unionCount === 0) {
    return { similarity: 0, commonFingerprints: 0 };
  }

  const similarity = Math.round((intersectionCount / unionCount) * 100) / 100;
  return { similarity, commonFingerprints: intersectionCount };
}

export interface SimilarityPairResult {
  submissionAId: string;
  studentAName: string;
  studentARoll: string;
  submissionBId: string;
  studentBName: string;
  studentBRoll: string;
  similarityScore: number;
  isPlagiarized: boolean;
}

export interface SubmissionData {
  id: string;
  studentName: string;
  studentRoll: string;
  code: string;
}

/**
 * Analyzes batch of student submissions and returns pairwise similarity scores.
 */
export function analyzeBatchSimilarity(
  submissions: SubmissionData[],
  threshold: number = 0.8,
): SimilarityPairResult[] {
  const results: SimilarityPairResult[] = [];

  for (let i = 0; i < submissions.length; i++) {
    for (let j = i + 1; j < submissions.length; j++) {
      const subA = submissions[i]!;
      const subB = submissions[j]!;

      const { similarity } = calculateCodeSimilarity(subA.code, subB.code);

      results.push({
        submissionAId: subA.id,
        studentAName: subA.studentName,
        studentARoll: subA.studentRoll,
        submissionBId: subB.id,
        studentBName: subB.studentName,
        studentBRoll: subB.studentRoll,
        similarityScore: similarity,
        isPlagiarized: similarity >= threshold,
      });
    }
  }

  return results.sort((a, b) => b.similarityScore - a.similarityScore);
}
