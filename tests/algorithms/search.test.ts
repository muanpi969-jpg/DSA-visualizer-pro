import { describe, it, expect } from "vitest";
import type { AnyAlgorithmDefinition, VisualizationStep } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { validateSteps } from "@/lib/algorithms/validateSteps";
import { linearSearchDefinition } from "@/lib/algorithms/search/linear-search/definition";
import { binarySearchDefinition } from "@/lib/algorithms/search/binary-search/definition";
import { jumpSearchDefinition } from "@/lib/algorithms/search/jump-search/definition";
import { interpolationSearchDefinition } from "@/lib/algorithms/search/interpolation-search/definition";
import { exponentialSearchDefinition } from "@/lib/algorithms/search/exponential-search/definition";
import { ternarySearchDefinition } from "@/lib/algorithms/search/ternary-search/definition";

type Step = VisualizationStep<ArrayVizState, ArrayVizHighlights>;

const DEFINITIONS: AnyAlgorithmDefinition[] = [
  linearSearchDefinition,
  binarySearchDefinition,
  jumpSearchDefinition,
  interpolationSearchDefinition,
  exponentialSearchDefinition,
  ternarySearchDefinition,
];

const SORTED = [1, 3, 5, 7, 9, 11, 13, 15];
const DUPLICATES = [2, 2, 2, 4, 4, 6, 6, 8];

function run(def: AnyAlgorithmDefinition, array: number[], target: number): Step[] {
  return Array.from(def.generateSteps({ array, target })) as Step[];
}

/** Result index from the final step, or null when not found. */
function resultIndex(steps: Step[]): number | null {
  const last = steps[steps.length - 1];
  const found = last.highlights.found;
  return found && found.length > 0 ? found[0] : null;
}

for (const def of DEFINITIONS) {
  const codeLines = def.code.javascript!.split("\n").length;

  describe(def.title, () => {
    it("finds every present value at a correct index", () => {
      for (const target of SORTED) {
        const steps = run(def, SORTED, target);
        const idx = resultIndex(steps);
        expect(idx, `${def.slug} should find ${target}`).not.toBeNull();
        expect(SORTED[idx!]).toBe(target);
        const last = steps[steps.length - 1];
        expect(last.operation).toBe("complete");
        expect(last.note).toContain(`Found target ${target}`);
        expect(last.audio?.kind).toBe("success");
      }
    });

    it("reports not-found for absent targets", () => {
      for (const target of [-5, 0, 4, 8, 12, 99]) {
        const steps = run(def, SORTED, target);
        expect(resultIndex(steps), `${def.slug} must not find ${target}`).toBeNull();
        const last = steps[steps.length - 1];
        expect(last.operation).toBe("complete");
        expect(last.note.toLowerCase()).toContain("not in the array");
        expect(last.audio?.kind).toBe("error");
      }
    });

    it("handles the empty array", () => {
      const steps = run(def, [], 5);
      expect(resultIndex(steps)).toBeNull();
      expect(steps[steps.length - 1].operation).toBe("complete");
    });

    it("handles a single element (found and not found)", () => {
      expect(resultIndex(run(def, [5], 5))).toBe(0);
      expect(resultIndex(run(def, [5], 3))).toBeNull();
      expect(resultIndex(run(def, [5], 8))).toBeNull();
    });

    it("returns a valid match with duplicate values", () => {
      for (const target of [2, 4, 6, 8]) {
        const steps = run(def, DUPLICATES, target);
        const idx = resultIndex(steps);
        expect(idx).not.toBeNull();
        expect(DUPLICATES[idx!]).toBe(target);
      }
    });

    it("produces well-formed, serializable steps with monotonic metrics", () => {
      const scenarios: Array<[number[], number]> = [
        [SORTED, 7],
        [SORTED, 8],
        [[], 1],
        [[5], 5],
        [DUPLICATES, 4],
      ];
      for (const [array, target] of scenarios) {
        const issues = validateSteps(run(def, array, target), codeLines);
        expect(issues, `${def.slug}: ${JSON.stringify(issues)}`).toHaveLength(0);
      }
    });

    it("every preset validates and produces a definitive result", () => {
      for (const preset of def.presets) {
        const input = preset.input as { array: number[]; target: number };
        expect(def.validateInput(input).ok).toBe(true);
        const steps = run(def, input.array, input.target);
        const last = steps[steps.length - 1];
        expect(last.operation).toBe("complete");
        const idx = resultIndex(steps);
        if (input.array.includes(input.target)) {
          expect(idx).not.toBeNull();
          expect(input.array[idx!]).toBe(input.target);
        } else {
          expect(idx).toBeNull();
        }
      }
    });
  });
}

describe("sorted-array precondition", () => {
  const unsorted = { array: [5, 1, 3], target: 3 };

  it("binary-like searches reject unsorted input with a helpful message", () => {
    for (const def of DEFINITIONS) {
      if (!def.traits?.requiresSortedArray) continue;
      const result = def.validateInput(unsorted);
      expect(result.ok, `${def.slug} must reject unsorted input`).toBe(false);
      if (!result.ok) expect(result.message.toLowerCase()).toContain("sorted");
    }
  });

  it("linear search accepts unsorted input", () => {
    expect(linearSearchDefinition.validateInput(unsorted).ok).toBe(true);
    const steps = run(linearSearchDefinition, unsorted.array, unsorted.target);
    expect(resultIndex(steps)).toBe(2);
  });

  it("search inputs require a numeric target", () => {
    for (const def of DEFINITIONS) {
      const result = def.validateInput({ array: [1, 2, 3], target: Number.NaN });
      expect(result.ok, `${def.slug} must reject NaN target`).toBe(false);
    }
  });
});
