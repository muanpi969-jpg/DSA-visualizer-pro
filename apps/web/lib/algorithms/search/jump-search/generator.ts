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

const INVARIANT = "The target can only be in or after the current block.";

/** Jump Search: leap in √n blocks, then scan the block that may hold the target. */
export function* jumpSearchSteps(input: SearchInput): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("jump");

  let comparisons = 0;
  const step = Math.floor(Math.sqrt(n));

  yield emit({
    state: { items: cloneItems(items) },
    highlights: {},
    code: { language: "javascript", activeLines: [1, 2, 3, 4], label: "initialize" },
    metrics: { comparisons },
    note:
      n === 0
        ? `The array is empty, so ${target} cannot be found.`
        : `Search for ${target}: jump in blocks of ⌊√${n}⌋ = ${step}, then scan the block that could contain it.`,
    invariant: INVARIANT,
    operation: "init",
  });

  if (n === 0) {
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {},
      code: { language: "javascript", activeLines: [12], label: "not found" },
      metrics: { comparisons },
      note: `Target ${target} is not in the array.`,
      operation: "complete",
      audio: cue.error(),
    });
    return;
  }

  let prev = 0;
  let curr = step;

  while (curr < n && items[curr - 1].value < target) {
    comparisons += 1;
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [curr - 1],
        eliminated: rangeIndices(0, prev - 1),
        pointers: [{ label: "block end", index: curr - 1, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [5], label: "check block end" },
      metrics: { comparisons },
      note: `Block end arr[${curr - 1}] = ${items[curr - 1].value} < ${target}: the whole block is too small.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(items[curr - 1].value, loVal, hiVal)),
    });

    prev = curr;
    curr += step;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        eliminated: rangeIndices(0, prev - 1),
        pointers: [{ label: "prev", index: prev, tone: "bound" }],
      },
      code: { language: "javascript", activeLines: [6, 7], label: "jump" },
      metrics: { comparisons },
      note: `Jump forward to index ${prev}.`,
      invariant: INVARIANT,
      operation: "jump",
    });
  }

  if (curr < n) {
    // The loop condition failed on a real comparison — show it.
    comparisons += 1;
    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [curr - 1],
        eliminated: rangeIndices(0, prev - 1),
        pointers: [{ label: "block end", index: curr - 1, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [5], label: "check block end" },
      metrics: { comparisons },
      note: `Block end arr[${curr - 1}] = ${items[curr - 1].value} ≥ ${target}: the target must be in this block.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(items[curr - 1].value, loVal, hiVal)),
    });
  }

  const scanEnd = Math.min(curr, n) - 1;
  for (let i = prev; i <= scanEnd; i++) {
    comparisons += 1;
    const hit = items[i].value === target;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [i],
        eliminated: [...rangeIndices(0, i - 1), ...rangeIndices(scanEnd + 1, n - 1)],
        pointers: [{ label: "i", index: i, tone: "current" }],
      },
      code: { language: "javascript", activeLines: [9, 10], label: "scan block" },
      metrics: { comparisons },
      note: hit
        ? `arr[${i}] = ${items[i].value} equals the target.`
        : `arr[${i}] = ${items[i].value} ≠ ${target}. Continue the linear scan.`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(items[i].value, loVal, hiVal)),
    });

    if (hit) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: { found: [i] },
        code: { language: "javascript", activeLines: [10], label: "found" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${i}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    if (items[i].value > target) break; // sorted: no point scanning further
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: rangeIndices(0, n - 1) },
    code: { language: "javascript", activeLines: [12], label: "not found" },
    metrics: { comparisons },
    note: `Target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
