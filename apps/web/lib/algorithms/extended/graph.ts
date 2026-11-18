import type { VisualizationStep } from "../types";
import { extraSources } from "./sources";
import {
  copy,
  definition,
  frameEmitter,
  invalid,
  sourcePair,
  valid,
  type GraphInput,
  type GraphState,
} from "./types";

export function validateGraph(input: GraphInput) {
  if (
    !input ||
    !Array.isArray(input.nodes) ||
    !Array.isArray(input.edges) ||
    typeof input.directed !== "boolean" ||
    typeof input.start !== "string"
  )
    return invalid(
      "Provide nodes, edges, a start node, and a directed setting.",
    );
  if (input.nodes.length > 30 || input.edges.length > 60)
    return invalid("Use at most 30 nodes and 60 edges.");
  if (
    input.nodes.some(
      (n) => typeof n !== "string" || !/^[A-Za-z0-9_-]{1,12}$/.test(n),
    ) ||
    new Set(input.nodes).size !== input.nodes.length
  )
    return invalid(
      "Node labels must be unique, 1–12 letters, numbers, underscores or hyphens.",
    );
  if (
    input.nodes.length ? !input.nodes.includes(input.start) : input.start !== ""
  )
    return invalid(
      "Choose a start node that exists; use an empty start for an empty graph.",
    );
  const seen = new Set<string>();
  for (const edge of input.edges) {
    if (
      !Array.isArray(edge) ||
      edge.length !== 2 ||
      !input.nodes.includes(edge[0]) ||
      !input.nodes.includes(edge[1])
    )
      return invalid("Every edge must name exactly two existing nodes.");
    const key = JSON.stringify(input.directed ? edge : [...edge].sort());
    if (seen.has(key))
      return invalid(
        "Remove duplicate edges (including reversed duplicates in undirected graphs).",
      );
    seen.add(key);
  }
  return valid;
}

