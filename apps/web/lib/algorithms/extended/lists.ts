import type { VisualizationStep } from "../types";
import { extraSources } from "./sources";
import {
  definition,
  finite,
  frameEmitter,
  invalid,
  sourcePair,
  valid,
  type InsertInput,
  type ListHighlights,
  type ListInput,
  type ListNode,
  type ListState,
} from "./types";

export function validateList(input: ListInput) {
  if (
    !input ||
    !Array.isArray(input.values) ||
    input.values.length > 12 ||
    input.values.some((value) => !finite(value))
  )
    return invalid("Use at most 12 finite numeric list values.");
  return valid;
}
export function validateInsert(input: InsertInput) {
  const base = validateList(input);
  if (!base.ok) return base;
  if (input.values.length >= 12)
    return invalid(
      "Insertion needs room for one new node; start with at most 11 values.",
    );
  if (
    !Number.isInteger(input.afterIndex) ||
    input.afterIndex < 0 ||
    (input.values.length
      ? input.afterIndex >= input.values.length
      : input.afterIndex !== 0)
  )
    return invalid(
      "Enter an existing zero-based node index; use 0 for an empty list.",
    );
  if (!finite(input.value))
    return invalid("The inserted value must be finite.");
  return valid;
}
function initial(values: number[]): ListState {
  return {
    nodes: values.map((value, i) => ({
      id: "node-" + i,
      value,
      next: i + 1 < values.length ? "node-" + (i + 1) : null,
    })),
    head: values.length ? "node-0" : null,
    pointers: {},
    resultIds: [],
    result: "",
  };
}
function follow(state: ListState): string[] {
  const result: string[] = [];
  let id = state.head;
  while (id !== null) {
    result.push(id);
    id = state.nodes.find((n) => n.id === id)!.next;
  }
  return result;
}
const insertSource = sourcePair(
  [
    "function insertAfter(head: Node | null, index: number, value: number) {",
    "  if (!head) return { value, next: null };",
    "  let current = head;",
    "  for (let i = 0; i < index; i++) current = current.next!;",
    "  const node = { value, next: null as Node | null };",
    "  node.next = current.next;",
    "  current.next = node;",
    "  return head;",
    "}",
  ],
  [
    "def insert_after(head, index, value):",
    "    if head is None: return Node(value)",
    "    current = head",
    "    for _ in range(index): current = current.next",
    "    node = Node(value)",
    "    node.next = current.next",
    "    current.next = node",
    "    return head",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8 },
  extraSources.insert,
);
const reverseSource = sourcePair(
  [
    "function reverse(head: Node | null) {",
    "  let previous: Node | null = null, current = head;",
    "  while (current) {",
    "    const next: Node | null = current.next;",
    "    current.next = previous;",
    "    previous = current; current = next;",
    "  }",
    "  return previous;",
    "}",
  ],
  [
    "def reverse(head):",
    "    previous, current = None, head",
    "    while current is not None:",
    "        following = current.next",
    "        current.next = previous",
    "        previous, current = current, following",
    "    return previous",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 8: 7 },
  extraSources.reverse,
);
const middleSource = sourcePair(
  [
    "function middle(head: Node | null) {",
    "  let slow = head, fast = head;",
    "  while (fast && fast.next) {",
    "    slow = slow!.next;",
    "    fast = fast.next.next;",
    "  }",
    "  return slow;",
    "}",
  ],
  [
    "def middle(head):",
    "    slow, fast = head, head",
    "    while fast is not None and fast.next is not None:",
    "        slow = slow.next",
    "        fast = fast.next.next",
    "    return slow",
  ],
  { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 7: 6 },
  extraSources.middle,
);

