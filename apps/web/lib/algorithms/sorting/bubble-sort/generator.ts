import { createEmitter } from "@/lib/algorithms/shared/emit";
import type { VisualizationStep } from "@/lib/algorithms/types";
import {
  cloneItems,
  toItems,
  toValues,
  type ArrayItem,
} from "@/lib/algorithms/shared/array-model";
import { cue, valueToFrequency } from "@/lib/audio/cue";
import type {
  BubbleSortHighlights,
  BubbleSortInput,
  BubbleSortState,
} from "./types";

type Step = VisualizationStep<BubbleSortState, BubbleSortHighlights>;

const INVARIANT = "Everything to the right of the sorted boundary is final.";

/**
 * Deterministic, pure Bubble Sort step generator.
 *
 * Yields an atomic step for: initialization, each comparison (with the swap
 * decision in its note), each swap, the end of every pass (marking the next
 * element final or stopping early), and the sorted result. Cumulative metrics
 * (comparisons/swaps/writes) are monotonic.
 */
export function* bubbleSortSteps(input: BubbleSortInput): Generator<Step> {
  const items = toItems(input.array);
  const n = items.length;

  const values = toValues(items);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  let comparisons = 0;
  let swaps = 0;
  let writes = 0;
  const sorted: number[] = [];

  const emit = createEmitter<BubbleSortState, BubbleSortHighlights>("bubble");

  // --- Initialize ---------------------------------------------------------
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: [...sorted] },
    code: { language: "javascript", activeLines: [1, 2], label: "initialize" },
    metrics: { comparisons, swaps, writes, currentPass: 0 },
    note:
      n <= 1
        ? "The array has 0 or 1 elements, so it is already sorted."
        : `Start Bubble Sort on ${n} elements. Repeatedly bubble the largest unsorted value to the right.`,
    operation: "init",
  });

  // Trivial inputs are already sorted.
  if (n <= 1) {
    for (let k = 0; k < n; k++) sorted.push(k);
    yield emit({
      state: { items: cloneItems(items) },
      highlights: { sorted: [...sorted], found: [...sorted] },
      code: { language: "javascript", activeLines: [13], label: "return" },
      metrics: { comparisons, swaps, writes, currentPass: 0 },
      note: "Array is sorted.",
      invariant: INVARIANT,
      operation: "complete",
      audio: cue.success(),
    });
    return;
  }

  // --- Passes -------------------------------------------------------------
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: { sorted: [...sorted] },
      code: { language: "javascript", activeLines: [3, 4], label: "new pass" },
      metrics: { comparisons, swaps, writes, currentPass: i + 1 },
      note: `Pass ${i + 1}: scan the unsorted region [0..${n - 1 - i}] and bubble the largest value right.`,
      invariant: INVARIANT,
      operation: "pass-start",
    });

    for (let j = 0; j < n - 1 - i; j++) {
      const a = items[j];
      const b = items[j + 1];
      const willSwap = a.value > b.value;
      comparisons += 1;

      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          comparing: [j, j + 1],
          sorted: [...sorted],
          pointers: [
            { label: "j", index: j, tone: "current" },
            { label: "j+1", index: j + 1, tone: "compare" },
          ],
        },
        code: { language: "javascript", activeLines: [5, 6], label: "compare" },
        metrics: { comparisons, swaps, writes, currentPass: i + 1 },
        note: willSwap
          ? `Compare ${a.value} and ${b.value}: ${a.value} > ${b.value}, so they are out of order.`
          : `Compare ${a.value} and ${b.value}: ${a.value} ≤ ${b.value}, already in order.`,
        invariant: INVARIANT,
        operation: "compare",
        audio: cue.compare(valueToFrequency(a.value, min, max)),
      });

      if (willSwap) {
        // Swap the moving elements (ids travel with them for animation).
        const tmp: ArrayItem = items[j];
        items[j] = items[j + 1];
        items[j + 1] = tmp;
        swaps += 1;
        writes += 2;

        yield emit({
          state: { items: cloneItems(items) },
          highlights: {
            swapping: [j, j + 1],
            sorted: [...sorted],
            pointers: [
              { label: "j", index: j, tone: "swap" },
              { label: "j+1", index: j + 1, tone: "swap" },
            ],
          },
          code: { language: "javascript", activeLines: [7, 8], label: "swap" },
          metrics: { comparisons, swaps, writes, currentPass: i + 1 },
          note: `Swap ${b.value} and ${a.value} so the larger value moves right.`,
          invariant: INVARIANT,
          operation: "swap",
          audio: cue.swap(valueToFrequency(a.value, min, max)),
        });
        swapped = true;
      }
    }

    // The largest unsorted value is now settled at the end of the window.
    const settledIndex = n - 1 - i;
    sorted.push(settledIndex);

    yield emit({
      state: { items: cloneItems(items) },
      highlights: { sorted: [...sorted], active: [settledIndex] },
      code: { language: "javascript", activeLines: [11], label: "end of pass" },
      metrics: { comparisons, swaps, writes, currentPass: i + 1 },
      note: swapped
        ? `End of pass ${i + 1}. Index ${settledIndex} now holds its final value.`
        : `No swaps in pass ${i + 1} — the array is already sorted. Stop early.`,
      invariant: INVARIANT,
      operation: "pass-end",
    });

    if (!swapped) {
      // Everything left is also in place.
      for (let k = 0; k < settledIndex; k++) {
        if (!sorted.includes(k)) sorted.push(k);
      }
      break;
    }
  }

  // Index 0 is settled once the outer loop completes normally.
  if (!sorted.includes(0)) sorted.push(0);
  sorted.sort((x, y) => x - y);

  // --- Result -------------------------------------------------------------
  const allSorted = Array.from({ length: n }, (_, k) => k);
  yield emit({
    state: { items: cloneItems(items) },
    highlights: { sorted: allSorted, found: allSorted },
    code: {
      language: "javascript",
      activeLines: [13],
      label: "return sorted array",
    },
    metrics: { comparisons, swaps, writes, currentPass: n - 1 },
    note: `Done. The array is sorted using ${comparisons} comparisons and ${swaps} swaps.`,
    invariant: INVARIANT,
    operation: "complete",
    audio: cue.success(),
  });
}
