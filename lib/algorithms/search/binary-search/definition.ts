import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { binarySearchSteps } from "./generator";

const javascript = `function binarySearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`;

const python = `def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`;

export const binarySearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "binary-search",
  title: "Binary Search",
  category: "search",
  difficulty: "beginner",
  visualizerKind: "array",
  summary:
    "Halve a sorted array's search window each probe until the target is isolated.",
  description:
    "Binary Search exploits sorted order: compare the target with the middle element, then discard the half that cannot contain it. Each probe halves the window, so even a million elements need at most ~20 comparisons. The array must be sorted ascending — the visualizer validates this instead of silently sorting for you.",
  tags: ["search", "sorted", "divide-and-conquer", "logarithmic"],
  complexity: {
    best: "O(1)",
    average: "O(log n)",
    worst: "O(log n)",
    time: "O(log n)",
    space: "O(1)",
  },
  preconditions: [
    "Requires the array to be sorted in ascending order.",
    "With duplicates, any matching index may be returned.",
  ],
  traits: { hasTarget: true, requiresSortedArray: true },
  primaryLanguage: "javascript",
  defaultInput: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 11 },
  presets: [
    {
      id: "found-middle",
      label: "Found",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 11 },
    },
    {
      id: "found-first",
      label: "Found (first element)",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 1 },
    },
    {
      id: "found-last",
      label: "Found (last element)",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 15 },
    },
    {
      id: "not-found",
      label: "Not found",
      input: { array: [1, 3, 5, 7, 9, 11, 13, 15], target: 8 },
      description: "The window shrinks to empty.",
    },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: { 1: 1, 2: 2, 3: 3, 4: 4, 5: [5, 6], 6: [7, 8], 7: [9, 10], 9: 11 },
  },
  validateInput: (input) => validateSearchInput(input, { requireSorted: true }),
  generateSteps: binarySearchSteps,
};
