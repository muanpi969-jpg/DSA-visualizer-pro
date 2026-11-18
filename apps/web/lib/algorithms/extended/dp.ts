import type { VisualizationStep } from "../types";
import { extraSources } from "./sources";
import {
  definition,
  frameEmitter,
  invalid,
  sourcePair,
  valid,
  type Cell,
  type KnapsackInput,
  type MatrixHighlights,
  type MatrixState,
  type StringInput,
} from "./types";

export function validateStrings(input: StringInput) {
  if (
    !input ||
    typeof input.a !== "string" ||
    typeof input.b !== "string" ||
    [...input.a].length > 12 ||
    [...input.b].length > 12
  )
    return invalid("Enter two strings of at most 12 Unicode characters each.");
  return valid;
}
export function validateKnapsack(input: KnapsackInput) {
  if (
    !input ||
    !Array.isArray(input.items) ||
    input.items.length > 12 ||
    !Number.isInteger(input.capacity) ||
    input.capacity < 0 ||
    input.capacity > 40
  )
    return invalid(
      "Use at most 12 items and an integer capacity from 0 to 40.",
    );
  if (
    input.items.some(
      (item) =>
        !item ||
        !Number.isSafeInteger(item.weight) ||
        item.weight <= 0 ||
        !Number.isSafeInteger(item.value) ||
        item.value < 0,
    ) ||
    !Number.isSafeInteger(
      input.items.reduce((sum, item) => sum + item.value, 0),
    )
  )
    return invalid(
      "Weights must be positive safe integers; values must be nonnegative safe integers with a safe total.",
    );
  return valid;
}
function stringState(a: string[], b: string[]): MatrixState {
  return {
    table: Array.from({ length: a.length + 1 }, () =>
      Array<number>(b.length + 1).fill(0),
    ),
    rowLabels: ["ε", ...a],
    columnLabels: ["ε", ...b],
    result: "",
  };
}
const editSource = sourcePair(
  [
    "function editDistance(a: string, b: string) {",
    "  const x = [...a], y = [...b];",
    "  const dp = Array.from({length: x.length + 1}, () => Array(y.length + 1).fill(0));",
    "  for (let i = 0; i <= x.length; i++) dp[i][0] = i;",
    "  for (let j = 0; j <= y.length; j++) dp[0][j] = j;",
    "  for (let i = 1; i <= x.length; i++) {",
    "    for (let j = 1; j <= y.length; j++) {",
    "      dp[i][j] = x[i-1] === y[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]);",
    "    }",
    "  }",
    "  let i = x.length, j = y.length; const operations: string[] = [];",
    "  while (i || j) {",
    '    if (i && j && x[i-1] === y[j-1]) { operations.push("match " + x[--i]); j--; }',
    '    else if (i && j && dp[i][j] === dp[i-1][j-1] + 1) { operations.push("replace " + x[--i] + " with " + y[--j]); }',
    '    else if (i && dp[i][j] === dp[i-1][j] + 1) { operations.push("delete " + x[--i]); }',
    '    else { operations.push("insert " + y[--j]); }',
    "  }",
    "  return { distance: dp[x.length][y.length], operations: operations.reverse() };",
    "}",
  ],
  [
    "def edit_distance(a, b):",
    "    x, y = list(a), list(b)",
    "    dp = [[0] * (len(y) + 1) for _ in range(len(x) + 1)]",
    "    for i in range(len(x) + 1): dp[i][0] = i",
    "    for j in range(len(y) + 1): dp[0][j] = j",
    "    for i in range(1, len(x) + 1):",
    "        for j in range(1, len(y) + 1):",
    "            dp[i][j] = dp[i-1][j-1] if x[i-1] == y[j-1] else 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])",
    "    i, j, operations = len(x), len(y), []",
    "    while i or j:",
    "        if i and j and x[i-1] == y[j-1]:",
    '            i -= 1; j -= 1; operations.append("match " + x[i])',
    "        elif i and j and dp[i][j] == dp[i-1][j-1] + 1:",
    '            i -= 1; j -= 1; operations.append("replace " + x[i] + " with " + y[j])',
    "        elif i and dp[i][j] == dp[i-1][j] + 1:",
    '            i -= 1; operations.append("delete " + x[i])',
    "        else:",
    '            j -= 1; operations.append("insert " + y[j])',
    "    return dp[len(x)][len(y)], list(reversed(operations))",
  ],
  {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    7: 7,
    8: 8,
    11: 9,
    12: 10,
    13: [11, 12],
    14: [13, 14],
    15: [15, 16],
    16: [17, 18],
    18: 19,
  },
  extraSources.edit,
);
const lcsSource = sourcePair(
  [
    "function lcs(a: string, b: string) {",
    "  const x = [...a], y = [...b];",
    "  const dp = Array.from({length: x.length + 1}, () => Array(y.length + 1).fill(0));",
    "  for (let i = 1; i <= x.length; i++) {",
    "    for (let j = 1; j <= y.length; j++) {",
    "      dp[i][j] = x[i-1] === y[j-1] ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);",
    "    }",
    "  }",
    "  let i = x.length, j = y.length; const result: string[] = [];",
    "  while (i && j) {",
    "    if (x[i-1] === y[j-1]) { result.push(x[--i]); j--; }",
    "    else if (dp[i-1][j] >= dp[i][j-1]) i--;",
    "    else j--;",
    "  }",
    '  return result.reverse().join("");',
    "}",
  ],
  [
    "def lcs(a, b):",
    "    x, y = list(a), list(b)",
    "    dp = [[0] * (len(y) + 1) for _ in range(len(x) + 1)]",
    "    for i in range(1, len(x) + 1):",
    "        for j in range(1, len(y) + 1):",
    "            dp[i][j] = dp[i-1][j-1] + 1 if x[i-1] == y[j-1] else max(dp[i-1][j], dp[i][j-1])",
    "    i, j, result = len(x), len(y), []",
    "    while i and j:",
    "        if x[i-1] == y[j-1]:",
    "            i -= 1; j -= 1; result.append(x[i])",
    "        elif dp[i-1][j] >= dp[i][j-1]: i -= 1",
    "        else: j -= 1",
    '    return "".join(reversed(result))',
  ],
  {
    1: 1,
    2: 2,
    3: 3,
    4: 4,
    5: 5,
    6: 6,
    9: 7,
    10: 8,
    11: 9,
    12: 11,
    13: 12,
    15: 13,
  },
  extraSources.lcs,
);
const knapsackSource = sourcePair(
  [
    "function knapsack(items: {weight: number; value: number}[], capacity: number) {",
    "  const dp = Array.from({length: items.length + 1}, () => Array(capacity + 1).fill(0));",
    "  for (let i = 1; i <= items.length; i++) {",
    "    for (let w = 0; w <= capacity; w++) {",
    "      const item = items[i-1], exclude = dp[i-1][w];",
    "      dp[i][w] = item.weight <= w ? Math.max(exclude, item.value + dp[i-1][w-item.weight]) : exclude;",
    "    }",
    "  }",
    "  let w = capacity; const selected: number[] = [];",
    "  for (let i = items.length; i > 0; i--) {",
    "    if (dp[i][w] > dp[i-1][w]) { selected.push(i-1); w -= items[i-1].weight; }",
    "  }",
    "  return { value: dp[items.length][capacity], selected: selected.reverse() };",
    "}",
  ],
  [
    "def knapsack(items, capacity):",
    "    dp = [[0] * (capacity + 1) for _ in range(len(items) + 1)]",
    "    for i, item in enumerate(items, 1):",
    "        for w in range(capacity + 1):",
    "            exclude = dp[i-1][w]",
    '            dp[i][w] = max(exclude, item["value"] + dp[i-1][w-item["weight"]]) if item["weight"] <= w else exclude',
    "    w, selected = capacity, []",
    "    for i in range(len(items), 0, -1):",
    "        if dp[i][w] > dp[i-1][w]:",
    '            selected.append(i-1); w -= items[i-1]["weight"]',
    "    return dp[len(items)][capacity], list(reversed(selected))",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 9: 7, 10: 8, 11: [9, 10], 13: 11 },
  extraSources.knapsack,
);