export function* insertSteps(
  input: InsertInput,
): Generator<VisualizationStep<ListState, ListHighlights>> {
  const emit = frameEmitter<ListState, ListHighlights>(
    "linked-list-insert",
    "linked-list",
  );
  const state = initial(input.values);
  let current = state.head;
  state.pointers = { current, new: null };
  let reads = 0,
    writes = 0;
  yield emit(
    state,
    { active: current ? [current] : [] },
    current === null ? 1 : 3,
    "Start at the head. Node indices are zero-based.",
    "init",
    { reads, writes },
  );
  for (let i = 0; current !== null && i < input.afterIndex; i++) {
    current = state.nodes.find((n) => n.id === current)!.next;
    reads++;
    state.pointers.current = current;
    yield emit(
      state,
      { active: current ? [current] : [] },
      4,
      "Follow next to node index " + (i + 1) + ".",
      "visit",
      { reads, writes },
    );
  }
  const node: ListNode = {
    id: "node-" + input.values.length,
    value: input.value,
    next: null,
  };
  state.nodes.push(node);
  state.pointers.new = node.id;
  yield emit(
    state,
    { active: [node.id] },
    current === null ? 2 : 5,
    "Allocate an unlinked node containing " + input.value + ".",
    "allocate",
    { reads, writes },
  );
  if (current === null) {
    state.head = node.id;
    writes++;
    yield emit(
      state,
      { active: [node.id] },
      2,
      "The list was empty; the new node becomes head.",
      "write",
      { reads, writes },
    );
  } else {
    const target = state.nodes.find((n) => n.id === current)!;
    node.next = target.next;
    reads++;
    writes++;
    yield emit(
      state,
      { active: [node.id, current] },
      6,
      "Copy current.next into new.next before changing the existing link.",
      "write",
      { reads, writes },
    );
    target.next = node.id;
    writes++;
    yield emit(
      state,
      { active: [current, node.id] },
      7,
      "Redirect current.next to the new node.",
      "write",
      { reads, writes },
    );
  }
  state.resultIds = follow(state);
  state.result =
    "Inserted " +
    input.value +
    ": " +
    state.resultIds
      .map((id) => state.nodes.find((n) => n.id === id)!.value)
      .join(" → ");
  yield emit(state, { found: [node.id] }, 8, state.result + ".", "complete", {
    reads,
    writes,
  });
}
export function* reverseSteps(
  input: ListInput,
): Generator<VisualizationStep<ListState, ListHighlights>> {
  const emit = frameEmitter<ListState, ListHighlights>(
    "linked-list-reverse",
    "linked-list",
  );
  const state = initial(input.values);
  let previous: string | null = null,
    current = state.head,
    reads = 0,
    writes = 0;
  state.pointers = { previous, current, next: null };
  yield emit(
    state,
    {},
    2,
    "Set previous to null and current to head.",
    "init",
    { reads, writes },
  );
  while (current !== null) {
    const node = state.nodes.find((n) => n.id === current)!;
    const next = node.next;
    reads++;
    state.pointers.next = next;
    yield emit(
      state,
      { active: [current] },
      4,
      "Save the next pointer before reversing this link.",
      "visit",
      { reads, writes },
    );
    node.next = previous;
    writes++;
    yield emit(
      state,
      { active: [current] },
      5,
      "Point current.next to previous.",
      "write",
      { reads, writes },
    );
    previous = current;
    current = next;
    state.pointers = { previous, current, next: null };
    yield emit(
      state,
      { active: previous ? [previous] : [] },
      6,
      "Advance previous and current.",
      "advance",
      { reads, writes },
    );
  }
  state.head = previous;
  state.resultIds = follow(state);
  state.result =
    "Reversed: " +
    (state.resultIds
      .map((id) => state.nodes.find((n) => n.id === id)!.value)
      .join(" → ") || "empty list");
  yield emit(
    state,
    { found: state.resultIds },
    8,
    state.result + ".",
    "complete",
    { reads, writes },
  );
}
export function* middleSteps(
  input: ListInput,
): Generator<VisualizationStep<ListState, ListHighlights>> {
  const emit = frameEmitter<ListState, ListHighlights>(
    "linked-list-middle",
    "linked-list",
  );
  const state = initial(input.values);
  let slow = state.head,
    fast = state.head,
    reads = 0;
  state.pointers = { slow, fast };
  yield emit(
    state,
    {},
    2,
    "Start slow and fast at head. For an even-length list, return the second middle.",
    "init",
    { reads },
  );
  const next = (id: string | null) =>
    id === null ? null : state.nodes.find((n) => n.id === id)!.next;
  while (fast !== null && next(fast) !== null) {
    slow = next(slow);
    reads++;
    state.pointers.slow = slow;
    yield emit(
      state,
      { active: slow ? [slow] : [] },
      4,
      "Slow advances one link.",
      "visit",
      { reads },
    );
    fast = next(next(fast));
    reads += 2;
    state.pointers.fast = fast;
    yield emit(
      state,
      { active: fast ? [fast] : [] },
      5,
      "Fast advances two links.",
      "visit",
      { reads },
    );
  }
  state.resultIds = slow ? [slow] : [];
  state.result = slow
    ? "Middle: index " +
      state.nodes.findIndex((n) => n.id === slow) +
      ", value " +
      state.nodes.find((n) => n.id === slow)!.value
    : "The empty list has no middle node";
  yield emit(
    state,
    { found: state.resultIds },
    7,
    state.result + ".",
    "complete",
    { reads },
  );
}
const listPresets = [
  { id: "odd", label: "Odd length", input: { values: [10, 20, 30, 40, 50] } },
  { id: "even", label: "Even length", input: { values: [10, 20, 30, 40] } },
  { id: "empty", label: "Empty list", input: { values: [] } },
];
export const insertDefinition = definition<
  InsertInput,
  ListState,
  ListHighlights
