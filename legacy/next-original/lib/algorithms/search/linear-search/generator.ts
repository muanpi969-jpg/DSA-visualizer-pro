import type { VisualizationStep } from "@/lib/algorithms/types";
import {
  cloneItems,
  rangeIndices,
  toItems,
  toValues,
  type ArrayVizHighlights,
  type ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { createEmitter } from "@/lib/algorithms/shared/emit";
import type { SearchInput } from "@/lib/algorithms/shared/inputs";
import { cue, valueToFrequency } from "@/lib/audio/cue";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

/** Linear Search: scan left to right until the target is found. */
export function* linearSearchSteps(input: SearchInput): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("linear");

  let comparisons = 0;

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1], label: "initialize" },
    metrics: { comparisons },
    note:
      n === 0
        ? `The array is empty, so ${target} cannot be found.`
        : `Search for ${target} by checking every element from left to right. No sorted precondition needed.`,
    operation: "init",
  });

  for (let i = 0; i < n; i++) {
    comparisons += 1;
    const hit = items[i].value === target;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [i],
        eliminated: rangeIndices(0, i - 1),
        pointers: [{ label: "i", index: i, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [2, 3], label: "check element" },
      metrics: { comparisons },
      note: hit
        ? `arr[${i}] = ${items[i].value} equals the target.`
        : `arr[${i}] = ${items[i].value} ≠ ${target}. Move to the next element.`,
      invariant: "The target is not among the eliminated elements.",
      operation: "compare",
      audio: cue.compare(valueToFrequency(items[i].value, loVal, hiVal)),
    });

    if (hit) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          found: [i],
          eliminated: rangeIndices(0, i - 1),
          pointers: [{ label: "i", index: i, tone: "current" }],
        },
        code: { language: "javascript", activeLines: [4], label: "found" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${i}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: rangeIndices(0, n - 1) },
    code: { language: "javascript", activeLines: [7], label: "not found" },
    metrics: { comparisons },
    note: `Target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