export function* editSteps(
  input: StringInput,
): Generator<VisualizationStep<MatrixState, MatrixHighlights>> {
  const a = [...input.a],
    b = [...input.b],
    state = stringState(a, b);
  const emit = frameEmitter<MatrixState, MatrixHighlights>(
    "edit-distance",
    "matrix",
  );
  let writes = 0;
  const metrics = () => ({
    writes,
    memoryCells: (a.length + 1) * (b.length + 1),
  });
  yield emit(
    state,
    {},
    3,
    "Rows are source prefixes; columns are target prefixes. Each cell stores the minimum edit count.",
    "init",
    metrics(),
  );
  for (let i = 0; i <= a.length; i++) {
    state.table[i][0] = i;
    writes++;
    yield emit(
      state,
      { active: [i, 0] },
      4,
      "Delete " + i + " characters to reach the empty target.",
      "write",
      metrics(),
    );
  }
  for (let j = 1; j <= b.length; j++) {
    state.table[0][j] = j;
    writes++;
    yield emit(
      state,
      { active: [0, j] },
      5,
      "Insert " + j + " characters into the empty source.",
      "write",
      metrics(),
    );
  }
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      state.table[i][j] =
        a[i - 1] === b[j - 1]
          ? state.table[i - 1][j - 1]
          : 1 +
            Math.min(
              state.table[i - 1][j],
              state.table[i][j - 1],
              state.table[i - 1][j - 1],
            );
      writes++;
      yield emit(
        state,
        {
          active: [i, j],
          dependencies: [
            [i - 1, j - 1],
            [i - 1, j],
            [i, j - 1],
          ],
        },
        8,
        a[i - 1] === b[j - 1]
          ? "Matching characters: carry the diagonal value."
          : "Choose the cheapest insertion, deletion or replacement: " +
              state.table[i][j] +
              ".",
        "write",
        metrics(),
      );
    }
  let i = a.length,
    j = b.length;
  const path: Cell[] = [[i, j]],
    operations: string[] = [];
  while (i || j) {
    let line: number, note: string;
    if (i && j && a[i - 1] === b[j - 1]) {
      note = "Match " + a[--i];
      j--;
      line = 13;
    } else if (i && j && state.table[i][j] === state.table[i - 1][j - 1] + 1) {
      note = "Replace " + a[--i] + " with " + b[--j];
      line = 14;
    } else if (i && state.table[i][j] === state.table[i - 1][j] + 1) {
      note = "Delete " + a[--i];
      line = 15;
    } else {
      note = "Insert " + b[--j];
      line = 16;
    }
    operations.unshift(note);
    path.push([i, j]);
    state.operations = [...operations];
    yield emit(
      state,
      { active: [i, j], path },
      line,
      "Reconstruct: " + note + ".",
      "backtrack",
      metrics(),
    );
  }
  state.result = "Edit distance: " + state.table[a.length][b.length];
  state.operations = operations;
  yield emit(
    state,
    { path },
    18,
    state.result + ". Read the reconstructed operations in source order.",
    "complete",
    metrics(),
  );
}
export function* lcsSteps(
  input: StringInput,
): Generator<VisualizationStep<MatrixState, MatrixHighlights>> {
  const a = [...input.a],
    b = [...input.b],
    state = stringState(a, b);
  const emit = frameEmitter<MatrixState, MatrixHighlights>("lcs", "matrix");
  let writes = 0;
  const metrics = () => ({
    writes,
    memoryCells: (a.length + 1) * (b.length + 1),
  });
  yield emit(
    state,
    {},
    3,
    "Empty prefixes have LCS length zero. Rows follow the first string; columns follow the second.",
    "init",
    metrics(),
  );
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++) {
      const match = a[i - 1] === b[j - 1];
      state.table[i][j] = match
        ? state.table[i - 1][j - 1] + 1
        : Math.max(state.table[i - 1][j], state.table[i][j - 1]);
      writes++;
      yield emit(
        state,
        {
          active: [i, j],
          dependencies: match
            ? [[i - 1, j - 1]]
            : [
                [i - 1, j],
                [i, j - 1],
              ],
        },
        6,
        match
          ? "Matching " + a[i - 1] + ": extend the diagonal subsequence."
          : "Characters differ: keep the longer prefix subsequence.",
        "write",
        metrics(),
      );
    }
  let i = a.length,
    j = b.length;
  const sequence: string[] = [],
    path: Cell[] = [[i, j]];
  while (i && j) {
    let line: number, note: string;
    if (a[i - 1] === b[j - 1]) {
      sequence.unshift(a[--i]);
      j--;
      line = 11;
      note = "Keep matching character " + a[i] + ".";
    } else if (state.table[i - 1][j] >= state.table[i][j - 1]) {
      i--;
      line = 12;
      note = "Move up; ties choose the earlier row.";
    } else {
      j--;
      line = 13;
      note = "Move left to the longer subsequence.";
    }
    path.push([i, j]);
    state.sequence = sequence.join("");
    yield emit(
      state,
      { active: [i, j], path },
      line,
      note,
      "backtrack",
      metrics(),
    );
  }
  state.sequence = sequence.join("");
  state.result =
    "LCS length: " +
    sequence.length +
    " · sequence: " +
    (state.sequence || "ε");
  yield emit(state, { path }, 15, state.result + ".", "complete", metrics());
}
export function* knapsackSteps(
  input: KnapsackInput,
): Generator<VisualizationStep<MatrixState, MatrixHighlights>> {
  const { items, capacity } = input;
  const state: MatrixState = {
    table: Array.from({ length: items.length + 1 }, () =>
      Array<number>(capacity + 1).fill(0),
    ),
    rowLabels: [
      "none",
      ...items.map(
        (item, index) =>
          "#" + (index + 1) + " w" + item.weight + " v" + item.value,
      ),
    ],
    columnLabels: Array.from({ length: capacity + 1 }, (_, i) => String(i)),
    result: "",
  };
  const emit = frameEmitter<MatrixState, MatrixHighlights>(
    "knapsack",
    "matrix",
  );
  let writes = 0;
  const metrics = () => ({
    writes,
    memoryCells: (items.length + 1) * (capacity + 1),
  });
  yield emit(
    state,
    {},
    2,
    "Each row adds one item. Each column is a capacity. An item may be selected at most once.",
    "init",
    metrics(),
  );
  for (let i = 1; i <= items.length; i++)
    for (let w = 0; w <= capacity; w++) {
      const item = items[i - 1],
        exclude = state.table[i - 1][w],
        include =
          item.weight <= w
            ? item.value + state.table[i - 1][w - item.weight]
            : null;
      state.table[i][w] =
        include === null ? exclude : Math.max(exclude, include);
      writes++;
      const dependencies: Cell[] = [[i - 1, w]];
      if (include !== null) dependencies.push([i - 1, w - item.weight]);
      yield emit(
        state,
        { active: [i, w], dependencies },
        6,
        include === null
          ? "Item #" + i + " is too heavy; exclude it."
          : "Include = " +
              include +
              ", exclude = " +
              exclude +
              "; choose " +
              state.table[i][w] +
              ".",
        "write",
        metrics(),
      );
    }
  let w = capacity;
  const selected: number[] = [],
    path: Cell[] = [[items.length, w]];
  for (let i = items.length; i > 0; i--) {
    const take = state.table[i][w] > state.table[i - 1][w];
    if (take) {
      selected.unshift(i - 1);
      w -= items[i - 1].weight;
    }
    state.selectedItems = [...selected];
    path.push([i - 1, w]);
    yield emit(
      state,
      { active: [i - 1, w], path },
      11,
      (take ? "Select" : "Skip") +
        " item #" +
        i +
        (take ? "; remaining capacity is " + w : "; ties prefer exclusion") +
        ".",
      "backtrack",
      metrics(),
    );
  }
  state.selectedItems = selected;
  state.result =
    "Optimal value: " +
    state.table[items.length][capacity] +
    " · selected items: " +
    (selected.map((index) => "#" + (index + 1)).join(", ") || "none");
  yield emit(state, { path }, 13, state.result + ".", "complete", metrics());
}
export const editDefinition = definition<
  StringInput,
  MatrixState,
  MatrixHighlights
