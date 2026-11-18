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

const INVARIANT = "If the target exists, it lies within the current range.";

/** Exponential Search: double a bound to find a range, then binary-search it. */
export function* exponentialSearchSteps(input: SearchInput): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("expo");

  let comparisons = 0;

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1, 2], label: "initialize" },
    metrics: { comparisons },
    note:
      n === 0
        ? `The array is empty, so ${target} cannot be found.`
        : `Search for ${target}: double a bound (1, 2, 4, 8…) until it passes the target, then binary-search that range.`,
    invariant: INVARIANT,
    operation: "init",
  });

  if (n === 0) {
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {},
      code: { language: "javascript", activeLines: [3], label: "not found" },
      metrics: { comparisons },
      note: `Target ${target} is not in the array.`,
      operation: "complete",
      audio: cue.error(),
    });
    return;
  }

  comparisons += 1;
  const firstHit = items[0].value === target;
  yield emit({
    state: { items: cloneItems(items) },
    highlights: {
      active: [0],
      pointers: [{ label: "0", index: 0, tone: "current" }],
    },
    code: { language: "javascript", activeLines: [4], label: "check first element" },
    metrics: { comparisons },
    note: firstHit
      ? `arr[0] = ${items[0].value} equals the target.`
      : `arr[0] = ${items[0].value} ≠ ${target}. Start doubling the bound.`,
    invariant: INVARIANT,
    operation: "compare",
    audio: cue.compare(valueToFrequency(items[0].value, loVal, hiVal)),
  });

  if (firstHit) {
    yield emit({
      state: { items: cloneItems(items) },
      highlights: { found: [0] },
      code: { language: "javascript", activeLines: [4], label: "found" },
      metrics: { comparisons },
      note: `Found target ${target} at index 0.`,
      operation: "complete",
      audio: cue.success(),
    });
    return;
  }

  let bound = 1;
  while (bound < n && items[bound].value < target) {
    comparisons += 1;
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [bound],
        eliminated: outsideWindow(bound, n - 1, n),
        pointers: [{ label: "bound", index: bound, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [6, 7], label: "double the bound" },
      metrics: { comparisons },
      note: `arr[${bound}] = ${items[bound].value} < ${target}: double the bound to ${bound * 2}.`,
      invariant: INVARIANT,
      operation: "double-bound",
      audio: cue.compare(valueToFrequency(items[bound].value, loVal, hiVal)),
    });
    bound *= 2;
  }

  if (bound < n) {
    comparisons += 1;
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [bound],
        pointers: [{ label: "bound", index: bound, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [6], label: "bound passed target" },
      metrics: { comparisons },
      note: `arr[${bound}] = ${items[bound].value} ≥ ${target}: the target is at or before index ${bound}.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(items[bound].value, loVal, hiVal)),
    });
  }

  let low = Math.floor(bound / 2);
  let high = Math.min(bound, n - 1);

  const windowPointers = () => [
    { label: "low", index: low, tone: "bound" as const },
    { label: "high", index: high, tone: "bound" as const },
  ];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {
      eliminated: outsideWindow(low, high, n),
      pointers: windowPointers(),
    },
    code: { language: "javascript", activeLines: [9, 10], label: "binary search range" },
    metrics: { comparisons },
    note: `Binary-search the range [${low}..${high}].`,
    invariant: INVARIANT,
    operation: "range",
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
        activeLines: cmp === 0 ? [12, 13] : cmp < 0 ? [12, 14] : [12, 15],
        label: "probe mid",
      },
      metrics: { comparisons },
      note:
        cmp === 0
          ? `arr[${mid}] = ${midVal} equals the target.`
          : cmp < 0
            ? `arr[${mid}] = ${midVal} < ${target}: search right of mid.`
            : `arr[${mid}] = ${midVal} > ${target}: search left of mid.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(midVal, loVal, hiVal)),
    });

    if (cmp === 0) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: { found: [mid], eliminated: outsideWindow(low, high, n) },
        code: { language: "javascript", activeLines: [13], label: "found" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${mid}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    if (cmp < 0) low = mid + 1;
    else high = mid - 1;
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: outsideWindow(1, 0, n) },
    code: { language: "javascript", activeLines: [17], label: "not found" },
    metrics: { comparisons },
    note: `Target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
