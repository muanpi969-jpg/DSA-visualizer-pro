import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { ternarySearchSteps } from "./generator";

const javascript = `function ternarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const third = Math.floor((high - low) / 3);
    const m1 = low + third, m2 = high - third;
    if (arr[m1] === target) return m1;
    if (arr[m2] === target) return m2;
    if (target < arr[m1]) high = m1 - 1;
    else if (target > arr[m2]) low = m2 + 1;
    else { low = m1 + 1; high = m2 - 1; }
  }
  return -1;
}`;

const python = `def ternary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        third = (high - low) // 3
        m1, m2 = low + third, high - third
        if arr[m1] == target:
            return m1
        if arr[m2] == target:
            return m2
        if target < arr[m1]:
            high = m1 - 1
        elif target > arr[m2]:
            low = m2 + 1
        else:
            low, high = m1 + 1, m2 - 1
    return -1`;

const c = `int ternarySearch(const double arr[], int n, double target) {
  int low = 0, high = n - 1;
  while (low <= high) {
    const int third = (high - low) / 3;
    const int m1 = low + third, m2 = high - third;
    if (arr[m1] == target) return m1;
    if (arr[m2] == target) return m2;
    if (target < arr[m1]) high = m1 - 1;
    else if (target > arr[m2]) low = m2 + 1;
    else { low = m1 + 1; high = m2 - 1; }
  }
  return -1;
}`;

export const ternarySearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "ternary-search",
  title: "Ternary Search",
  category: "search",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Split the sorted window at two mid points and keep only the third that can hold the target.",
  description:
    "Ternary Search probes two points that divide the window into thirds, then keeps the single third that can still contain the target. Although the window shrinks faster per iteration than binary search, each iteration costs two comparisons — so binary search wins in total comparisons. It is mainly of theoretical interest here, and shines instead when maximizing unimodal functions.",
  tags: ["search", "sorted", "divide-and-conquer", "two-pivots"],
  complexity: {
    best: "O(1)",
    average: "O(log₃ n)",
    worst: "O(log₃ n)",
    time: "O(log n)",
    space: "O(1)",
  },
  preconditions: [
    "Requires the array to be sorted in ascending order.",
    "Uses ~2 comparisons per iteration — usually more total work than binary search.",
  ],
  traits: { hasTarget: true, requiresSortedArray: true },
  primaryLanguage: "javascript",
  defaultInput: {
    array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23],
    target: 15,
  },
  presets: [
    {
      id: "found",
      label: "Found",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], target: 15 },
    },
    {
      id: "found-m1",
      label: "Found at first probe",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], target: 7 },
    },
    {
      id: "found-last",
      label: "Found (last element)",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], target: 23 },
    },
    {
      id: "not-found",
      label: "Not found",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23], target: 12 },
    },
  ],
  code: { javascript, python, c },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    c: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 9: 9, 10: 10, 12: 12 },
    python: {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: [6, 7],
      7: [8, 9],
      8: [10, 11],
      9: [12, 13],
      10: [14, 15],
      12: 16,
    },
  },
  validateInput: (input) => validateSearchInput(input, { requireSorted: true }),
  generateSteps: ternarySearchSteps,
};
