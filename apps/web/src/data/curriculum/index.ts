import { type ExperimentDefinition, ExperimentSchema } from "@vlab/shared";
import { IIT_ISM_NT_EXPERIMENTS, IIT_ISM_ELC_EXPERIMENTS } from "./nt.js";
import { IIT_ISM_BEE_EXPERIMENTS } from "./bee.js";

// Active catalog: 4 IIT (ISM) Dhanbad Virtual Lab experiments
// 1. NT-01:  R-L-C Circuit Analysis
// 2. BEE-01: Ohm's Law & V-I Characteristics
// 3. ELC-01: RC Low-Pass Filter
// 4. ELC-02: Zener Diode Characteristics
// All 51 previous curriculum experiments are preserved in archive/legacy-curriculum/.
export const ALL_EXPERIMENTS: ExperimentDefinition[] = [
  IIT_ISM_NT_EXPERIMENTS[0]!, // 1st: R-L-C Circuit Analysis
  IIT_ISM_BEE_EXPERIMENTS[0]!, // 2nd: Ohm's Law
  IIT_ISM_ELC_EXPERIMENTS[0]!, // 3rd: RC Low-Pass Filter
  IIT_ISM_ELC_EXPERIMENTS[1]!, // 4th: Zener Diode Characteristics
];

export const VALIDATED_EXPERIMENTS: ExperimentDefinition[] = ALL_EXPERIMENTS.map((exp) => {
  const parsed = ExperimentSchema.safeParse(exp);
  if (!parsed.success) {
    throw new Error(`Invalid experiment definition for ${exp.id}: ${parsed.error.message}`);
  }
  return parsed.data;
});

export const EXPERIMENTS_BY_ID = new Map<string, ExperimentDefinition>(
  VALIDATED_EXPERIMENTS.map((e) => [e.id, e]),
);

export function getExperimentById(id: string): ExperimentDefinition | undefined {
  return EXPERIMENTS_BY_ID.get(id);
}

export function getExperimentsByCourse(course: string): ExperimentDefinition[] {
  return VALIDATED_EXPERIMENTS.filter((e) => e.course === course);
}

export function getExperimentsByLevel(level: "UG" | "PG"): ExperimentDefinition[] {
  return VALIDATED_EXPERIMENTS.filter((e) => e.level === level);
}
