import { describe, expect, it } from "vitest";
import { getAllAlgorithms } from "@/lib/algorithms/registry";
import {
  bfsDefinition,
  dfsDefinition,
  validateGraph,
} from "@/lib/algorithms/extended/graph";
import {
  insertDefinition,
  reverseDefinition,
  middleDefinition,
  validateInsert,
  validateList,
} from "@/lib/algorithms/extended/lists";
import {
  editDefinition,
  lcsDefinition,
  knapsackDefinition,
  validateStrings,
  validateKnapsack,
} from "@/lib/algorithms/extended/dp";
import type {
  GraphInput,
  GraphState,
  ListState,
  MatrixState,
} from "@/lib/algorithms/extended/types";
import { validateSteps } from "@/lib/algorithms/validateSteps";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";

const definitions: AnyAlgorithmDefinition[] = [
  bfsDefinition,
  dfsDefinition,
  insertDefinition,
  reverseDefinition,
  middleDefinition,
  editDefinition,
  lcsDefinition,
  knapsackDefinition,
];
const end = <S>(steps: Generator<{ state: S }>) =>
  Array.from(steps).at(-1)!.state;

describe("extended module contracts", () => {
  it("registers exactly 20 unique working visualizers", () => {
    const all = getAllAlgorithms();
    expect(all).toHaveLength(20);
    expect(new Set(all.map((def) => def.slug)).size).toBe(20);
  });
  for (const definition of definitions) {
    it(
      definition.slug +
        " emits deterministic snapshots and valid code traces for every preset",
      () => {
        for (const input of [
          definition.defaultInput,
          ...definition.presets.map((preset) => preset.input),
        ]) {
          const def = definition;
          const before = JSON.stringify(input);
          expect(def.validateInput(input).ok).toBe(true);
          const steps = Array.from(def.generateSteps(input));
          expect(steps).toEqual(Array.from(def.generateSteps(input)));
          expect(JSON.stringify(input)).toBe(before);
          expect(
            validateSteps(steps, def.code.typescript!.split("\n").length),
          ).toEqual([]);
          expect(steps.at(-1)!.operation).toBe("complete");
          expect(steps.every((step) => step.audio === undefined)).toBe(true);
          const saved = JSON.stringify(steps[0]);
          if (steps.length > 1) {
            expect(steps[0].state).not.toBe(steps[1].state);
            expect(steps[0].highlights).not.toBe(steps[1].highlights);
          }
          expect(JSON.stringify(steps[0])).toBe(saved);
        }
      },
    );
  }
});

describe("graph traversals", () => {
  const graph: GraphInput = {
    nodes: ["E", "D", "C", "B", "A", "Z"],
    edges: [
      ["A", "B"],
      ["A", "C"],
      ["B", "D"],
      ["C", "E"],
      ["D", "E"],
    ],
    directed: false,
    start: "A",
  };
  it("BFS visits by layers and leaves disconnected nodes unseen", () => {
    const state = end<GraphState>(bfsDefinition.generateSteps(graph));
    expect(state.order).toEqual(["A", "B", "C", "D", "E"]);
    expect(state.status.Z).toBe("unseen");
    expect(state.frontier).toEqual([]);
  });
  it("DFS agrees with deterministic discovery-on-push explicit stack semantics", () => {
    const state = end<GraphState>(dfsDefinition.generateSteps(graph));
    expect(state.order).toEqual(["A", "B", "D", "E", "C"]);
    expect(new Set(state.order).size).toBe(state.order.length);
  });
  it("preserves directed edge orientation and handles a self-loop once", () => {
    const input: GraphInput = {
      nodes: ["A", "B", "C"],
      edges: [
        ["B", "A"],
        ["A", "A"],
        ["A", "C"],
      ],
      start: "A",
      directed: true,
    };
    for (const definition of [bfsDefinition, dfsDefinition]) {
      const state = end<GraphState>(definition.generateSteps(input));
      expect(state.order).toEqual(["A", "C"]);
      expect(state.status.B).toBe("unseen");
      expect(state.edges.map((edge) => [edge.from, edge.to])).toEqual(
        input.edges,
      );
    }
  });
  it("does not silently change invalid starts, duplicate edges or oversized graphs", () => {
    expect(validateGraph({ ...graph, start: "missing" }).ok).toBe(false);
    expect(
      validateGraph({
        ...graph,
        edges: [
          ["A", "B"],
          ["B", "A"],
        ],
      }).ok,
    ).toBe(false);
    expect(
      validateGraph({
        ...graph,
        nodes: Array.from({ length: 31 }, (_, i) => "N" + i),
      }).ok,
    ).toBe(false);
    expect(validateGraph({ ...graph, edges: [["A", "missing"]] }).ok).toBe(
      false,
    );
    expect(validateGraph({ ...graph, nodes: ["A", "A"] }).ok).toBe(false);
    expect(
      validateGraph({ nodes: [], edges: [], directed: true, start: "" }).ok,
    ).toBe(true);
  });
});

