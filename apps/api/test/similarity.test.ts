import {
  normalizePythonCode,
  calculateCodeSimilarity,
  analyzeBatchSimilarity,
} from "../src/services/similarity.service.js";

describe("Milestone 4: Plagiarism & Code Similarity Detection Service", () => {
  const codeBase = `
import vlab
import numpy as np

# Compute DFT
def compute_spectrum(signal, N):
    X = np.fft.fft(signal, N)
    return np.abs(X)

t = np.linspace(0, 1, 100)
sig = np.sin(2 * np.pi * 10 * t)
mag = compute_spectrum(sig, 100)
vlab.plot(t, mag)
`;

  const codeExactCopy = `
import vlab
import numpy as np

# Compute DFT
def compute_spectrum(signal, N):
    X = np.fft.fft(signal, N)
    return np.abs(X)

t = np.linspace(0, 1, 100)
sig = np.sin(2 * np.pi * 10 * t)
mag = compute_spectrum(sig, 100)
vlab.plot(t, mag)
`;

  const codeObfuscated = `
import vlab
import numpy as np

"""
Author: Student X
This is my custom solution
"""

def calc_fft_mag(wave_data, num_samples):
    # Renamed variables and added extra comments
    spectrum_result = np.fft.fft(wave_data, num_samples)
    return np.abs(spectrum_result)

time_vector = np.linspace(0, 1, 100)
sine_wave = np.sin(2 * np.pi * 10 * time_vector)
magnitude_out = calc_fft_mag(sine_wave, 100)
vlab.plot(time_vector, magnitude_out)
`;

  const codeCompletelyDifferent = `
import vlab
import numpy as np

# Matrix linear algebra - Two port Z parameters
R1, R2, R3 = 10.0, 20.0, 30.0
Z_mat = np.array([[R1 + R3, R3], [R3, R2 + R3]])
Y_mat = np.linalg.inv(Z_mat)
print("Z matrix:", Z_mat)
print("Y matrix:", Y_mat)
`;

  test("normalizes Python code removing comments and normalizing identifiers", () => {
    const norm = normalizePythonCode(codeBase);
    expect(norm).not.toContain("# Compute DFT");
    expect(norm).toContain("import vlab");
    expect(norm).toContain("import numpy as np");
    expect(norm).toContain("_ID_");
    expect(norm).toContain("_NUM_");
  });

  test("detects 100% similarity for identical code", () => {
    const result = calculateCodeSimilarity(codeBase, codeExactCopy);
    expect(result.similarity).toBe(1.0);
  });

  test("detects high similarity (>=80%) for variable-renamed obfuscated code", () => {
    const result = calculateCodeSimilarity(codeBase, codeObfuscated);
    expect(result.similarity).toBeGreaterThanOrEqual(0.8);
  });

  test("detects low similarity (<20%) for completely different experiments", () => {
    const result = calculateCodeSimilarity(codeBase, codeCompletelyDifferent);
    expect(result.similarity).toBeLessThan(0.2);
  });

  test("analyzes batch of submissions and flags plagiarized pairs", () => {
    const submissions = [
      { id: "sub-1", studentName: "Student 1", studentRoll: "21ECE001", code: codeBase },
      { id: "sub-2", studentName: "Student 2", studentRoll: "21ECE002", code: codeObfuscated },
      { id: "sub-3", studentName: "Student 3", studentRoll: "21ECE003", code: codeCompletelyDifferent },
    ];

    const pairs = analyzeBatchSimilarity(submissions, 0.8);
    expect(pairs.length).toBe(3); // 3 pairs: (1,2), (1,3), (2,3)

    const plagiarizedPair = pairs.find(
      (p) =>
        (p.submissionAId === "sub-1" && p.submissionBId === "sub-2") ||
        (p.submissionAId === "sub-2" && p.submissionBId === "sub-1"),
    );

    expect(plagiarizedPair).toBeDefined();
    expect(plagiarizedPair?.isPlagiarized).toBe(true);
    expect(plagiarizedPair?.similarityScore).toBeGreaterThanOrEqual(0.8);
  });
});