>({
  slug: "edit-distance",
  title: "Edit Distance",
  category: "dynamic-programming",
  difficulty: "intermediate",
  visualizerKind: "matrix",
  summary: "Find the fewest edits and reconstruct an optimal transformation.",
  description:
    "Levenshtein distance allows insertion, deletion and replacement at unit cost. The table compares prefixes; a deterministic backward walk reconstructs one optimal sequence of edits and matches.",
  complexity: { time: "O(mn)", space: "O(mn)" },
  defaultInput: { a: "kitten", b: "sitting" },
  presets: [
    {
      id: "classic",
      label: "kitten → sitting",
      input: { a: "kitten", b: "sitting" },
    },
    { id: "empty", label: "Empty source", input: { a: "", b: "cat" } },
    { id: "equal", label: "Equal strings", input: { a: "glass", b: "glass" } },
  ],
  ...editSource,
  validateInput: validateStrings,
  generateSteps: editSteps,
});
export const lcsDefinition = definition<
  StringInput,
  MatrixState,
  MatrixHighlights
>({
  ...editDefinition,
  slug: "lcs",
  title: "Longest Common Subsequence",
  summary: "Build a prefix table and recover a shared subsequence.",
  description:
    "A subsequence preserves character order without requiring adjacency. Matching characters extend the diagonal; mismatches choose the larger neighboring result. Reconstruction chooses up on ties, producing a repeatable optimal sequence.",
  defaultInput: { a: "ABCBDAB", b: "BDCABA" },
  presets: [
    {
      id: "classic",
      label: "Several optimal subsequences",
      input: { a: "ABCBDAB", b: "BDCABA" },
    },
    {
      id: "none",
      label: "No common characters",
      input: { a: "ABC", b: "XYZ" },
    },
    { id: "empty", label: "Empty string", input: { a: "", b: "ABC" } },
  ],
  ...lcsSource,
  generateSteps: lcsSteps,
});
export const knapsackDefinition = definition<
  KnapsackInput,
  MatrixState,
  MatrixHighlights
