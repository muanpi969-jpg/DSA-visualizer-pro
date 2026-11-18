import { describe, expect, it } from "vitest";
import { runInNewContext } from "node:vm";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  GraphInput,
  InsertInput,
  KnapsackInput,
  StringInput,
} from "@/lib/algorithms/extended/types";
import { bfsDefinition, dfsDefinition } from "@/lib/algorithms/extended/graph";
import {
  insertDefinition,
  reverseDefinition,
  middleDefinition,
} from "@/lib/algorithms/extended/lists";
import {
  editDefinition,
  lcsDefinition,
  knapsackDefinition,
} from "@/lib/algorithms/extended/dp";

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
const names: Record<string, string> = {
  bfs: "bfs",
  dfs: "dfs",
  "linked-list-insert": "insertAfter",
  "linked-list-reverse": "reverse",
  "linked-list-middle": "middle",
  "edit-distance": "editDistance",
  lcs: "lcs",
  knapsack: "knapsack",
};
const compiler = process.env.CC ?? "cc";
const hasCompiler =
  spawnSync(compiler, ["--version"], { stdio: "ignore" }).status === 0;
function cases(definition: AnyAlgorithmDefinition): unknown[] {
  const inputs = [
    definition.defaultInput,
    ...definition.presets.map((preset) => preset.input),
  ];
  if (definition.slug === "bfs" || definition.slug === "dfs")
    inputs.push({
      nodes: ["A", "B", "C"],
      edges: [
        ["B", "A"],
        ["A", "A"],
        ["A", "C"],
      ],
      directed: true,
      start: "A",
    });
  if (definition.slug === "edit-distance" || definition.slug === "lcs")
    inputs.push({ a: "😀a", b: "😀b" }, { a: "", b: "" });
  if (definition.slug === "knapsack")
    inputs.push(
      { items: [], capacity: 40 },
      {
        items: [
          { weight: 9007199254740991, value: 5 },
          { weight: 1, value: 9007199254740986 },
        ],
        capacity: 1,
      },
    );
  return inputs;
}
interface Node {
  value: number;
  next: Node | null;
}
function list(values: number[]): Node | null {
  let head: Node | null = null;
  for (const value of [...values].reverse()) head = { value, next: head };
  return head;
}
function values(head: Node | null) {
  const result: number[] = [];
  while (head) {
    result.push(head.value);
    head = head.next;
  }
  return result;
}
describe("JavaScript sources for extended modules", () => {
  for (const definition of definitions)
    it(
      definition.slug +
        " executes the shown JavaScript and matches the visualized result",
      () => {
        const source = definition.code.javascript!;
        const execute = runInNewContext(source + "\n" + names[definition.slug]);
        for (const input of cases(definition)) {
          const state = Array.from(definition.generateSteps(input)).at(
            -1,
          )!.state;
          if (definition.slug === "bfs" || definition.slug === "dfs") {
            const graphInput = input as GraphInput;
            const adjacency = Object.fromEntries(
              graphInput.nodes.map((label) => [label, [] as string[]]),
            );
            for (const [from, to] of graphInput.edges) {
              adjacency[from].push(to);
              if (!graphInput.directed && from !== to) adjacency[to].push(from);
            }
            expect(execute(adjacency, graphInput.start)).toEqual(state.order);
          } else if (definition.slug.startsWith("linked-list")) {
            const listInput = input as InsertInput;
            const head = list(listInput.values);
            if (definition.slug === "linked-list-middle")
              expect((execute(head) as Node | null)?.value ?? null).toBe(
                state.resultIds.length
                  ? state.nodes.find(
                      (node: Node & { id: string }) =>
                        node.id === state.resultIds[0],
                    ).value
                  : null,
              );
            else {
              const result =
                definition.slug === "linked-list-insert"
                  ? execute(head, listInput.afterIndex, listInput.value)
                  : execute(head);
              expect(values(result)).toEqual(
                state.resultIds.map(
                  (id: string) =>
                    state.nodes.find(
                      (node: Node & { id: string }) => node.id === id,
                    ).value,
                ),
              );
            }
          } else if (definition.slug === "knapsack") {
            const knapsackInput = input as KnapsackInput;
            expect(
              execute(knapsackInput.items, knapsackInput.capacity),
            ).toEqual({
              value: state.table.at(-1).at(-1),
              selected: state.selectedItems,
            });
          } else {
            const stringInput = input as StringInput;
            const result = execute(stringInput.a, stringInput.b);
            if (definition.slug === "lcs") expect(result).toBe(state.sequence);
            else {
              expect(result.distance).toBe(state.table.at(-1).at(-1));
              expect(
                result.operations.map((operation: string) =>
                  operation.toLowerCase(),
                ),
              ).toEqual(
                state.operations.map((operation: string) =>
                  operation.toLowerCase(),
                ),
              );
            }
          }
        }
      },
    );
});

