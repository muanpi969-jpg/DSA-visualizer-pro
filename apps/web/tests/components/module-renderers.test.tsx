import { describe, expect, it } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { GraphRenderer } from "@/components/renderers/GraphRenderer";
import { LinkedListRenderer } from "@/components/renderers/LinkedListRenderer";
import { MatrixRenderer } from "@/components/renderers/MatrixRenderer";
import { parseModuleInput } from "@/components/visualizer/ModuleDataControls";
import { bfsDefinition } from "@/lib/algorithms/extended/graph";
import { reverseDefinition } from "@/lib/algorithms/extended/lists";
import { editDefinition } from "@/lib/algorithms/extended/dp";

describe("module renderers", () => {
  it("renders graph direction and a traversal summary accessibly", () => {
    const step = Array.from(
      bfsDefinition.generateSteps({
        nodes: ["A", "B"],
        edges: [["A", "B"]],
        directed: true,
        start: "A",
      }),
    ).at(-1)!;
    render(<GraphRenderer step={step} reducedMotion />);
    expect(
      screen.getByRole("img", { name: /Directed graph; visited order: A, B/ }),
    ).toBeInTheDocument();
    expect(screen.getByText("A → B", { selector: "p" })).toBeInTheDocument();
    cleanup();
  });
  it("renders the reversed link result and null pointers", () => {
    const step = Array.from(
      reverseDefinition.generateSteps({ values: [1, 2, 3] }),
    ).at(-1)!;
    render(<LinkedListRenderer step={step} reducedMotion />);
    expect(screen.getByText("Reversed: 3 → 2 → 1")).toBeInTheDocument();
    expect(screen.getByText(/current = null/)).toBeInTheDocument();
    cleanup();
  });
  it("renders matrix cells with row/column semantics and reconstructed operations", () => {
    const step = Array.from(
      editDefinition.generateSteps({ a: "a", b: "b" }),
    ).at(-1)!;
    render(<MatrixRenderer step={step} reducedMotion />);
    expect(
      screen.getByRole("table", { name: "Dynamic programming table" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Edit distance: 1")).toBeInTheDocument();
    expect(
      screen.getByRole("cell", { name: /Row 1, column 1: 1/ }),
    ).toBeInTheDocument();
    cleanup();
  });
});
describe("strict module input parsing", () => {
  it("preserves complete strings and supports empty lists", () => {
    expect(parseModuleInput("lcs", { a: " a ", b: "" })).toEqual({
      a: " a ",
      b: "",
    });
    expect(parseModuleInput("linked-list-reverse", { values: "" })).toEqual({
      values: [],
    });
  });
  it("rejects malformed edge/item records and nonfinite numbers", () => {
    expect(() =>
      parseModuleInput("bfs", {
        nodes: "A,B,C",
        edges: "A B C",
        start: "A",
        directed: "false",
      }),
    ).toThrow(/exactly two/);
    expect(() =>
      parseModuleInput("knapsack", { items: "1,2,3", capacity: "4" }),
    ).toThrow(/weight and value/);
    expect(() =>
      parseModuleInput("linked-list-reverse", { values: "1, Infinity" }),
    ).toThrow(/finite decimal/);
    expect(() =>
      parseModuleInput("knapsack", { items: "1,2", capacity: "" }),
    ).toThrow(/finite decimal/);
  });
});
