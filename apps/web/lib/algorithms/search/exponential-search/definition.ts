import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { exponentialSearchSteps } from "./generator";

const javascript = `function exponentialSearch(arr, target) {
  const n = arr.length;
  if (n === 0) return -1;
  if (arr[0] === target) return 0;
  let bound = 1;
  while (bound < n && arr[bound] < target) {
    bound *= 2;
  }
  let low = Math.floor(bound / 2);
  let high = Math.min(bound, n - 1);
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (arr[mid] === target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`;

const python = `def exponential_search(arr, target):
    n = len(arr)
    if n == 0:
        return -1
    if arr[0] == target:
        return 0
    bound = 1
    while bound < n and arr[bound] < target:
        bound *= 2
    low, high = bound // 2, min(bound, n - 1)
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target:
            return mid
        if arr[mid] < target:
            low = mid + 1
        else:
            high = mid - 1
    return -1`;

const c = `int exponentialSearch(const double arr[], int n, double target) {
  if (n == 0) return -1;
  if (arr[0] == target) return 0;
  long long bound = 1;
  while (bound < n && arr[bound] < target) {
    bound *= 2;
  }
  int low = (int)(bound / 2);
  int high = bound < n ? (int)bound : n - 1;
  while (low <= high) {
    const int mid = low + (high - low) / 2;
    if (arr[mid] == target) return mid;
    if (arr[mid] < target) low = mid + 1;
    else high = mid - 1;
  }
  return -1;
}`;

export const exponentialSearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "exponential-search",
  title: "Exponential Search",
  category: "search",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Double a bound until it passes the target, then binary-search inside that range.",
  description:
    "Exponential Search finds a containing range by checking indexes 1, 2, 4, 8… until the value passes the target, then runs binary search between the last two bounds. Its cost is O(log i) where i is the target's position, so it excels when the target sits near the front — and it works on unbounded or stream-like sorted data where the length is unknown.",
  tags: ["search", "sorted", "doubling", "unbounded"],
  complexity: {
    best: "O(1)",
    average: "O(log i)",
    worst: "O(log n)",
    time: "O(log n)",
    space: "O(1)",
  },
  preconditions: [
    "Requires the array to be sorted in ascending order.",
    "O(log i) where i is the target position — great for targets near the front.",
  ],
  traits: { hasTarget: true, requiresSortedArray: true },
  primaryLanguage: "javascript",
  defaultInput: {
    array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 100, 120],
    target: 23,
  },
  presets: [
    {
      id: "found",
      label: "Found",
      input: {
        array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 100, 120],
        target: 23,
      },
    },
    {
      id: "found-front",
      label: "Found near front (best case)",
      input: {
        array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 100, 120],
        target: 5,
      },
      description: "The bound stops doubling almost immediately.",
    },
    {
      id: "found-back",
      label: "Found near back",
      input: {
        array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 100, 120],
        target: 100,
      },
    },
    {
      id: "not-found",
      label: "Not found",
      input: {
        array: [2, 5, 8, 12, 16, 23, 38, 56, 72, 91, 100, 120],
        target: 60,
      },
    },
  ],
  code: { javascript, python, c },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    c: {
      1: 1,
      2: 1,
      3: 2,
      4: 3,
      5: 4,
      6: 5,
      7: 6,
      9: 8,
      10: 9,
      11: 10,
      12: 11,
      13: 12,
      14: 13,
      15: 14,
      17: 16,
    },
    python: {
      1: 1,
      2: 2,
      3: [3, 4],
      4: [5, 6],
      5: 7,
      6: 8,
      7: 9,
      9: 10,
      10: 10,
      12: 12,
      13: [13, 14],
      14: [15, 16],
      15: [17, 18],
      17: 19,
    },
  },
  validateInput: (input) => validateSearchInput(input, { requireSorted: true }),
  generateSteps: exponentialSearchSteps,
};
