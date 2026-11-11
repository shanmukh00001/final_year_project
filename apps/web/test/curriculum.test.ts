import {
  VALIDATED_EXPERIMENTS,
  getExperimentById,
  getExperimentsByCourse,
  getExperimentsByLevel,
} from "../src/data/curriculum/index.js";
import { ExperimentSchema } from "@vlab/shared";

describe("Phase 5: IIT (ISM) Dhanbad Virtual Lab Curriculum Validation (4 Active Labs)", () => {
  test("AC-CAT-001: Curriculum exposes the 4 configured IIT (ISM) experiments across NT and BEE", () => {
    const ntExps = getExperimentsByCourse("NT");
    const beeExps = getExperimentsByCourse("BEE");
    const ugExps = getExperimentsByLevel("UG");

    expect(ntExps.length).toBe(3);
    expect(beeExps.length).toBe(1);
    expect(ugExps.length).toBe(4);
    expect(VALIDATED_EXPERIMENTS.length).toBe(4);
    expect(VALIDATED_EXPERIMENTS.map((e) => e.id)).toEqual(["NT-01", "BEE-01", "ELC-01", "ELC-02"]);
  });

  test("AC-CAT-003: Every experiment satisfies extended IIT (ISM) JSON schema constraints", () => {
    for (const exp of VALIDATED_EXPERIMENTS) {
      const result = ExperimentSchema.safeParse(exp);
      expect(result.success).toBe(true);
      expect(exp.institute).toBe("IIT (ISM) Dhanbad");
      expect(exp.imageUrl).toMatch(/^\/images\/.+\.(jpg|png)$/);
      expect(exp.title.length).toBeGreaterThan(3);
      expect(exp.objective.length).toBeGreaterThan(10);
      expect((exp.aimDetails || []).length).toBeGreaterThan(0);
      expect((exp.procedureSteps || []).length).toBeGreaterThan(0);
      expect((exp.pretest || []).length).toBeGreaterThan(0);
      expect((exp.posttest || []).length).toBeGreaterThan(0);
    }
  });

  test("AC-CAT-002: Experiments by ID lookup retrieves RLC, Ohm's Law, RC Low-Pass Filter & Zener Diode", () => {
    const rlc = getExperimentById("NT-01");
    expect(rlc).toBeDefined();
    expect(rlc?.title).toBe("R-L-C Circuit Analysis");
    expect(rlc?.imageUrl).toBe("/images/rlc-circuit-setup.jpg");
    expect(rlc?.parameters.length).toBe(6);

    const ohm = getExperimentById("BEE-01");
    expect(ohm).toBeDefined();
    expect(ohm?.title).toContain("Ohm's Law");
    expect(ohm?.imageUrl).toBe("/images/ohms-law-bench.jpg");
    expect(ohm?.theory).toContain("V = I");

    const rc = getExperimentById("ELC-01");
    expect(rc).toBeDefined();
    expect(rc?.title).toContain("RC Low-Pass Filter");

    const zen = getExperimentById("ELC-02");
    expect(zen).toBeDefined();
    expect(zen?.title).toContain("Zener Diode");
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
