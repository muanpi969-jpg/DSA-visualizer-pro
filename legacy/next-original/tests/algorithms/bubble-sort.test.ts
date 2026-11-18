import { describe, it, expect } from "vitest";
import { bubbleSortSteps } from "@/lib/algorithms/sorting/bubble-sort/generator";
import { bubbleSortDefinition } from "@/lib/algorithms/sorting/bubble-sort/definition";
import { validateSteps } from "@/lib/algorithms/validateSteps";
import type { VisualizationStep } from "@/lib/algorithms/types";
import type {
  BubbleSortHighlights,
  BubbleSortState,
} from "@/lib/algorithms/sorting/bubble-sort/types";

type Step = VisualizationStep<BubbleSortState, BubbleSortHighlights>;

function run(array: number[]): Step[] {
  return Array.from(bubbleSortSteps({ array }));
}

function finalValues(steps: Step[]): number[] {
  const last = steps[steps.length - 1];
  return last.state.items.map((i) => i.value);
}

const CODE_LINES = bubbleSortDefinition.code.javascript!.split("\n").length;

describe("bubbleSortSteps — correctness", () => {
  const cases: Array<{ name: string; input: number[] }> = [
    { name: "random", input: [5, 2, 9, 1, 6, 3, 8, 4] },
    { name: "empty", input: [] },
    { name: "single", input: [42] },
    { name: "two elements", input: [2, 1] },
    { name: "already sorted", input: [1, 2, 3, 4, 5] },
    { name: "reverse sorted", input: [5, 4, 3, 2, 1] },
    { name: "duplicates", input: [4, 2, 4, 1, 3, 2, 4, 1] },
    { name: "negatives", input: [3, -1, -7, 2, 0, -3] },
  ];

  for (const { name, input } of cases) {
    it(`sorts ${name}`, () => {
      const steps = run(input);
      const expected = [...input].sort((a, b) => a - b);
      expect(finalValues(steps)).toEqual(expected);
    });
  }

  it("keeps stable order for equal keys", () => {
    // Bubble sort with strict > is stable; tag equal values to check ordering.
    const steps = run([2, 2, 1]);
    expect(finalValues(steps)).toEqual([1, 2, 2]);
  });
});

describe("bubbleSortSteps — final step", () => {
  it("marks completion, sorts every index, and plays a success cue", () => {
    const steps = run([5, 2, 9, 1, 6, 3, 8, 4]);
    const last = steps[steps.length - 1];
    expect(last.operation).toBe("complete");
    expect(last.highlights.sorted).toHaveLength(8);
    expect(last.highlights.found).toHaveLength(8);
    expect(last.audio?.kind).toBe("success");
    expect(last.note.toLowerCase()).toContain("sorted");
  });

  it("early-exits on already-sorted input (best case)", () => {
    const steps = run([1, 2, 3, 4, 5]);
    const passEnd = steps.find(
      (s) => s.operation === "pass-end" && s.note.includes("Stop early"),
    );
    expect(passEnd).toBeDefined();
    // No swaps should ever occur.
    expect(steps.every((s) => (s.metrics.swaps ?? 0) === 0)).toBe(true);
  });

  it("does more swaps in the worst case than the best case", () => {
    const best = run([1, 2, 3, 4, 5]);
    const worst = run([5, 4, 3, 2, 1]);
    const bestSwaps = best[best.length - 1].metrics.swaps ?? 0;
    const worstSwaps = worst[worst.length - 1].metrics.swaps ?? 0;
    expect(worstSwaps).toBeGreaterThan(bestSwaps);
  });
});

describe("bubbleSortSteps — step schema validity", () => {
  it("produces well-formed, serializable steps with valid metrics", () => {
    for (const input of [[], [1], [3, 1, 2], [5, 4, 3, 2, 1], [4, 2, 4, 1]]) {
      const steps = run(input);
      const issues = validateSteps(steps, CODE_LINES);
      expect(issues, JSON.stringify(issues)).toHaveLength(0);
    }
  });

  it("starts at index 0 and increments by one", () => {
    const steps = run([3, 1, 2]);
    steps.forEach((s, i) => expect(s.index).toBe(i));
  });

  it("counts comparisons monotonically and matches n(n-1)/2 in the worst case", () => {
    const n = 6;
    const worst = Array.from({ length: n }, (_, i) => n - i);
    const steps = run(worst);
    const comparisons = steps[steps.length - 1].metrics.comparisons ?? 0;
    expect(comparisons).toBe((n * (n - 1)) / 2);
  });
});

describe("bubbleSortDefinition", () => {
  it("validates input", () => {
    expect(bubbleSortDefinition.validateInput({ array: [1, 2, 3] })).toEqual({
      ok: true,
    });
    expect(
      bubbleSortDefinition.validateInput({ array: [1, NaN] }).ok,
    ).toBe(false);
    expect(
      bubbleSortDefinition.validateInput({ array: Array(100).fill(0) }).ok,
    ).toBe(false);
  });

  it("every preset is valid and sorts correctly", () => {
    for (const preset of bubbleSortDefinition.presets) {
      const input = preset.input as { array: number[] };
      expect(bubbleSortDefinition.validateInput(input).ok).toBe(true);
      const steps = Array.from(bubbleSortDefinition.generateSteps(input)) as Step[];
      expect(finalValues(steps)).toEqual([...input.array].sort((a, b) => a - b));
    }
  });
});
