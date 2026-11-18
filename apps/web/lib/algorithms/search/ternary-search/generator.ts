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

/** Ternary Search: split the window at two mid points, keep one third. */
export function* ternarySearchSteps(input: SearchInput): Generator<Step> {
  const items = toItems(input.array);
  const { target } = input;
  const n = items.length;
  const values = toValues(items);
  const loVal = values.length ? Math.min(...values) : 0;
  const hiVal = values.length ? Math.max(...values) : 0;
  const emit = createEmitter<ArrayVizState, ArrayVizHighlights>("ternary");

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
        : `Search for ${target}: split [low..high] at two mid points and keep the third that can contain the target.`,
    invariant: INVARIANT,
    operation: "init",
  });

  while (low <= high) {
    const third = Math.floor((high - low) / 3);
    const m1 = low + third;
    const m2 = high - third;

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        active: [m1, m2],
        eliminated: outsideWindow(low, high, n),
        pointers: [
          ...windowPointers(),
          { label: "m1", index: m1, tone: "current" },
          ...(m2 !== m1
            ? [{ label: "m2", index: m2, tone: "current" as const }]
            : []),
        ],
      },
      code: { language: "javascript", activeLines: [4, 5], label: "two mid points" },
      metrics: { comparisons },
      note: `Probe m1 = ${m1} (${items[m1].value}) and m2 = ${m2} (${items[m2].value}).`,
      invariant: INVARIANT,
      operation: "probe",
    });

    comparisons += 1;
    if (items[m1].value === target) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: { found: [m1], eliminated: outsideWindow(low, high, n) },
        code: { language: "javascript", activeLines: [6], label: "found at m1" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${m1}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    comparisons += 1;
    if (items[m2].value === target) {
      yield emit({
        state: { items: cloneItems(items) },
        highlights: { found: [m2], eliminated: outsideWindow(low, high, n) },
        code: { language: "javascript", activeLines: [7], label: "found at m2" },
        metrics: { comparisons },
        note: `Found target ${target} at index ${m2}.`,
        operation: "complete",
        audio: cue.success(),
      });
      return;
    }

    let lines: number[];
    let keptNote: string;
    if (target < items[m1].value) {
      high = m1 - 1;
      lines = [8];
      keptNote = `${target} < ${items[m1].value}: keep the left third.`;
    } else if (target > items[m2].value) {
      low = m2 + 1;
      lines = [9];
      keptNote = `${target} > ${items[m2].value}: keep the right third.`;
    } else {
      low = m1 + 1;
      high = m2 - 1;
      lines = [10];
      keptNote = `${items[m1].value} < ${target} < ${items[m2].value}: keep the middle third.`;
    }

    yield emit({
      state: { items: cloneItems(items) },
      highlights: {
        eliminated: outsideWindow(low, high, n),
        pointers: low <= high ? windowPointers() : [],
      },
      code: { language: "javascript", activeLines: lines, label: "shrink to one third" },
      metrics: { comparisons },
      note:
        low <= high
          ? `${keptNote} Search [${low}..${high}] next.`
          : `${keptNote} The window is now empty.`,
      invariant: INVARIANT,
      operation: "shrink-window",
      audio: cue.compare(valueToFrequency(items[m1].value, loVal, hiVal)),
    });
  }

  yield emit({
    state: { items: cloneItems(items) },
    highlights: { eliminated: outsideWindow(1, 0, n) },
    code: { language: "javascript", activeLines: [12], label: "not found" },
    metrics: { comparisons },
    note: `Target ${target} is not in the array.`,
    operation: "complete",
    audio: cue.error(),
  });
}