const pointArray = (text: string) =>
  [...text].map((character) => character.codePointAt(0)!).join(", ") || "0";
function cCase(definition: AnyAlgorithmDefinition, input: unknown): string {
  const state = Array.from(definition.generateSteps(input)).at(-1)!.state;
  if (definition.slug === "bfs" || definition.slug === "dfs") {
    const graph = input as GraphInput,
      labels = [...graph.nodes].sort();
    const adjacency = labels.map(() => [] as number[]);
    for (const [from, to] of graph.edges) {
      adjacency[labels.indexOf(from)].push(labels.indexOf(to));
      if (!graph.directed && from !== to)
        adjacency[labels.indexOf(to)].push(labels.indexOf(from));
    }
    const fill = adjacency
      .map(
        (neighbors, index) =>
          "graph[" +
          index +
          "] = (Adjacency){ " +
          neighbors.length +
          ", { " +
          (neighbors.sort((a, b) => a - b).join(", ") || "0") +
          " } };",
      )
      .join("\n");
    const expected = state.order.map((id: string) => labels.indexOf(id));
    const parents = labels.map((label) =>
      state.parents[label] === null ? -1 : labels.indexOf(state.parents[label]),
    );
    return (
      "{ Adjacency graph[30] = {{0}}; int order[30], parent[30];\n" +
      fill +
      "\nint expected[30] = { " +
      (expected.join(", ") || "0") +
      " }, parents[30] = { " +
      (parents.join(", ") || "0") +
      " };\nint count = " +
      definition.slug +
      "(" +
      labels.length +
      ", graph, " +
      labels.indexOf(graph.start) +
      ", order, parent);\nassert(count == " +
      expected.length +
      "); for (int i = 0; i < count; i++) assert(order[i] == expected[i]); for (int i = 0; i < " +
      labels.length +
      "; i++) assert(parent[i] == parents[i]); }"
    );
  }
  if (definition.slug.startsWith("linked-list")) {
    const listInput = input as InsertInput;
    const setup =
      "Node nodes[12] = {{0}};\n" +
      listInput.values
        .map(
          (value, index) =>
            "nodes[" +
            index +
            "] = (Node){ " +
            value +
            ", " +
            (index + 1 < listInput.values.length
              ? "&nodes[" + (index + 1) + "]"
              : "NULL") +
            " };",
        )
        .join("\n") +
      "\nNode *head = " +
      (listInput.values.length ? "&nodes[0]" : "NULL") +
      ";\n";
    if (definition.slug === "linked-list-middle")
      return (
        "{ " +
        setup +
        "assert(middle(head) == " +
        (listInput.values.length
          ? "&nodes[" + Math.floor(listInput.values.length / 2) + "]"
          : "NULL") +
        "); (void)nodes; }"
      );
    const expected = state.resultIds.map(
      (id: string) =>
        state.nodes.find((node: Node & { id: string }) => node.id === id).value,
    );
    const execute =
      definition.slug === "linked-list-insert"
        ? "assert(insert_after(&head, " +
          listInput.afterIndex +
          ", " +
          listInput.value +
          ")); Node *allocated = " +
          (listInput.values.length
            ? "nodes[" + listInput.afterIndex + "].next"
            : "head") +
          ";"
        : "head = reverse(head);";
    return (
      "{ " +
      setup +
      execute +
      "\ndouble expected[12] = { " +
      (expected.join(", ") || "0") +
      " }; size_t count = 0;\nfor (Node *node = head; node; node = node->next) { assert(count < " +
      expected.length +
      "); assert(node->value == expected[count++]); } assert(count == " +
      expected.length +
      "); (void)nodes;" +
      (definition.slug === "linked-list-insert" ? " free(allocated);" : "") +
      " }"
    );
  }
  if (definition.slug === "knapsack") {
    const knapsack = input as KnapsackInput;
    return (
      "{ Item items[12] = { " +
      (knapsack.items
        .map(
          (item) =>
            "{ INT64_C(" + item.weight + "), INT64_C(" + item.value + ") }",
        )
        .join(", ") || "{0}") +
      " };\nKnapsackResult out; assert(knapsack(items, " +
      knapsack.items.length +
      ", " +
      knapsack.capacity +
      ", &out)); assert(out.value == INT64_C(" +
      state.table.at(-1).at(-1) +
      ")); assert(out.count == " +
      state.selectedItems.length +
      "); size_t expected[12] = { " +
      (state.selectedItems.join(", ") || "0") +
      " }; for (size_t i = 0; i < out.count; i++) assert(out.selected[i] == expected[i]); }"
    );
  }
  const strings = input as StringInput;
  const setup =
    "uint32_t x[12] = { " +
    pointArray(strings.a) +
    " }, y[12] = { " +
    pointArray(strings.b) +
    " }; size_t m = " +
    [...strings.a].length +
    ", n = " +
    [...strings.b].length +
    ";\n";
  if (definition.slug === "lcs")
    return (
      "{ " +
      setup +
      "uint32_t result[12], expected[12] = { " +
      pointArray(state.sequence) +
      " }; int length = lcs(x, m, y, n, result); assert(length == " +
      [...state.sequence].length +
      "); for (int k = 0; k < length; k++) assert(result[k] == expected[k]); }"
    );
  return (
    "{ " +
    setup +
    "EditResult out; assert(edit_distance(x, m, y, n, &out)); assert(out.distance == " +
    state.table.at(-1).at(-1) +
    ");\nsize_t cursor = 0, produced = 0; int edits = 0; uint32_t transformed[24];\nfor (size_t k = 0; k < out.count; k++) {\nEdit operation = out.operations[k]; assert(produced < 24);\nif (operation.kind == MATCH || operation.kind == REPLACE || operation.kind == DELETE_CHAR) { assert(cursor < m); assert(x[cursor++] == operation.from); }\nif (operation.kind != DELETE_CHAR) transformed[produced++] = operation.to;\nif (operation.kind != MATCH) edits++;\n}\nassert(cursor == m && produced == n && edits == out.distance); for (size_t k = 0; k < n; k++) assert(transformed[k] == y[k]); }"
  );
}

describe("compiled C sources for extended modules", () => {
  for (const definition of definitions)
    it.skipIf(!hasCompiler)(
      definition.slug + " compiles as C11 and matches visualizer results",
      () => {
        const directory = mkdtempSync(join(tmpdir(), "dsa-source-"));
        try {
          const program =
            definition.code.c +
            "\n#include <assert.h>\nint main(void) {\n" +
            cases(definition)
              .map((input) => cCase(definition, input))
              .join("\n") +
            "\nreturn 0;\n}\n";
          const executable = join(directory, "verify");
          execFileSync(
            compiler,
            [
              "-std=c11",
              "-Wall",
              "-Wextra",
              "-Werror",
              "-x",
              "c",
              "-",
              "-o",
              executable,
            ],
            {
              input: program,
              encoding: "utf8",
              stdio: ["pipe", "pipe", "pipe"],
            },
          );
          execFileSync(executable, [], { timeout: 5000, stdio: "pipe" });
          expect(definition.code.c).toContain("#include");
        } finally {
          rmSync(directory, { recursive: true, force: true });
        }
      },
    );
});