function linkedValues(state: ListState) {
  const result: number[] = [],
    seen = new Set<string>();
  let current = state.head;
  while (current !== null) {
    expect(seen.has(current)).toBe(false);
    seen.add(current);
    const node = state.nodes.find((node) => node.id === current)!;
    expect(node).toBeDefined();
    result.push(node.value);
    current = node.next;
  }
  return result;
}
describe("linked lists", () => {
  it("inserts at head creation, middle and tail without losing stable identities", () => {
    for (const input of [
      { values: [], afterIndex: 0, value: 9 },
      { values: [1, 2, 3], afterIndex: 0, value: 9 },
      { values: [1, 2, 3], afterIndex: 2, value: 9 },
    ]) {
      const steps = Array.from(insertDefinition.generateSteps(input));
      const expected = [...input.values];
      expected.splice(input.values.length ? input.afterIndex + 1 : 0, 0, 9);
      expect(linkedValues(steps.at(-1)!.state)).toEqual(expected);
      for (const step of steps)
        expect(new Set(step.state.nodes.map((node) => node.id)).size).toBe(
          step.state.nodes.length,
        );
      if (input.values.length) {
        const wire = steps.find((step) => step.code.activeLines.includes(6))!;
        const newNode = wire.state.nodes.at(-1)!;
        expect(wire.state.nodes[input.afterIndex].next).toBe(
          input.afterIndex + 1 < input.values.length
            ? "node-" + (input.afterIndex + 1)
            : null,
        );
        expect(newNode.next).toBe(wire.state.nodes[input.afterIndex].next);
      }
    }
  });
  it("reverses actual links, preserving values/IDs including duplicates", () => {
    for (const values of [[], [1], [1, 2], [3, 3, 7, 4]]) {
      const state = end<ListState>(reverseDefinition.generateSteps({ values }));
      expect(linkedValues(state)).toEqual([...values].reverse());
      expect(state.nodes.map((node) => node.id)).toEqual(
        values.map((_, i) => "node-" + i),
      );
    }
  });
  it("returns the second middle for every even list and no node for empty lists", () => {
    for (let length = 0; length <= 12; length++) {
      const values = Array.from({ length }, (_, i) => i);
      const state = end<ListState>(middleDefinition.generateSteps({ values }));
      expect(state.resultIds).toEqual(
        length ? ["node-" + Math.floor(length / 2)] : [],
      );
      expect(linkedValues(state)).toEqual(values);
    }
  });
  it("rejects invalid index/value and resulting lists over the limit", () => {
    expect(validateInsert({ values: [1], afterIndex: 1, value: 2 }).ok).toBe(
      false,
    );
    expect(validateInsert({ values: [], afterIndex: -1, value: 2 }).ok).toBe(
      false,
    );
    expect(validateInsert({ values: [], afterIndex: 0.5, value: 2 }).ok).toBe(
      false,
    );
    expect(
      validateInsert({ values: Array(12).fill(1), afterIndex: 0, value: 2 }).ok,
    ).toBe(false);
    expect(validateList({ values: [Infinity] }).ok).toBe(false);
  });
});

