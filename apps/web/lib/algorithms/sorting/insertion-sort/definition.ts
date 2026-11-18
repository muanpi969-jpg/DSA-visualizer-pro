import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSortInput,
  type SortInput,
} from "@/lib/algorithms/shared/inputs";
import { insertionSortSteps } from "./generator";

const javascript = `function insertionSort(arr) {
  for (let i = 1; i < arr.length; i++) {
    const key = arr[i];
    let j = i - 1;
    while (j >= 0 && arr[j] > key) {
      [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
      j--;
    }
    // The key is now in its ordered prefix position.
  }
  return arr;
}`;
const python = `def insertion_sort(arr):
    for i in range(1, len(arr)):
        key = arr[i]
        j = i - 1
        while j >= 0 and arr[j] > key:
            arr[j], arr[j + 1] = arr[j + 1], arr[j]
            j -= 1
        # The key is now in its ordered prefix position.
    return arr`;

const c = `double *insertionSort(double arr[], int n) {
  for (int i = 1; i < n; i++) {
    const double key = arr[i];
    int j = i - 1;
    while (j >= 0 && arr[j] > key) {
      double temp = arr[j];
      arr[j] = arr[j + 1];
      arr[j + 1] = temp;
      j--;
    }
    /* The key is now in its ordered prefix position. */
  }
  return arr;
}`;

export const insertionSortDefinition: AlgorithmDefinition<
  SortInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "insertion-sort",
  title: "Insertion Sort",
  category: "sorting",
  difficulty: "beginner",
  visualizerKind: "array",
  summary:
    "Grow an ordered prefix by moving each key left through adjacent swaps.",
  description:
    "Insertion Sort keeps a sorted prefix and inserts one new value per pass: each key swaps left past larger prefix values until it reaches its insertion point. It is stable, in-place, adaptive (nearly-sorted input approaches O(n)), and the method of choice for small or almost-sorted arrays — many library sorts switch to it below a size threshold.",
  tags: ["sorting", "comparison", "in-place", "stable", "adaptive"],
  complexity: {
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    time: "O(n²)",
    space: "O(1)",
  },
  preconditions: [
    "Adaptive: nearly-sorted input needs few swaps (best case O(n)).",
    "Stable: equal values keep their relative order.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [6, 3, 8, 2, 7, 4, 9, 1] },
  presets: [
    {
      id: "random",
      label: "Random",
      input: { array: [6, 3, 8, 2, 7, 4, 9, 1] },
    },
    {
      id: "nearly-sorted",
      label: "Nearly sorted (best case)",
      input: { array: [1, 2, 4, 3, 5, 6, 8, 7] },
      description: "Few swaps — shows the adaptive behavior.",
    },
    {
      id: "reversed",
      label: "Reverse sorted (worst case)",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
      description: "Every key moves all the way left.",
    },
    {
      id: "duplicates",
      label: "With duplicates",
      input: { array: [4, 2, 4, 1, 3, 2, 4, 1] },
    },
  ],
  code: { javascript, python, c },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    c: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: [6, 7, 8], 7: 9, 9: 11, 11: 13 },
    python: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 9: 8, 11: 9 },
  },
  validateInput: validateSortInput,
  generateSteps: insertionSortSteps,
};
