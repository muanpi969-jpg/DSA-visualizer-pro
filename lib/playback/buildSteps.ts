import type { AnyAlgorithmDefinition, VisualizationStep } from "@/lib/algorithms/types";
import { getAlgorithmBySlug } from "@/lib/algorithms/registry";

/** Guard against runaway generators freezing the UI. */
export const MAX_STEPS = 200_000;

export interface BuildStepsResult {
  steps: VisualizationStep[];
  truncated: boolean;
}

const cache = new Map<string, BuildStepsResult>();

function cacheKey(slug: string, input: unknown): string {
  return `${slug}::${JSON.stringify(input)}`;
}

/**
 * Materialize an algorithm's steps for the given input, memoized by
 * slug + serialized input so repeated loads are free. Generation is capped at
 * MAX_STEPS to protect the main thread from pathological inputs.
 */
export function buildSteps(
  definition: AnyAlgorithmDefinition,
  input: unknown,
): BuildStepsResult {
  const key = cacheKey(definition.slug, input);
  const cached = cache.get(key);
  if (cached) return cached;

  const steps: VisualizationStep[] = [];
  let truncated = false;

  for (const step of definition.generateSteps(input)) {
    steps.push(step);
    if (steps.length >= MAX_STEPS) {
      truncated = true;
      break;
    }
  }

  const result: BuildStepsResult = { steps, truncated };
  cache.set(key, result);
  return result;
}

/** Convenience wrapper that resolves the definition by slug. */
export function buildStepsForSlug(
  slug: string,
  input: unknown,
): BuildStepsResult | null {
  const definition = getAlgorithmBySlug(slug);
  if (!definition) return null;
  return buildSteps(definition, input);
}
