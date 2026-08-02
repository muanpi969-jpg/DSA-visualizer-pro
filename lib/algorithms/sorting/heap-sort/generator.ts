import type { VisualizationStep } from "@/lib/algorithms/types";
import {
  cloneItems,
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
  "The heap prefix satisfies the max-heap property; the suffix is sorted.";

/** Heap Sort: build a max-heap, then repeatedly swap the max to the end. */
export function* heapSortSteps(input: SortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("heap");

  let comparisons = 0;
  let swaps = 0;
  let writes = 0;
  const sorted: number[] = [];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1, 2], label: "initialize" },
    metrics: { comparisons, swaps, writes },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Heap Sort on ${n} elements: build a max-heap, then repeatedly extract the maximum.`,
    operation: "init",
  });

  function* siftDown(start: number, size: number): Generator<Step> {
    let i = start;
    for (;;) {
      let largest = i;
      const l = 2 * i + 1;
      const r = 2 * i + 2;

      if (l < size) {
        comparisons += 1;
        const bigger = items[l].value > items[largest].value;
        yield emit({
          state: { items: cloneItems(items) },
          highlights: {
            comparing: [l, largest],
            sorted: [...sorted],
            pointers: [
              { label: "i", index: i, tone: "current" },
              { label: "l", index: l, tone: "compare" },
            ],
          },
          code: { language: "javascript", activeLines: [16], label: "compare left child" },
          metrics: { comparisons, swaps, writes },
          note: bigger
            ? `Left child ${items[l].value} > ${items[largest].value}: it becomes the largest.`
            : `Left child ${items[l].value} ≤ ${items[largest].value}: largest unchanged.`,
          invariant: INVARIANT,
          operation: "compare",
          audio: cue.compare(valueToFrequency(items[l].value, loVal, hiVal)),
        });
        if (bigger) largest = l;
      }

      if (r < size) {
        comparisons += 1;
        const bigger = items[r].value > items[largest].value;
        yield emit({
          state: { items: cloneItems(items) },
          highlights: {
            comparing: [r, largest],
            sorted: [...sorted],
            pointers: [
              { label: "i", index: i, tone: "current" },
              { label: "r", index: r, tone: "compare" },
            ],
          },
          code: { language: "javascript", activeLines: [17], label: "compare right child" },
          metrics: { comparisons, swaps, writes },
          note: bigger
            ? `Right child ${items[r].value} > ${items[largest].value}: it becomes the largest.`
            : `Right child ${items[r].value} ≤ ${items[largest].value}: largest unchanged.`,
          invariant: INVARIANT,
          operation: "compare",
          audio: cue.compare(valueToFrequency(items[r].value, loVal, hiVal)),
        });
        if (bigger) largest = r;
      }

      if (largest === i) {
        if (l < size) {
          yield emit({
            state: { items: cloneItems(items) },
            highlights: { active: [i], sorted: [...sorted] },
            code: { language: "javascript", activeLines: [18], label: "heap property holds" },
            metrics: { comparisons, swaps, writes },
            note: `${items[i].value} is not smaller than its children — stop sifting.`,
            invariant: INVARIANT,
            operation: "sift-stop",
          });
        }
        return;
      }

      [items[i], items[largest]] = [items[largest], items[i]];
      swaps += 1;
      writes += 2;
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [i, largest],
          sorted: [...sorted],
          pointers: [{ label: "i", index: largest, tone: "swap" }],
        },
        code: { language: "javascript", activeLines: [19, 20], label: "sift down" },
        metrics: { comparisons, swaps, writes },
        note: `Swap ${items[i].value} down with larger child ${items[largest].value}.`,
        invariant: INVARIANT,
        operation: "swap",
        audio: cue.swap(valueToFrequency(items[i].value, loVal, hiVal)),
      });
      i = largest;
    }
  }

  if (n > 1) {
    yield emit({
      state: { items: cloneItems(items) },
      highlights: { active: [Math.floor(n / 2) - 1] },
      code: { language: "javascript", activeLines: [3, 4], label: "build heap" },
      metrics: { comparisons, swaps, writes },
      note: `Build a max-heap: sift down each internal node from index ${Math.floor(n / 2) - 1} to 0.`,
      invariant: INVARIANT,
      operation: "build-heap",
    });

    for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
      yield* siftDown(i, n);
    }

    for (let end = n - 1; end > 0; end--) {
      [items[0], items[end]] = [items[end], items[0]];
      swaps += 1;
      writes += 2;
      sorted.push(end);
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [0, end],
          sorted: [...sorted],
          pointers: [{ label: "max", index: end, tone: "swap" }],
        },
        code: { language: "javascript", activeLines: [6, 7], label: "extract max" },
        metrics: { comparisons, swaps, writes },
        note: `Swap the heap maximum ${items[end].value} into final position ${end}.`,
        invariant: INVARIANT,
        operation: "extract-max",
        audio: cue.swap(valueToFrequency(items[end].value, loVal, hiVal)),
      });

      yield* siftDown(0, end);
    }
    sorted.push(0);
  }

  const all = Array.from({ length: n }, (_, t) => t);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: all, found: all },
    code: { language: "javascript", activeLines: [10], label: "return sorted array" },
    metrics: { comparisons, swaps, writes },
    note: `Done. Sorted with ${comparisons} comparisons and ${swaps} swaps.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
