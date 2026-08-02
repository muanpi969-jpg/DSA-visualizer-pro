import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ArrayRenderer } from "@/components/renderers/ArrayRenderer";
import type { VisualizationStep } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";

function makeStep(
  values: number[],
  highlights: ArrayVizHighlights,
): VisualizationStep<ArrayVizState, ArrayVizHighlights> {
  return {
    id: "s0",
    index: 0,
    kind: "array",
    state: { items: values.map((value, i) => ({ id: `el-${i}`, value })) },
    highlights,
    code: { language: "javascript", activeLines: [1] },
    metrics: {},
    note: "test",
  };
}

describe("ArrayRenderer", () => {
  it("renders each value and the accessible summary", () => {
    render(
      <ArrayRenderer
        step={makeStep([5, 2, 9], { comparing: [0, 1] })}
        reducedMotion={false}
      />,
    );
    // Values appear as bar labels.
    expect(screen.getAllByText("5").length).toBeGreaterThan(0);
    expect(screen.getAllByText("9").length).toBeGreaterThan(0);
    // Accessible summary reflects the comparison.
    expect(
      screen.getByText(/Comparing positions 0 and 1/i),
    ).toBeInTheDocument();
  });

  it("shows active pointer labels from highlights", () => {
    render(
      <ArrayRenderer
        step={makeStep([3, 1, 2], {
          pointers: [{ label: "j", index: 0, tone: "current" }],
        })}
        reducedMotion={true}
      />,
    );
    expect(screen.getByText("j")).toBeInTheDocument();
  });

  it("reports the found position when present", () => {
    render(
      <ArrayRenderer
        step={makeStep([1, 2, 3], { found: [2] })}
        reducedMotion={false}
      />,
    );
    expect(screen.getByText(/Result at position 2/i)).toBeInTheDocument();
  });
});
