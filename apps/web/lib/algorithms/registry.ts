import type { AlgorithmCategory, AnyAlgorithmDefinition } from "./types";
import { bubbleSortDefinition } from "./sorting/bubble-sort/definition";
import { selectionSortDefinition } from "./sorting/selection-sort/definition";
import { insertionSortDefinition } from "./sorting/insertion-sort/definition";
import { mergeSortDefinition } from "./sorting/merge-sort/definition";
import { quickSortDefinition } from "./sorting/quick-sort/definition";
import { heapSortDefinition } from "./sorting/heap-sort/definition";
import { linearSearchDefinition } from "./search/linear-search/definition";
import { binarySearchDefinition } from "./search/binary-search/definition";
import { jumpSearchDefinition } from "./search/jump-search/definition";
import { interpolationSearchDefinition } from "./search/interpolation-search/definition";
import { exponentialSearchDefinition } from "./search/exponential-search/definition";
import { ternarySearchDefinition } from "./search/ternary-search/definition";
import { bfsDefinition, dfsDefinition } from "./extended/graph";
import {
  insertDefinition,
  reverseDefinition,
  middleDefinition,
} from "./extended/lists";
import {
  editDefinition,
  lcsDefinition,
  knapsackDefinition,
} from "./extended/dp";

/**
 * The single source of truth for every visualizer. New algorithms plug in here
 * and immediately appear in the catalog, routing, and shell — no per-algorithm
 * shell code required.
 */
const definitions: AnyAlgorithmDefinition[] = [
  // Sorting
  bubbleSortDefinition,
  selectionSortDefinition,
  insertionSortDefinition,
  mergeSortDefinition,
  quickSortDefinition,
  heapSortDefinition,
  // Searching
  linearSearchDefinition,
  binarySearchDefinition,
  jumpSearchDefinition,
  interpolationSearchDefinition,
  exponentialSearchDefinition,
  ternarySearchDefinition,
  bfsDefinition,
  dfsDefinition,
  insertDefinition,
  reverseDefinition,
  middleDefinition,
  editDefinition,
  lcsDefinition,
  knapsackDefinition,
];

const bySlug = new Map<string, AnyAlgorithmDefinition>(
  definitions.map((def) => [def.slug, def]),
);

export const CATEGORY_ORDER: AlgorithmCategory[] = [
  "sorting",
  "search",
  "graph",
  "tree",
  "dynamic-programming",
  "data-structures",
];

export const CATEGORY_LABELS: Record<AlgorithmCategory, string> = {
  sorting: "Sorting",
  search: "Searching",
  graph: "Graphs",
  tree: "Trees",
  "dynamic-programming": "Dynamic Programming",
  "data-structures": "Data Structures",
};

export function getAllAlgorithms(): AnyAlgorithmDefinition[] {
  return definitions;
}

export function getAlgorithmBySlug(
  slug: string,
): AnyAlgorithmDefinition | undefined {
  return bySlug.get(slug);
}

export function getAlgorithmsByCategory(): Array<{
  category: AlgorithmCategory;
  label: string;
  items: AnyAlgorithmDefinition[];
}> {
  return CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    items: definitions.filter((def) => def.category === category),
  })).filter((group) => group.items.length > 0);
}

export function getAllSlugs(): string[] {
  return definitions.map((def) => def.slug);
}
