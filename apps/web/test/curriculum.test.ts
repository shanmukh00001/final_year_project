import {
  VALIDATED_EXPERIMENTS,
  getExperimentById,
  getExperimentsByCourse,
  getExperimentsByLevel,
} from "../src/data/curriculum/index.js";
import { ExperimentSchema } from "@vlab/shared";

describe("Phase 5: Experiment Curriculum Validation (AC-CAT)", () => {
  test("AC-CAT-001: Curriculum lists all 7 courses with exact experiment counts and UG/PG tags", () => {
    const courses = ["SS", "NT", "DSP", "DIP", "BEE", "ACS", "SSP"];
    
    // Check all 7 courses exist
    for (const c of courses) {
      const exps = getExperimentsByCourse(c);
      expect(exps.length).toBeGreaterThanOrEqual(7);
    }

    // Check UG / PG breakdown
    const ugExps = getExperimentsByLevel("UG");
    const pgExps = getExperimentsByLevel("PG");

    expect(ugExps.length).toBe(35); // 5 UG courses * 7 exps
    expect(pgExps.length).toBe(16); // 2 PG courses * 8 exps
    expect(VALIDATED_EXPERIMENTS.length).toBe(51);
  });

  test("AC-CAT-003: Every experiment satisfies JSON schema constraints", () => {
    for (const exp of VALIDATED_EXPERIMENTS) {
      const result = ExperimentSchema.safeParse(exp);
      expect(result.success).toBe(true);
      expect(exp.title.length).toBeGreaterThan(3);
      expect(exp.starterCode.length).toBeGreaterThan(10);
      expect(exp.objective.length).toBeGreaterThan(10);
      expect(exp.estimatedRuntimeMs).toBeGreaterThan(0);
    }
  });

  test("AC-CAT-002: Experiments by ID lookup retrieves accurate starterCode and metadata", () => {
    const dsp03 = getExperimentById("DSP-03");
    expect(dsp03).toBeDefined();
    expect(dsp03?.title).toBe("FIR Filter Design");
    expect(dsp03?.course).toBe("DSP");
    expect(dsp03?.parameters.length).toBe(2);
    expect(dsp03?.starterCode).toContain("vlab.param");

    const acs02 = getExperimentById("ACS-02");
    expect(acs02).toBeDefined();
    expect(acs02?.title).toContain("BER in AWGN");
    expect(acs02?.level).toBe("PG");
  });

  test("Schema error rejection: Malformed experiment fails fast", () => {
    const invalidExp = {
      id: "INVALID_ID",
      title: "Bad",
      course: "INVALID",
      level: "UNKNOWN",
    };

    const result = ExperimentSchema.safeParse(invalidExp);
    expect(result.success).toBe(false);
  });
});