>({
  slug: "knapsack",
  title: "0/1 Knapsack",
  category: "dynamic-programming",
  difficulty: "intermediate",
  visualizerKind: "matrix",
  summary: "Maximize value within a capacity and recover selected items.",
  description:
    "Each item can be used once. For every capacity compare exclusion with inclusion from the previous row. Backtracking reconstructs an optimal selection, excluding the later item when values tie.",
  complexity: { time: "O(nW)", space: "O(nW)" },
  preconditions: [
    "Positive integer weights and nonnegative integer values.",
    "At most 12 items; capacity is an integer from 0 to 40.",
  ],
  defaultInput: {
    items: [
      { weight: 2, value: 3 },
      { weight: 3, value: 4 },
      { weight: 4, value: 5 },
      { weight: 5, value: 8 },
    ],
    capacity: 8,
  },
  presets: [
    {
      id: "classic",
      label: "Choose among four items",
      input: {
        items: [
          { weight: 2, value: 3 },
          { weight: 3, value: 4 },
          { weight: 4, value: 5 },
          { weight: 5, value: 8 },
        ],
        capacity: 8,
      },
    },
    {
      id: "ties",
      label: "Equal-value choices",
      input: {
        items: [
          { weight: 1, value: 2 },
          { weight: 1, value: 2 },
        ],
        capacity: 1,
      },
    },
    {
      id: "zero",
      label: "Zero capacity",
      input: { items: [{ weight: 2, value: 3 }], capacity: 0 },
    },
  ],
  ...knapsackSource,
  validateInput: validateKnapsack,
  generateSteps: knapsackSteps,
});
