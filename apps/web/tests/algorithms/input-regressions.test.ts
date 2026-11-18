import { describe, expect, it } from "vitest";
import {
  getAllAlgorithms,
  getAlgorithmBySlug,
} from "@/lib/algorithms/registry";
import { barHeight } from "@/components/renderers/array-visual";
import type { ArrayVizState } from "@/lib/algorithms/shared/array-model";
describe("array numeric validation", () => {
  for (const def of getAllAlgorithms().filter(
    (x) => x.visualizerKind === "array",
  )) {
    it(`${def.slug} rejects nonfinite values`, () => {
      for (const value of [Infinity, -Infinity, NaN])
        expect(
          def.validateInput({ ...def.defaultInput, array: [value] }).ok,
        ).toBe(false);
      if (def.traits?.hasTarget)
        expect(
          def.validateInput({ ...def.defaultInput, target: Infinity }).ok,
        ).toBe(false);
    });
  }
  it("interpolates extreme finite values without overflowing indices", () => {
    const def = getAlgorithmBySlug("interpolation-search")!;
    const steps = [
      ...def.generateSteps({ array: [-1e308, 0, 1e308], target: 0 }),
    ];
    expect(steps.at(-1)?.note).toMatch(/Found target 0 at index 1/);
  });
  it("renders extreme finite values at finite monotonic heights", () => {
    const heights = [-1e308, 0, 1e308].map((v) =>
      barHeight(v, -1e308, 1e308, 220),
    );
    expect(heights.every(Number.isFinite)).toBe(true);
    expect(heights).toEqual([...heights].sort((a, b) => a - b));
  });
  it("insertion counts actual swaps/writes and distinguishes ordered prefixes", () => {
    const def = getAlgorithmBySlug("insertion-sort")!;
    const steps = [...def.generateSteps({ array: [3, 1, 2] })];
    expect(steps.at(-1)?.metrics).toMatchObject({ swaps: 2, writes: 4 });
    expect(
      steps.some((s) => Object.hasOwn(s.highlights as object, "ordered")),
    ).toBe(true);
    expect(
      (steps.at(-1)?.state as ArrayVizState).items.map((x) => x.value),
    ).toEqual([1, 2, 3]);
  });
});
