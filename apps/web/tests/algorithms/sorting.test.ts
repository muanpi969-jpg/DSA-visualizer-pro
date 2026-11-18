import { describe, it, expect } from "vitest";
import type { AnyAlgorithmDefinition, VisualizationStep } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { validateSteps } from "@/lib/algorithms/validateSteps";
import { selectionSortDefinition } from "@/lib/algorithms/sorting/selection-sort/definition";
import { insertionSortDefinition } from "@/lib/algorithms/sorting/insertion-sort/definition";
import { mergeSortDefinition } from "@/lib/algorithms/sorting/merge-sort/definition";
import { quickSortDefinition } from "@/lib/algorithms/sorting/quick-sort/definition";
import { heapSortDefinition } from "@/lib/algorithms/sorting/heap-sort/definition";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

const DEFINITIONS: AnyAlgorithmDefinition[] = [
  selectionSortDefinition,
  insertionSortDefinition,
  mergeSortDefinition,
  quickSortDefinition,
  heapSortDefinition,
];

const CASES: Array<{ name: string; input: number[] }> = [
  { name: "random", input: [5, 2, 9, 1, 6, 3, 8, 4] },
  { name: "empty", input: [] },
  { name: "single", input: [42] },
  { name: "two elements", input: [2, 1] },
  { name: "already sorted", input: [1, 2, 3, 4, 5] },
  { name: "reverse sorted", input: [5, 4, 3, 2, 1] },
  { name: "duplicates", input: [4, 2, 4, 1, 3, 2, 4, 1] },
  { name: "all equal", input: [7, 7, 7, 7] },
  { name: "negatives", input: [3, -1, -7, 2, 0, -3] },
];

function run(def: AnyAlgorithmDefinition, array: number[]): Step[] {
  return Array.from(def.generateSteps({ array })) as Step[];
}

function finalValues(steps: Step[]): number[] {
  return steps[steps.length - 1].state.items.map((i) => i.value);
}

for (const def of DEFINITIONS) {
  const codeLines = def.code.javascript!.split("\n").length;

  describe(def.title, () => {
    for (const { name, input } of CASES) {
      it(`sorts ${name}`, () => {
        const steps = run(def, input);
        expect(finalValues(steps)).toEqual([...input].sort((a, b) => a - b));
      });
    }

    it("final step marks every index sorted and communicates the result", () => {
      const steps = run(def, [5, 2, 9, 1, 6, 3, 8, 4]);
      const last = steps[steps.length - 1];
      expect(last.operation).toBe("complete");
      expect(last.highlights.sorted).toHaveLength(8);
      expect(last.audio?.kind).toBe("success");
      expect(last.note.toLowerCase()).toMatch(/done|sorted/);
    });

    it("keeps every element id unique in every step (stable animation keys)", () => {
      for (const { input } of CASES) {
        const steps = run(def, input);
        for (const step of steps) {
          const ids = step.state.items.map((i) => i.id);
          expect(new Set(ids).size, `${def.slug}: dup ids in step ${step.index}`).toBe(
            ids.length,
          );
        }
      }
    });

    it("produces well-formed, serializable steps with monotonic metrics", () => {
      for (const { input } of CASES) {
        const issues = validateSteps(run(def, input), codeLines);
        expect(issues, JSON.stringify(issues)).toHaveLength(0);
      }
    });

    it("every preset validates and sorts correctly", () => {
      for (const preset of def.presets) {
        const input = preset.input as { array: number[] };
        expect(def.validateInput(input).ok).toBe(true);
        const steps = run(def, input.array);
        expect(finalValues(steps)).toEqual([...input.array].sort((a, b) => a - b));
      }
    });
  });
}

describe("cross-algorithm sanity", () => {
  it("insertion sort does the least work on nearly-sorted input", () => {
    const nearly = [1, 2, 4, 3, 5, 6, 7, 8];
    const reversed = [8, 7, 6, 5, 4, 3, 2, 1];
    const c = (arr: number[]) => {
      const steps = run(insertionSortDefinition, arr);
      return steps[steps.length - 1].metrics.comparisons ?? 0;
    };
    expect(c(nearly)).toBeLessThan(c(reversed));
  });

  it("quick sort settles pivots progressively", () => {
    const steps = run(quickSortDefinition, [7, 2, 9, 4, 6, 1, 8, 3]);
    const settleSteps = steps.filter((s) => s.operation === "pivot-settled");
    expect(settleSteps.length).toBeGreaterThan(0);
    // Sorted set only ever grows.
    let prev = 0;
    for (const s of steps) {
      const size = s.highlights.sorted?.length ?? prev;
      expect(size).toBeGreaterThanOrEqual(prev);
      prev = size;
    }
  });

  it("heap sort grows the sorted suffix from the right", () => {
    const steps = run(heapSortDefinition, [5, 9, 3, 7, 1, 8, 2, 6]);
    const extracts = steps.filter((s) => s.operation === "extract-max");
    expect(extracts).toHaveLength(7); // n - 1 extractions
    expect(extracts[0].highlights.sorted).toContain(7);
  });
});
