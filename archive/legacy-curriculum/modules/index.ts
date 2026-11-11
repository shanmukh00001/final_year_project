import { type ExperimentDefinition, ExperimentSchema } from "@vlab/shared";
import { SS_EXPERIMENTS } from "./ss.js";
import { NT_EXPERIMENTS } from "./nt.js";
import { DSP_EXPERIMENTS } from "./dsp.js";
import { DIP_EXPERIMENTS } from "./dip.js";
import { BEE_EXPERIMENTS } from "./bee.js";
import { ACS_EXPERIMENTS } from "./acs.js";
import { SSP_EXPERIMENTS } from "./ssp.js";

export const ALL_EXPERIMENTS: ExperimentDefinition[] = [
  ...SS_EXPERIMENTS,
  ...NT_EXPERIMENTS,
  ...DSP_EXPERIMENTS,
  ...DIP_EXPERIMENTS,
  ...BEE_EXPERIMENTS,
  ...ACS_EXPERIMENTS,
  ...SSP_EXPERIMENTS,
];

// Validate all experiments at load time against the schema
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