>({
  slug: "linked-list-insert",
  title: "Linked List · Insert After",
  category: "data-structures",
  difficulty: "beginner",
  visualizerKind: "linked-list",
  summary: "Allocate a node and wire two pointers in order.",
  description:
    "Walk to a zero-based index, connect the new node to the successor, then connect the target to the new node. An empty list creates a new head. Stable node identities remain visible throughout.",
  complexity: { time: "O(n)", space: "O(1)" },
  defaultInput: { values: [10, 20, 30, 40], afterIndex: 1, value: 25 },
  presets: [
    {
      id: "middle",
      label: "Insert in the middle",
      input: { values: [10, 20, 30, 40], afterIndex: 1, value: 25 },
    },
    {
      id: "tail",
      label: "Append after tail",
      input: { values: [1, 2], afterIndex: 1, value: 3 },
    },
    {
      id: "empty",
      label: "Create head",
      input: { values: [], afterIndex: 0, value: 7 },
    },
  ],
  ...insertSource,
  validateInput: validateInsert,
  generateSteps: insertSteps,
});
export const reverseDefinition = definition<
  ListInput,
  ListState,
  ListHighlights
>({
  slug: "linked-list-reverse",
  title: "Linked List · Reverse",
  category: "data-structures",
  difficulty: "intermediate",
  visualizerKind: "linked-list",
  summary: "Reverse next links while preserving the remaining chain.",
  description:
    "Track previous, current and next. Save the next node, reverse the current link, then advance. The final previous node becomes head.",
  complexity: { time: "O(n)", space: "O(1)" },
  defaultInput: listPresets[0].input,
  presets: listPresets,
  ...reverseSource,
  validateInput: validateList,
  generateSteps: reverseSteps,
});
export const middleDefinition = definition<
  ListInput,
  ListState,
  ListHighlights
>({
  ...reverseDefinition,
  slug: "linked-list-middle",
  title: "Linked List · Find Middle",
  difficulty: "beginner",
  summary: "Move slow once and fast twice to locate the middle.",
  description:
    "A slow pointer moves one link while fast moves two. When fast reaches the end, slow is at the middle. Even-length lists return the second middle; empty lists return no node.",
  ...middleSource,
  generateSteps: middleSteps,
});
