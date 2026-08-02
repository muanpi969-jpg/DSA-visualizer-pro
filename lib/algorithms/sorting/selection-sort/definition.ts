import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { validateSortInput, type SortInput } from "@/lib/algorithms/shared/inputs";
import { selectionSortSteps } from "./generator";

const javascript = `function selectionSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let min = i;
    for (let j = i + 1; j < n; j++) {
      if (arr[j] < arr[min]) min = j;
    }
    if (min !== i) {
      [arr[i], arr[min]] = [arr[min], arr[i]];
    }
  }
  return arr;
}`;

const python = `def selection_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        m = i
        for j in range(i + 1, n):
            if arr[j] < arr[m]:
                m = j
        if m != i:
            arr[i], arr[m] = arr[m], arr[i]
    return arr`;

export const selectionSortDefinition: AlgorithmDefinition<
  SortInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "selection-sort",
  title: "Selection Sort",
  category: "sorting",
  difficulty: "beginner",
  visualizerKind: "array",
  summary:
    "Repeatedly select the minimum of the unsorted region and swap it into place.",
  description:
    "Selection Sort divides the array into a sorted prefix and an unsorted suffix. Each pass scans the unsorted region for its minimum value and swaps it to the front, growing the sorted prefix by one. It always performs the same O(n²) comparisons but at most n−1 swaps, which makes it useful when writes are expensive.",
  tags: ["sorting", "comparison", "in-place", "minimum-selection"],
  complexity: {
    best: "O(n²)",
    average: "O(n²)",
    worst: "O(n²)",
    time: "O(n²)",
    space: "O(1)",
  },
  preconditions: [
    "Performs at most n−1 swaps — good when writes are expensive.",
    "Not stable: equal values can change relative order across a long swap.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [7, 4, 10, 2, 8, 1, 6, 3] },
  presets: [
    { id: "random", label: "Random", input: { array: [7, 4, 10, 2, 8, 1, 6, 3] } },
    {
      id: "reversed",
      label: "Reverse sorted",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
      description: "Comparisons are identical; swaps stay minimal.",
    },
    {
      id: "already-sorted",
      label: "Already sorted",
      input: { array: [1, 2, 3, 4, 5, 6, 7, 8] },
      description: "Still O(n²) comparisons — no early exit.",
    },
    { id: "duplicates", label: "With duplicates", input: { array: [4, 2, 4, 1, 3, 2, 4, 1] } },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: [6, 7], 8: 8, 9: 9, 12: 10 },
  },
  validateInput: validateSortInput,
  generateSteps: selectionSortSteps,
};
