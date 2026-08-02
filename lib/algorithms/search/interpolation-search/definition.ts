import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { interpolationSearchSteps } from "./generator";

const javascript = `function interpolationSearch(arr, target) {
  let low = 0, high = arr.length - 1;
  while (low <= high && target >= arr[low] && target <= arr[high]) {
    if (arr[low] === arr[high]) {
      return arr[low] === target ? low : -1;
    }
    const pos = low + Math.floor(
      ((target - arr[low]) * (high - low)) / (arr[high] - arr[low]));
    if (arr[pos] === target) return pos;
    if (arr[pos] < target) low = pos + 1;
    else high = pos - 1;
  }
  return -1;
}`;

const python = `def interpolation_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high and arr[low] <= target <= arr[high]:
        if arr[low] == arr[high]:
            return low if arr[low] == target else -1
        pos = low + (target - arr[low]) * (high - low) // (arr[high] - arr[low])
        if arr[pos] == target:
            return pos
        if arr[pos] < target:
            low = pos + 1
        else:
            high = pos - 1
    return -1`;

export const interpolationSearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "interpolation-search",
  title: "Interpolation Search",
  category: "search",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Probe where the target should sit based on its value — like opening a phone book near the right letter.",
  description:
    "Interpolation Search improves on binary search for uniformly distributed sorted data: instead of always probing the middle, it estimates the target's position proportionally between the window's low and high values. On uniform data it averages O(log log n) probes; on skewed data it can degrade to O(n).",
  tags: ["search", "sorted", "uniform-distribution", "estimation"],
  complexity: {
    best: "O(1)",
    average: "O(log log n)",
    worst: "O(n)",
    time: "O(log log n)",
    space: "O(1)",
  },
  preconditions: [
    "Requires the array to be sorted in ascending order.",
    "Fast only when values are roughly uniformly distributed.",
  ],
  traits: { hasTarget: true, requiresSortedArray: true },
  primaryLanguage: "javascript",
  defaultInput: { array: [10, 20, 30, 40, 50, 60, 70, 80], target: 60 },
  presets: [
    {
      id: "found-uniform",
      label: "Found (uniform data)",
      input: { array: [10, 20, 30, 40, 50, 60, 70, 80], target: 60 },
      description: "One probe lands exactly on the target.",
    },
    {
      id: "not-found",
      label: "Not found",
      input: { array: [10, 20, 30, 40, 50, 60, 70, 80], target: 35 },
    },
    {
      id: "skewed",
      label: "Skewed data",
      input: { array: [1, 2, 3, 4, 5, 6, 7, 100], target: 7 },
      description: "Non-uniform values force extra probes.",
    },
    {
      id: "out-of-range",
      label: "Target out of range",
      input: { array: [10, 20, 30, 40, 50, 60, 70, 80], target: 95 },
      description: "Rejected immediately by the range check.",
    },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: {
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      7: 6,
      8: 6,
      9: [7, 8],
      10: [9, 10],
      11: [11, 12],
      13: 13,
    },
  },
  validateInput: (input) => validateSearchInput(input, { requireSorted: true }),
  generateSteps: interpolationSearchSteps,
};
