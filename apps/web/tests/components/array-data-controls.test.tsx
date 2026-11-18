import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { renderToStaticMarkup } from "react-dom/server";
import { ArrayDataControls } from "@/components/visualizer/ArrayDataControls";
import { bubbleSortDefinition } from "@/lib/algorithms/sorting/bubble-sort/definition";
import { binarySearchDefinition } from "@/lib/algorithms/search/binary-search/definition";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { VisualizerToolbar } from "@/components/visualizer/VisualizerToolbar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { bfsDefinition } from "@/lib/algorithms/extended/graph";
import { reverseDefinition } from "@/lib/algorithms/extended/lists";
import { editDefinition, knapsackDefinition } from "@/lib/algorithms/extended/dp";
import { ModuleDataControls } from "@/components/visualizer/ModuleDataControls";

beforeEach(() => usePlaybackStore.getState().cancelRun());
afterEach(() => {
  cleanup();
  usePlaybackStore.getState().cancelRun();
});

describe("module input initialization", () => {
  for (const scenario of [
    {
      definition: bfsDefinition,
      fields: { "Graph nodes": "X, Y", "Graph edges": "X Y", "Start node": "X" },
      expected: { nodes: ["X", "Y"], edges: [["X", "Y"]], start: "X", directed: false },
    },
    {
      definition: reverseDefinition,
      fields: { "List values": "9, 8, 7" },
      expected: { values: [9, 8, 7] },
    },
    {
      definition: editDefinition,
      fields: { "First string": "cat", "Second string": "cut" },
      expected: { a: "cat", b: "cut" },
    },
    {
      definition: knapsackDefinition,
      fields: { "Knapsack items": "1, 2\n2, 3", "Knapsack capacity": "2" },
      expected: { items: [{ weight: 1, value: 2 }, { weight: 2, value: 3 }], capacity: 2 },
    },
  ]) {
    it(scenario.definition.slug + " keeps its draft when the initial default is published", () => {
      usePlaybackStore.setState({ selectedAlgorithmSlug: null, selectedInput: null });
      render(<ModuleDataControls definition={scenario.definition} />);
      for (const [label, value] of Object.entries(scenario.fields)) {
        fireEvent.change(screen.getByRole("textbox", { name: label }), { target: { value } });
      }
      act(() => usePlaybackStore.setState({
        selectedAlgorithmSlug: scenario.definition.slug,
        selectedInput: scenario.definition.defaultInput,
      }));
      for (const [label, value] of Object.entries(scenario.fields)) {
        expect(screen.getByRole("textbox", { name: label })).toHaveValue(value);
      }
      fireEvent.click(screen.getByRole("button", { name: "Apply input" }));
      expect(usePlaybackStore.getState().selectedInput).toEqual(scenario.expected);
    });
  }
});

describe("array input initialization", () => {
  for (const definition of [bubbleSortDefinition, bfsDefinition, reverseDefinition, editDefinition, knapsackDefinition]) {
    it(definition.slug + " does not expose editable server-rendered input controls before hydration", () => {
      const markup = renderToStaticMarkup(<TooltipProvider><VisualizerToolbar definition={definition} /></TooltipProvider>);
      const document = new DOMParser().parseFromString(markup, "text/html");
      const controls = [...document.querySelectorAll("fieldset input, fieldset textarea, fieldset button, fieldset select")];
      expect(controls.length).toBeGreaterThan(0);
      expect(controls.every(control => control.matches(":disabled"))).toBe(true);
    });
  }

  it("keeps an edited array when the shell publishes the same initial default input", () => {
    usePlaybackStore.setState({ selectedAlgorithmSlug: null, selectedInput: null });
    render(<ArrayDataControls definition={bubbleSortDefinition} />);
    const input = screen.getByRole("textbox", { name: "Array values" });
    expect(input).toHaveValue("5, 2, 9, 1, 6, 3, 8, 4");
    fireEvent.change(input, { target: { value: "3, 1, 2" } });
    act(() => usePlaybackStore.setState({
      selectedAlgorithmSlug: bubbleSortDefinition.slug,
      selectedInput: bubbleSortDefinition.defaultInput,
    }));
    expect(input).toHaveValue("3, 1, 2");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(usePlaybackStore.getState().selectedInput).toEqual({ array: [3, 1, 2] });
  });

  it("keeps both search drafts when the shell publishes its initial defaults", () => {
    usePlaybackStore.setState({ selectedAlgorithmSlug: null, selectedInput: null });
    render(<ArrayDataControls definition={binarySearchDefinition} />);
    const input = screen.getByRole("textbox", { name: "Array values" });
    const target = screen.getByRole("textbox", { name: "Target value" });
    fireEvent.change(input, { target: { value: "1, 3, 5, 7, 9" } });
    fireEvent.change(target, { target: { value: "7" } });
    act(() => usePlaybackStore.setState({
      selectedAlgorithmSlug: binarySearchDefinition.slug,
      selectedInput: binarySearchDefinition.defaultInput,
    }));
    expect(input).toHaveValue("1, 3, 5, 7, 9");
    expect(target).toHaveValue("7");
    fireEvent.click(screen.getByRole("button", { name: "Apply" }));
    expect(usePlaybackStore.getState().selectedInput).toEqual({ array: [1, 3, 5, 7, 9], target: 7 });
  });

  it("shows the new algorithm defaults while another module remains selected", () => {
    usePlaybackStore.setState({ selectedAlgorithmSlug: "bfs", selectedInput: { nodes: ["A"], edges: [], directed: false, start: "A" } });
    render(<ArrayDataControls definition={binarySearchDefinition} />);
    expect(screen.getByRole("textbox", { name: "Array values" })).toHaveValue(binarySearchDefinition.defaultInput.array.join(", "));
    expect(screen.getByRole("textbox", { name: "Target value" })).toHaveValue(String(binarySearchDefinition.defaultInput.target));
  });
});
