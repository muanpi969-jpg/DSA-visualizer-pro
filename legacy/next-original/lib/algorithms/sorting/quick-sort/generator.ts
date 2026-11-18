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
  "After partitioning, everything left of the pivot is ≤ it and everything right is > it.";

/** Quick Sort with the Lomuto partition scheme (last element as pivot). */
export function* quickSortSteps(input: SortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("quick");

  let comparisons = 0;
  let swaps = 0;
  let writes = 0;
  const sorted: number[] = [];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1], label: "initialize" },
    metrics: { comparisons, swaps, writes, recursionDepth: 0 },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Quick Sort on ${n} elements: partition around a pivot, then recurse on each side.`,
    operation: "init",
  });

  function* sort(lo: number, hi: number, depth: number): Generator<Step> {
    if (lo > hi) return;
    if (lo === hi) {
      sorted.push(lo);
      yield emit({
        state: { items: cloneItems(items) },
        highlights: { sorted: [...sorted], active: [lo] },
        code: { language: "javascript", activeLines: [2, 3], label: "base case" },
        metrics: { comparisons, swaps, writes, recursionDepth: depth },
        note: `Single element at index ${lo} is already in final position.`,
        invariant: INVARIANT,
        operation: "base-case",
      });
      return;
    }

    const pivotVal = items[hi].value;
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: rangeIndices(lo, hi),
        sorted: [...sorted],
        pointers: [
          { label: "lo", index: lo, tone: "bound" },
          { label: "hi", index: hi, tone: "bound" },
          { label: "pivot", index: hi, tone: "current" },
        ],
      },
      code: { language: "javascript", activeLines: [9, 10], label: "choose pivot" },
      metrics: { comparisons, swaps, writes, recursionDepth: depth },
      note: `Partition [${lo}..${hi}] around pivot ${pivotVal} (last element).`,
      invariant: INVARIANT,
      operation: "choose-pivot",
    });

    let i = lo - 1;
    for (let j = lo; j < hi; j++) {
      comparisons += 1;
      const le = items[j].value <= pivotVal;

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          comparing: [j, hi],
          sorted: [...sorted],
          pointers: [
            ...(i >= lo ? [{ label: "i", index: i, tone: "bound" as const }] : []),
            { label: "j", index: j, tone: "compare" },
            { label: "pivot", index: hi, tone: "current" },
          ],
        },
        code: { language: "javascript", activeLines: [12, 13], label: "compare" },
        metrics: { comparisons, swaps, writes, recursionDepth: depth },
        note: le
          ? `${items[j].value} ≤ pivot ${pivotVal}: it belongs on the left side.`
          : `${items[j].value} > pivot ${pivotVal}: leave it on the right side.`,
        invariant: INVARIANT,
        operation: "compare",
        audio: cue.compare(valueToFrequency(items[j].value, loVal, hiVal)),
      });

      if (le) {
        i += 1;
        if (i !== j) {
          [items[i], items[j]] = [items[j], items[i]];
          swaps += 1;
          writes += 2;
          yield emit({
            state: { items: cloneItems(items) },
            highlights: {
              swapping: [i, j],
              sorted: [...sorted],
              pointers: [
                { label: "i", index: i, tone: "swap" },
                { label: "j", index: j, tone: "swap" },
              ],
            },
            code: { language: "javascript", activeLines: [14, 15], label: "swap left" },
            metrics: { comparisons, swaps, writes, recursionDepth: depth },
            note: `Swap ${items[i].value} into the ≤-pivot region at index ${i}.`,
            invariant: INVARIANT,
            operation: "swap",
            audio: cue.swap(valueToFrequency(items[i].value, loVal, hiVal)),
          });
        }
      }
    }

    const p = i + 1;
    if (p !== hi) {
      [items[p], items[hi]] = [items[hi], items[p]];
      swaps += 1;
      writes += 2;
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [p, hi],
          sorted: [...sorted],
          pointers: [{ label: "pivot", index: p, tone: "swap" }],
        },
        code: { language: "javascript", activeLines: [18], label: "place pivot" },
        metrics: { comparisons, swaps, writes, recursionDepth: depth },
        note: `Move pivot ${pivotVal} between the two regions, to index ${p}.`,
        invariant: INVARIANT,
        operation: "place-pivot",
        audio: cue.swap(valueToFrequency(pivotVal, loVal, hiVal)),
      });
    }

    sorted.push(p);
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        sorted: [...sorted],
        active: [p],
        pointers: [{ label: "pivot", index: p, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [19], label: "pivot settled" },
      metrics: { comparisons, swaps, writes, recursionDepth: depth },
      note: `Pivot ${pivotVal} is in final position ${p}. Recurse on [${lo}..${p - 1}] and [${p + 1}..${hi}].`,
      invariant: INVARIANT,
      operation: "pivot-settled",
    });

    yield* sort(lo, p - 1, depth + 1);
    yield* sort(p + 1, hi, depth + 1);
  }

  if (n > 1) {
    yield* sort(0, n - 1, 1);
  }

  const all = Array.from({ length: n }, (_, t) => t);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: all, found: all },
    code: { language: "javascript", activeLines: [1], label: "sorted" },
    metrics: { comparisons, swaps, writes, recursionDepth: 0 },
    note: `Done. Sorted with ${comparisons} comparisons and ${swaps} swaps.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
