import type { VisualizationStep } from "./types";

export interface StepValidationIssue {
  index: number;
  message: string;
}

/**
 * Structural validation shared by every algorithm's unit tests:
 * - indexes are sequential starting at 0
 * - each step has at least one valid (>=1) active code line
 * - state is JSON-serializable (so steps can be inspected/shared/replayed)
 * - cumulative metric counters never decrease
 *
 * Returns a list of issues (empty when the steps are well-formed).
 */
export function validateSteps(
  steps: VisualizationStep[],
  maxLine = Number.POSITIVE_INFINITY,
): StepValidationIssue[] {
  const issues: StepValidationIssue[] = [];
  const cumulativeKeys = ["comparisons", "swaps", "writes", "reads", "visited"] as const;
  const prev: Record<string, number> = {};

  steps.forEach((step, i) => {
    if (step.index !== i) {
      issues.push({ index: i, message: `index ${step.index} !== position ${i}` });
    }
    if (typeof step.id !== "string" || step.id.length === 0) {
      issues.push({ index: i, message: "missing id" });
    }
    if (!Array.isArray(step.code.activeLines) || step.code.activeLines.length === 0) {
      issues.push({ index: i, message: "no active code lines" });
    } else if (
      step.code.activeLines.some((l) => !Number.isInteger(l) || l < 1 || l > maxLine)
    ) {
      issues.push({ index: i, message: "active line out of range" });
    }
    if (typeof step.note !== "string" || step.note.length === 0) {
      issues.push({ index: i, message: "empty note" });
    }
    try {
      JSON.stringify(step.state);
      JSON.stringify(step.highlights);
    } catch {
      issues.push({ index: i, message: "state/highlights not serializable" });
    }
    for (const key of cumulativeKeys) {
      const value = step.metrics[key];
      if (value === undefined) continue;
      if (prev[key] !== undefined && value < prev[key]) {
        issues.push({
          index: i,
          message: `metric "${key}" decreased ${prev[key]} -> ${value}`,
        });
      }
      prev[key] = value;
    }
  });

  return issues;
}
