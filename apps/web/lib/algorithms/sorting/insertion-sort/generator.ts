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
import type { SortInput } from "@/lib/algorithms/shared/inputs";
import { cue, valueToFrequency } from "@/lib/audio/cue";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

const INVARIANT =
  "Before each pass, [0..i-1] is ordered; moving the key left grows the next ordered prefix.";

/** Stable insertion sort using adjacent swaps, matching the reference code. */
export function* insertionSortSteps(input: SortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;
  const values = toValues(items);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("insertion");

  let comparisons = 0;
  let writes = 0;
  let swaps = 0;

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1], label: "initialize" },
    metrics: { comparisons, swaps, writes, currentPass: 0 },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Insertion Sort on ${n} elements. Grow a sorted prefix by inserting one value at a time.`,
    operation: "init",
  });

  for (let i = 1; i < n; i++) {
    const keyVal = items[i].value;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [i],
        ordered: rangeIndices(0, i - 1),
        pointers: [{ label: "key", index: i, tone: "current" }],
      },
      code: {
        language: "javascript",
        activeLines: [2, 3, 4],
        label: "pick key",
      },
      metrics: { comparisons, swaps, writes, currentPass: i },
      note: `Pass ${i}: insert key ${keyVal} into the sorted prefix [0..${i - 1}].`,
      invariant: INVARIANT,
      operation: "pick-key",
    });

    let k = i; // current position of the key
    let j = i - 1;
    while (j >= 0) {
      comparisons += 1;
      const greater = items[j].value > keyVal;

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          comparing: [j, k],
          pointers: [
            { label: "j", index: j, tone: "compare" },
            { label: "key", index: k, tone: "current" },
          ],
        },
        code: { language: "javascript", activeLines: [5], label: "compare" },
        metrics: { comparisons, swaps, writes, currentPass: i },
        note: greater
          ? `${items[j].value} > ${keyVal}: swap it with the key.`
          : `${items[j].value} ≤ ${keyVal}: found the insertion point.`,
        invariant: INVARIANT,
        operation: "compare",
        audio: cue.compare(valueToFrequency(items[j].value, lo, hi)),
      });

      if (!greater) break;

      // Move the key left by one (equivalent to shifting items[j] right).
      [items[j], items[k]] = [items[k], items[j]];
      writes += 2;
      swaps += 1;
      k = j;
      j -= 1;

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [k, k + 1],
          pointers: [{ label: "key", index: k, tone: "swap" }],
        },
        code: {
          language: "javascript",
          activeLines: [6, 7],
          label: "swap left",
        },
        metrics: { comparisons, swaps, writes, currentPass: i },
        note: `Swap ${items[k + 1].value} with the key; the key moves to index ${k}.`,
        invariant: INVARIANT,
        operation: "swap",
        audio: cue.swap(valueToFrequency(keyVal, lo, hi)),
      });
    }

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [k],
        ordered: rangeIndices(0, i),
        pointers: [{ label: "key", index: k, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [9], label: "insert key" },
      metrics: { comparisons, swaps, writes, currentPass: i },
      note: `Place key ${keyVal} at index ${k}. Prefix [0..${i}] is sorted.`,
      invariant: INVARIANT,
      operation: "insert",
    });
  }

  const all = Array.from({ length: n }, (_, t) => t);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: all, found: all },
    code: {
      language: "javascript",
      activeLines: [11],
      label: "return sorted array",
    },
    metrics: { comparisons, swaps, writes, currentPass: Math.max(n - 1, 0) },
    note: `Done. Sorted with ${comparisons} comparisons and ${writes} writes.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
