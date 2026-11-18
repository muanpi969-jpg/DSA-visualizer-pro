import type {
  AnyAlgorithmDefinition,
  VisualizationStep,
} from "@/lib/algorithms/types";
export const MAX_STEPS = 10_000;
export const MAX_TRACE_BYTES = 16 * 1024 * 1024;
export interface BuildStepsResult {
  steps: VisualizationStep[];
  truncated: boolean;
  bytes: number;
}
/** UTF-8 serialized bytes are a budget, not a measurement of JavaScript heap.
 * Own every frame and retain no global cache. */
export function buildSteps(
  definition: AnyAlgorithmDefinition,
  input: unknown,
  limits = { maxSteps: MAX_STEPS, maxBytes: MAX_TRACE_BYTES },
): BuildStepsResult {
  const steps: VisualizationStep[] = [];
  let bytes = 2;
  const encoder = new TextEncoder();
  for (const frame of definition.generateSteps(input)) {
    const serialized = JSON.stringify(frame);
    const size = encoder.encode(serialized).byteLength + (steps.length ? 1 : 0);
    if (steps.length >= limits.maxSteps || bytes + size > limits.maxBytes)
      return { steps, truncated: true, bytes };
    steps.push(JSON.parse(serialized) as VisualizationStep);
    bytes += size;
  }
  return { steps, truncated: false, bytes };
}
