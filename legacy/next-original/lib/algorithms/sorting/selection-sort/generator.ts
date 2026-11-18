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
  "Everything left of i is sorted and no larger than the unsorted region.";

/**
 * Selection Sort: each pass scans the unsorted region for its minimum and
 * swaps it into place, growing a sorted prefix. Line numbers reference the
 * JavaScript snippet in definition.ts.
 */
export function* selectionSortSteps(input: SortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;
  const values = toValues(items);
  const lo = values.length ? Math.min(...values) : 0;
  const hi = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("selection");

  let comparisons = 0;
  let swaps = 0;
  let writes = 0;
  const sorted: number[] = [];

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1, 2], label: "initialize" },
    metrics: { comparisons, swaps, writes, currentPass: 0 },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Selection Sort on ${n} elements. Each pass selects the minimum of the unsorted region.`,
    operation: "init",
  });

  for (let i = 0; n > 1 && i < n - 1; i++) {
    let minIdx = i;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        sorted: [...sorted],
        active: [i],
        pointers: [
          { label: "i", index: i, tone: "current" },
          { label: "min", index: minIdx, tone: "bound" },
        ],
      },
      code: { language: "javascript", activeLines: [3, 4], label: "new pass" },
      metrics: { comparisons, swaps, writes, currentPass: i + 1 },
      note: `Pass ${i + 1}: assume index ${i} (${items[i].value}) is the minimum, then scan the rest.`,
      invariant: INVARIANT,
      operation: "pass-start",
    });

    for (let j = i + 1; j < n; j++) {
      comparisons += 1;
      const smaller = items[j].value < items[minIdx].value;

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          comparing: [j, minIdx],
          sorted: [...sorted],
          pointers: [
            { label: "i", index: i, tone: "current" },
            { label: "min", index: minIdx, tone: "bound" },
            { label: "j", index: j, tone: "compare" },
          ],
        },
        code: { language: "javascript", activeLines: [5, 6], label: "compare" },
        metrics: { comparisons, swaps, writes, currentPass: i + 1 },
        note: smaller
          ? `${items[j].value} < ${items[minIdx].value}: new minimum candidate.`
          : `${items[j].value} ≥ ${items[minIdx].value}: minimum unchanged.`,
        invariant: INVARIANT,
        operation: "compare",
        audio: cue.compare(valueToFrequency(items[j].value, lo, hi)),
      });

      if (smaller) {
        minIdx = j;
        yield emit({
          state: { items: cloneItems(items) },
          highlights: {
            active: [j],
            sorted: [...sorted],
            pointers: [
              { label: "i", index: i, tone: "current" },
              { label: "min", index: minIdx, tone: "bound" },
            ],
          },
          code: { language: "javascript", activeLines: [6], label: "new minimum" },
          metrics: { comparisons, swaps, writes, currentPass: i + 1 },
          note: `Minimum is now ${items[j].value} at index ${j}.`,
          invariant: INVARIANT,
          operation: "new-min",
        });
      }
    }

    if (minIdx !== i) {
      [items[i], items[minIdx]] = [items[minIdx], items[i]];
      swaps += 1;
      writes += 2;
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          swapping: [i, minIdx],
          sorted: [...sorted],
          pointers: [
            { label: "i", index: i, tone: "swap" },
            { label: "min", index: minIdx, tone: "swap" },
          ],
        },
        code: { language: "javascript", activeLines: [8, 9], label: "swap" },
        metrics: { comparisons, swaps, writes, currentPass: i + 1 },
        note: `Swap minimum ${items[i].value} into position ${i}.`,
        invariant: INVARIANT,
        operation: "swap",
        audio: cue.swap(valueToFrequency(items[i].value, lo, hi)),
      });
    }

    sorted.push(i);
    yield emit({
      state: { items: cloneItems(items) },
      highlights: { sorted: [...sorted] },
      code: { language: "javascript", activeLines: [3], label: "end of pass" },
      metrics: { comparisons, swaps, writes, currentPass: i + 1 },
      note: `Index ${i} is final.${minIdx === i ? " It was already the minimum." : ""}`,
      invariant: INVARIANT,
      operation: "pass-end",
    });
  }

  const all = Array.from({ length: n }, (_, k) => k);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: all, found: all },
    code: { language: "javascript", activeLines: [12], label: "return sorted array" },
    metrics: { comparisons, swaps, writes, currentPass: Math.max(n - 1, 0) },
    note: `Done. Sorted with ${comparisons} comparisons and ${swaps} swaps.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
