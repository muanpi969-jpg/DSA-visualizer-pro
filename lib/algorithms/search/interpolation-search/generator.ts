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

const INVARIANT =
  "If the target exists, it lies within [low..high] and within their value range.";

/** Interpolation Search: probe where the target *should* be, by value. */
export function* interpolationSearchSteps(
  input: SearchInput,
): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("interp");

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
        : `Search for ${target}: estimate its position from the values at low and high, like finding a name in a phone book.`,
    invariant: INVARIANT,
    operation: "init",
  });

  while (
    low <= high &&
    target >= items[low].value &&
    target <= items[high].value
  ) {
    if (items[low].value === items[high].value) {
      comparisons += 1;
      const hit = items[low].value === target;
      yield emit({
        state: { items: cloneItems(items) },
        highlights: hit
          ? { found: [low], eliminated: outsideWindow(low, high, n) }
          : { eliminated: outsideWindow(1, 0, n) },
        code: { language: "javascript", activeLines: [4, 5], label: "uniform window" },
        metrics: { comparisons },
        note: hit
          ? `All window values equal ${items[low].value}. Found target ${target} at index ${low}.`
          : `All window values equal ${items[low].value} ≠ ${target}. Target ${target} is not in the array.`,
        operation: "complete",
        audio: hit ? cue.success() : cue.error(),
      });
      return;
    }

    const pos =
      low +
      Math.floor(
        ((target - items[low].value) * (high - low)) /
          (items[high].value - items[low].value),
      );
    comparisons += 1;
    const posVal = items[pos].value;
    const cmp = posVal === target ? 0 : posVal < target ? -1 : 1;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [pos],
        eliminated: outsideWindow(low, high, n),
        pointers: [
          ...windowPointers(),
          { label: "pos", index: pos, tone: "current" },
        ],
      },
      code: {
        language: "javascript",
        activeLines: cmp === 0 ? [7, 8, 9] : cmp < 0 ? [7, 8, 10] : [7, 8, 11],
        label: "interpolate probe",
      },
      metrics: { comparisons },
      note: `Estimate: pos = ${low} + ⌊(${target}−${items[low].value})·(${high}−${low}) / (${items[high].value}−${items[low].value})⌋ = ${pos}. arr[${pos}] = ${posVal}${
        cmp === 0 ? " — equals the target." : cmp < 0 ? " < target." : " > target."
      }`,
      invariant: INVARIANT,
      operation: "compare",
      audio: cue.compare(valueToFrequency(posVal, loVal, hiVal)),
    });

    if (cmp === 0) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          found: [pos],
          eliminated: outsideWindow(low, high, n),
        },
        code: { language: "javascript", activeLines: [9], label: "found" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${pos}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    if (cmp < 0) low = pos + 1;
    else high = pos - 1;

    if (low <= high) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: {
          eliminated: outsideWindow(low, high, n),
          pointers: windowPointers(),
        },
        code: {
          language: "javascript",
          activeLines: cmp < 0 ? [10] : [11],
          label: "shrink window",
        },
        metrics: { comparisons },
        note: `Search [${low}..${high}] next.`,
        invariant: INVARIANT,
        operation: "shrink-window",
      });
    }
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: outsideWindow(1, 0, n) },
    code: { language: "javascript", activeLines: [13], label: "not found" },
    metrics: { comparisons },
    note:
      n > 0 && (target < items[0].value || target > items[n - 1].value)
        ? `${target} is outside the array's value range — target ${target} is not in the array.`
        : `Target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
