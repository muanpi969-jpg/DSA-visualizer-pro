import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { linearSearchSteps } from "./generator";

const javascript = `function linearSearch(arr, target) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] === target) {
      return i;
    }
  }
  return -1;
}`;

const python = `def linear_search(arr, target):
    for i, value in enumerate(arr):
        if value == target:
            return i
    return -1`;

export const linearSearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "linear-search",
  title: "Linear Search",
  category: "search",
  difficulty: "beginner",
  visualizerKind: "array",
  summary: "Check every element left to right until the target appears.",
  description:
    "Linear Search examines each element in order and stops at the first match. It is the only option for unsorted data and the baseline every faster search is measured against: O(n) comparisons in the worst case, O(1) when the target happens to be first.",
  tags: ["search", "sequential", "unsorted-ok", "baseline"],
  complexity: {
    best: "O(1)",
    average: "O(n)",
    worst: "O(n)",
    time: "O(n)",
    space: "O(1)",
  },
  preconditions: ["Works on unsorted arrays — no precondition."],
  traits: { hasTarget: true },
  primaryLanguage: "javascript",
  defaultInput: { array: [7, 2, 9, 4, 11, 5, 13, 8], target: 11 },
  presets: [
    {
      id: "found-middle",
      label: "Found (middle)",
      input: { array: [7, 2, 9, 4, 11, 5, 13, 8], target: 11 },
    },
    {
      id: "found-first",
      label: "Found (best case)",
      input: { array: [7, 2, 9, 4, 11, 5, 13, 8], target: 7 },
    },
    {
      id: "found-last",
      label: "Found (worst case)",
      input: { array: [7, 2, 9, 4, 11, 5, 13, 8], target: 8 },
    },
    {
      id: "not-found",
      label: "Not found",
      input: { array: [7, 2, 9, 4, 11, 5, 13, 8], target: 3 },
    },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: { 1: 1, 2: 2, 3: 3, 4: 4, 7: 5 },
  },
  validateInput: (input) => validateSearchInput(input),
  generateSteps: linearSearchSteps,
};