describe("dynamic programming and reconstruction", () => {
  it("computes edit distance and reconstructs exactly that many edits", () => {
    for (const [a, b, expected] of [
      ["kitten", "sitting", 3],
      ["", "cat", 3],
      ["cat", "", 3],
      ["same", "same", 0],
      ["😀a", "😀b", 1],
      ["", "", 0],
    ] as const) {
      const steps = Array.from(editDefinition.generateSteps({ a, b })),
        state = steps.at(-1)!.state;
      expect(state.table.at(-1)!.at(-1)).toBe(expected);
      expect(
        state.operations!.filter(
          (operation) => !operation.startsWith("Match "),
        ),
      ).toHaveLength(expected);
      const source = [...a],
        output: string[] = [];
      for (const operation of state.operations!) {
        if (operation.startsWith("Match ")) {
          expect(source.shift()).toBe(operation.slice(6));
          output.push(operation.slice(6));
        } else if (operation.startsWith("Delete "))
          expect(source.shift()).toBe(operation.slice(7));
        else if (operation.startsWith("Insert "))
          output.push(operation.slice(7));
        else {
          const [from, to] = operation.slice(8).split(" with ");
          expect(source.shift()).toBe(from);
          output.push(to);
        }
      }
      expect(source).toEqual([]);
      expect(output.join("")).toBe(b);
      expect(
        steps[0].state.table.every((row) => row.every((value) => value === 0)),
      ).toBe(true);
    }
  });
  const subsequence = (sequence: string, text: string) => {
    const chars = [...sequence];
    for (const char of text) if (chars[0] === char) chars.shift();
    return chars.length === 0;
  };
  it("reconstructs an optimal common subsequence, with deterministic ties", () => {
    for (const [a, b, length] of [
      ["ABCBDAB", "BDCABA", 4],
      ["", "ABC", 0],
      ["ABC", "XYZ", 0],
      ["😀xy", "a😀y", 2],
    ] as const) {
      const state = end<MatrixState>(lcsDefinition.generateSteps({ a, b }));
      expect([...state.sequence!]).toHaveLength(length);
      expect(subsequence(state.sequence!, a)).toBe(true);
      expect(subsequence(state.sequence!, b)).toBe(true);
    }
    expect(
      end<MatrixState>(lcsDefinition.generateSteps({ a: "AB", b: "BA" }))
        .sequence,
    ).toBe("A");
  });
  it("knapsack agrees with exhaustive subset search and reconstruction respects capacity", () => {
    const items = [
      { weight: 1, value: 2 },
      { weight: 3, value: 6 },
      { weight: 2, value: 5 },
      { weight: 4, value: 7 },
    ];
    for (let capacity = 0; capacity <= 10; capacity++) {
      let optimum = 0;
      for (let mask = 0; mask < 1 << items.length; mask++) {
        const subset = items.filter((_, index) => mask & (1 << index));
        if (subset.reduce((sum, item) => sum + item.weight, 0) <= capacity)
          optimum = Math.max(
            optimum,
            subset.reduce((sum, item) => sum + item.value, 0),
          );
      }
      const state = end<MatrixState>(
        knapsackDefinition.generateSteps({ items, capacity }),
      );
      const selected = state.selectedItems!.map((index) => items[index]);
      expect(state.table.at(-1)!.at(-1)).toBe(optimum);
      expect(selected.reduce((sum, item) => sum + item.value, 0)).toBe(optimum);
      expect(
        selected.reduce((sum, item) => sum + item.weight, 0),
      ).toBeLessThanOrEqual(capacity);
      expect(new Set(state.selectedItems).size).toBe(
        state.selectedItems!.length,
      );
    }
    expect(
      end<MatrixState>(
        knapsackDefinition.generateSteps({ items: [], capacity: 4 }),
      ).selectedItems,
    ).toEqual([]);
    expect(
      end<MatrixState>(
        knapsackDefinition.generateSteps({
          items: [
            { weight: 1, value: 2 },
            { weight: 1, value: 2 },
          ],
          capacity: 1,
        }),
      ).selectedItems,
    ).toEqual([0]);
  });
  it("rejects oversized strings and malformed knapsack values without coercion", () => {
    expect(validateStrings({ a: "a".repeat(13), b: "" }).ok).toBe(false);
    expect(validateStrings({ a: "😀".repeat(12), b: "" }).ok).toBe(true);
    for (const input of [
      { items: [{ weight: 0, value: 2 }], capacity: 3 },
      { items: [{ weight: 1, value: -1 }], capacity: 3 },
      { items: [], capacity: 41 },
      { items: [], capacity: 1.5 },
      { items: [{ weight: 1, value: Infinity }], capacity: 3 },
      { items: Array(13).fill({ weight: 1, value: 2 }), capacity: 3 },
    ])
      expect(validateKnapsack(input).ok).toBe(false);
  });
});
