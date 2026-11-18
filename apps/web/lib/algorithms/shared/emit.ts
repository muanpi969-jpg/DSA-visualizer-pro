import type { VisualizationStep, VisualizerKind } from "../types";

/**
 * Creates a step factory that stamps sequential ids/indexes so generators only
 * describe the interesting fields (state, highlights, code, metrics, note…).
 */
export function createEmitter<TState, THighlights>(
  prefix: string,
  kind: VisualizerKind = "array",
) {
  let index = 0;
  return (
    partial: Omit<VisualizationStep<TState, THighlights>, "id" | "index" | "kind">,
  ): VisualizationStep<TState, THighlights> => ({
    id: `${prefix}-${index}`,
    index: index++,
    kind,
    ...partial,
  });
}
