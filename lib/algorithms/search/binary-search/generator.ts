import type { VisualizationStep } from "@/lib/algorithms/types";
import {
  cloneItems,
  outsideWindow,
  toItems,
  toValues,
  type ArrayVizHighlights,
  type ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { createEmitter } from "@/lib/algorithms/shared/emit";
import type { SearchInput } from "@/lib/algorithms/shared/inputs";
import { cue, valueToFrequency } from "@/lib/audio/cue";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

const INVARIANT = "If the target exists, it lies within [low..high].";

/** Binary Search on a sorted array: halve the window each probe. */
export function* binarySearchSteps(input: SearchInput): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("binary");

  let comparisons = 0;
  let low = 0;
  let high = n - 1;

  const windowPointers = () => [
    { label: "low", index: low, tone: "bound" as const },
    { label: "high", index: high, tone: "bound" as const },
  ];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: n > 0 ? { pointers: windowPointers() } : {},
    code: { language: "javascript", activeLines: [1, 2], label: "initialize" },
    metrics: { comparisons },
    note:
      n === 0
        ? `The array is empty, so ${target} cannot be found.`
        : `Search for ${target}. The array is sorted, so each probe halves the window [low..high].`,
    invariant: INVARIANT,
    operation: "init",
  });

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    comparisons += 1;
    const midVal = items[mid].value;
    const cmp = midVal === target ? 0 : midVal < target ? -1 : 1;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [mid],
        eliminated: outsideWindow(low, high, n),
        pointers: [
          ...windowPointers(),
          { label: "mid", index: mid, tone: "current" },
        ],
      },
      code: {
        language: "javascript",
        activeLines: cmp === 0 ? [4, 5] : cmp < 0 ? [4, 6] : [4, 7],
        label: "probe mid",
      },
      metrics: { comparisons },
      note:
        cmp === 0
          ? `arr[${mid}] = ${midVal} equals the target.`
          : cmp < 0
            ? `arr[${mid}] = ${midVal} < ${target}: the target must be right of mid.`
            : `arr[${mid}] = ${midVal} > ${target}: the target must be left of mid.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(midVal, loVal, hiVal)),
    });

    if (cmp === 0) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          found: [mid],
          eliminated: outsideWindow(low, high, n),
        },
        code: { language: "javascript", activeLines: [5], label: "found" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${mid}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    if (cmp < 0) low = mid + 1;
    else high = mid - 1;

    if (low <= high) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          eliminated: outsideWindow(low, high, n),
          pointers: windowPointers(),
        },
        code: {
          language: "javascript",
          activeLines: cmp < 0 ? [6] : [7],
          label: "shrink window",
        },
        metrics: { comparisons },
        note: `Discard the ${cmp < 0 ? "left" : "right"} half. Search [${low}..${high}] next.`,
        invariant: INVARIANT,
        operation: "shrink-window",
      });
    }
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: outsideWindow(1, 0, n) },
    code: { language: "javascript", activeLines: [9], label: "not found" },
    metrics: { comparisons },
    note: `The window is empty — target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