const sample: GraphInput = {
  nodes: ["A", "B", "C", "D", "E", "F"],
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
const bfsSource = sourcePair(
  [
    "function bfs(graph: Record<string, string[]>, start: string) {",
    "  const seen = new Set([start]), queue = start in graph ? [start] : [], order: string[] = [];",
    "  while (queue.length) {",
    "    const node = queue.shift()!; order.push(node);",
    "    for (const next of [...graph[node]].sort()) {",
    "      if (!seen.has(next)) {",
    "        seen.add(next); queue.push(next);",
    "      }",
    "    }",
    "  }",
    "  return order;",
    "}",
  ],
  [
    "def bfs(graph, start):",
    "    seen, queue, order = {start}, [start] if start in graph else [], []",
    "    while queue:",
    "        node = queue.pop(0); order.append(node)",
    "        for neighbor in sorted(graph[node]):",
    "            if neighbor not in seen:",
    "                seen.add(neighbor); queue.append(neighbor)",
    "    return order",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 11: 8 },
  extraSources.bfs,
);
const dfsSource = sourcePair(
  [
    "function dfs(graph: Record<string, string[]>, start: string) {",
    "  const seen = new Set([start]), stack = start in graph ? [start] : [], order: string[] = [];",
    "  while (stack.length) {",
    "    const node = stack.pop()!; order.push(node);",
    "    for (const next of [...graph[node]].sort().reverse()) {",
    "      if (!seen.has(next)) {",
    "        seen.add(next); stack.push(next);",
    "      }",
    "    }",
    "  }",
    "  return order;",
    "}",
  ],
  [
    "def dfs(graph, start):",
    "    seen, stack, order = {start}, [start] if start in graph else [], []",
    "    while stack:",
    "        node = stack.pop(); order.append(node)",
    "        for neighbor in sorted(graph[node], reverse=True):",
    "            if neighbor not in seen:",
    "                seen.add(neighbor); stack.append(neighbor)",
    "    return order",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 11: 8 },
  extraSources.dfs,
);

/** Explicit frontier algorithm; DFS matches the shown iterative, discovery-on-push code. */
export function* graphSteps(
  input: GraphInput,
  dfs = false,
): Generator<VisualizationStep<GraphState, Record<string, never>>> {
  const slug = dfs ? "dfs" : "bfs";
  const emit = frameEmitter<GraphState, Record<string, never>>(slug, "graph");
  const labels = [...input.nodes].sort();
  const nodes = labels.map((id, index) => ({
    id,
    x:
      labels.length === 1
        ? 300
        : 300 +
          Math.cos((index * 2 * Math.PI) / labels.length - Math.PI / 2) * 220,
    y:
      labels.length === 1
        ? 220
        : 220 +
          Math.sin((index * 2 * Math.PI) / labels.length - Math.PI / 2) * 170,
  }));
  const edges = input.edges.map(([from, to], index) => ({
    id: "edge-" + index,
    from,
    to,
  }));
  const adjacency = new Map(
    labels.map((id) => [id, [] as { node: string; edge: string }[]]),
  );
  for (const edge of edges) {
    adjacency.get(edge.from)!.push({ node: edge.to, edge: edge.id });
    if (!input.directed && edge.from !== edge.to)
      adjacency.get(edge.to)!.push({ node: edge.from, edge: edge.id });
  }
  for (const neighbors of adjacency.values())
    neighbors.sort((a, b) => (a.node < b.node ? -1 : a.node > b.node ? 1 : 0));
  const state: GraphState = {
    nodes,
    edges,
    directed: input.directed,
    status: Object.fromEntries(labels.map((n) => [n, "unseen"])),
    frontier: labels.length ? [input.start] : [],
    order: [],
    current: null,
    activeEdge: null,
    parents: Object.fromEntries(labels.map((n) => [n, null])),
  };
  const depths = new Map<string, number>(
    labels.length ? [[input.start, 0]] : [],
  );
  if (labels.length) state.status[input.start] = "frontier";
  const metrics = () => ({
    visited: state.order.length,
    recursionDepth: state.current ? (depths.get(state.current) ?? 0) : 0,
    ...(dfs
      ? { stackSize: state.frontier.length }
      : { queueSize: state.frontier.length }),
  });
  yield emit(
    state,
    {},
    2,
    labels.length
      ? "Discover " +
          input.start +
          "; add it to the " +
          (dfs ? "stack." : "queue.")
      : "The graph is empty.",
    "init",
    metrics(),
  );
  while (state.frontier.length) {
    const current = dfs ? state.frontier.pop()! : state.frontier.shift()!;
    state.current = current;
    state.activeEdge = null;
    state.status[current] = "current";
    state.order.push(current);
    yield emit(state, {}, 4, "Visit " + current + ".", "visit", metrics());
    const neighbors = copy(adjacency.get(current)!);
    if (dfs) neighbors.reverse();
    for (const { node, edge } of neighbors) {
      state.activeEdge = edge;
      yield emit(
        state,
        {},
        5,
        "Inspect " + current + (input.directed ? " → " : " — ") + node + ".",
        "edge",
        metrics(),
      );
      if (state.status[node] === "unseen") {
        state.status[node] = "frontier";
        state.frontier.push(node);
        state.parents[node] = current;
        depths.set(node, (depths.get(current) ?? 0) + 1);
        yield emit(
          state,
          {},
          7,
          "Discover " +
            node +
            " from parent " +
            current +
            "; " +
            (dfs
              ? "push it once. It is visited when popped."
              : "enqueue it once. It is visited when dequeued."),
          "discover",
          metrics(),
        );
      }
    }
    state.status[current] = "visited";
    state.activeEdge = null;
    yield emit(
      state,
      {},
      3,
      "Finished inspecting " + current + ".",
      "finish-node",
      metrics(),
    );
  }
  state.current = null;
  yield emit(
    state,
    {},
    11,
    "Traversal complete: " +
      (state.order.join(" → ") || "empty graph") +
      ". Unreachable nodes remain unvisited.",
    "complete",
    metrics(),
  );
}

export const bfsDefinition = definition<
  GraphInput,
  GraphState,
  Record<string, never>
>({
  slug: "bfs",
  title: "Breadth-First Search",
  category: "graph",
  difficulty: "beginner",
  visualizerKind: "graph",
  summary: "Explore a graph in layers with a queue.",
  description:
    "BFS discovers each reachable node once. Neighbors are ordered by label; disconnected components remain untouched. Directed edges are followed only from source to target.",
  complexity: { time: "O(V + E)", space: "O(V)" },
  preconditions: [
    "Traverses the component reachable from the chosen start.",
    "Neighbor labels use deterministic lexical order.",
  ],
  defaultInput: sample,
  presets: [
    { id: "disconnected", label: "Disconnected graph", input: sample },
    {
      id: "directed-cycle",
      label: "Directed cycle",
      input: {
        nodes: ["A", "B", "C"],
        edges: [
          ["A", "B"],
          ["B", "C"],
          ["C", "A"],
        ],
        directed: true,
        start: "A",
      },
    },
    {
      id: "empty",
      label: "Empty graph",
      input: { nodes: [], edges: [], directed: false, start: "" },
    },
  ],
  ...bfsSource,
  validateInput: validateGraph,
  generateSteps: (input) => graphSteps(input),
});
export const dfsDefinition = definition<
  GraphInput,
  GraphState,
  Record<string, never>
>({
  ...bfsDefinition,
  slug: "dfs",
  title: "Depth-First Search",
  summary: "Follow a graph frontier with an explicit stack.",
  difficulty: "intermediate",
  description:
    "Iterative DFS discovers nodes on push. Neighbors are pushed in reverse lexical order so the smallest available neighbor is popped first. This explicit-stack variant follows the displayed code and need not share a recursive DFS visitation order.",
  ...dfsSource,
  generateSteps: (input) => graphSteps(input, true),
});
