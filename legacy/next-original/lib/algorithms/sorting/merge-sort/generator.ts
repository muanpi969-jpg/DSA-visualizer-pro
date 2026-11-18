import type { VisualizationStep } from "@/lib/algorithms/types";
import {
  cloneItems,
  toItems,
  toValues,
  type ArrayItem,
  type ArrayVizHighlights,
  type ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { createEmitter } from "@/lib/algorithms/shared/emit";
import type { SortInput } from "@/lib/algorithms/shared/inputs";
import { cue, valueToFrequency } from "@/lib/audio/cue";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

const INVARIANT = "Within the active window, the merged prefix is sorted.";

/**
 * Top-down Merge Sort. During a merge the window [lo..hi] is laid out as
 * merged-prefix + remaining-left + remaining-right, which is always a
 * permutation of the original items — so stable ids stay unique and layout
 * animation shows values flowing to their merged positions.
 */
export function* mergeSortSteps(input: SortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("merge");

  let comparisons = 0;
  let writes = 0;

  const boundPointers = (lo: number, hi: number) => [
    { label: "lo", index: lo, tone: "bound" as const },
    { label: "hi", index: hi, tone: "bound" as const },
  ];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1], label: "initialize" },
    metrics: { comparisons, writes, recursionDepth: 0 },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Merge Sort on ${n} elements: split in half, sort each half, then merge.`,
    operation: "init",
  });

  function* sortRange(lo: number, hi: number, depth: number): Generator<Step> {
    if (lo >= hi) return;
    const mid = Math.floor((lo + hi) / 2);

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [mid],
        pointers: [
          ...boundPointers(lo, hi),
          { label: "mid", index: mid, tone: "current" },
        ],
      },
      code: { language: "javascript", activeLines: [3], label: "split" },
      metrics: { comparisons, writes, recursionDepth: depth },
      note: `Split [${lo}..${hi}] into [${lo}..${mid}] and [${mid + 1}..${hi}].`,
      invariant: INVARIANT,
      operation: "split",
    });

    yield* sortRange(lo, mid, depth + 1);
    yield* sortRange(mid + 1, hi, depth + 1);

    // --- Merge the two sorted halves ------------------------------------
    const left = items.slice(lo, mid + 1);
    const right = items.slice(mid + 1, hi + 1);
    let i = 0;
    let j = 0;
    const merged: ArrayItem[] = [];

    const rebuild = () => {
      const rest = [...left.slice(i), ...right.slice(j)];
      for (let t = 0; t < merged.length + rest.length; t++) {
        items[lo + t] = t < merged.length ? merged[t] : rest[t - merged.length];
      }
    };

    yield emit({
      state: { items: cloneItems(items) },
      highlights: { pointers: boundPointers(lo, hi) },
      code: { language: "javascript", activeLines: [9, 10, 11], label: "merge start" },
      metrics: { comparisons, writes, recursionDepth: depth },
      note: `Merge sorted halves [${lo}..${mid}] and [${mid + 1}..${hi}].`,
      invariant: INVARIANT,
      operation: "merge-start",
    });

    while (i < left.length && j < right.length) {
      comparisons += 1;
      const takeLeft = left[i].value <= right[j].value;
      const posL = lo + merged.length; // where left[i] currently sits
      const posR = posL + (left.length - i); // where right[j] currently sits

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          comparing: [posL, posR],
          pointers: boundPointers(lo, hi),
        },
        code: {
          language: "javascript",
          activeLines: takeLeft ? [12, 13] : [12, 14],
          label: "compare heads",
        },
        metrics: { comparisons, writes, recursionDepth: depth },
        note: `Compare ${left[i].value} and ${right[j].value}: take ${
          takeLeft ? left[i].value : right[j].value
        }.`,
        invariant: INVARIANT,
        operation: "compare",
        audio: cue.compare(
          valueToFrequency((takeLeft ? left[i] : right[j]).value, loVal, hiVal),
        ),
      });

      const taken = takeLeft ? left[i++] : right[j++];
      merged.push(taken);
      writes += 1;
      rebuild();

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [lo + merged.length - 1],
          pointers: boundPointers(lo, hi),
        },
        code: {
          language: "javascript",
          activeLines: takeLeft ? [13] : [14],
          label: "write",
        },
        metrics: { comparisons, writes, recursionDepth: depth },
        note: `Write ${taken.value} at index ${lo + merged.length - 1}.`,
        invariant: INVARIANT,
        operation: "write",
        audio: cue.write(valueToFrequency(taken.value, loVal, hiVal)),
      });
    }

    // Copy any leftover tail in one step (it is already in relative order).
    if (i < left.length || j < right.length) {
      const fromLeft = i < left.length;
      const start = lo + merged.length;
      while (i < left.length) {
        merged.push(left[i++]);
        writes += 1;
      }
      while (j < right.length) {
        merged.push(right[j++]);
        writes += 1;
      }
      rebuild();

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: Array.from({ length: lo + merged.length - start }, (_, t) => start + t),
          pointers: boundPointers(lo, hi),
        },
        code: {
          language: "javascript",
          activeLines: fromLeft ? [16] : [17],
          label: "copy remainder",
        },
        metrics: { comparisons, writes, recursionDepth: depth },
        note: `Copy the remaining ${fromLeft ? "left" : "right"}-half values — they are already in order.`,
        invariant: INVARIANT,
        operation: "copy-rest",
      });
    }

    yield emit({
      state: { items: cloneItems(items) },
      highlights: { active: [], pointers: boundPointers(lo, hi) },
      code: { language: "javascript", activeLines: [6], label: "range merged" },
      metrics: { comparisons, writes, recursionDepth: depth },
      note: `Range [${lo}..${hi}] is now sorted.`,
      invariant: INVARIANT,
      operation: "merge-done",
    });
  }

  if (n > 1) {
    yield* sortRange(0, n - 1, 1);
  }

  const all = Array.from({ length: n }, (_, t) => t);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: all, found: all },
    code: { language: "javascript", activeLines: [1], label: "sorted" },
    metrics: { comparisons, writes, recursionDepth: 0 },
    note: `Done. Sorted with ${comparisons} comparisons and ${writes} writes.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
