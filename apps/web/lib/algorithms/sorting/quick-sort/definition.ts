import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSortInput,
  type SortInput,
} from "@/lib/algorithms/shared/inputs";
import { quickSortSteps } from "./generator";

const javascript = `function quickSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) {
    return;
  }
  const p = partition(arr, lo, hi);
  quickSort(arr, lo, p - 1);
  quickSort(arr, p + 1, hi);
}
function partition(arr, lo, hi) {
  const pivot = arr[hi];
  let i = lo - 1;
  for (let j = lo; j < hi; j++) {
    if (arr[j] <= pivot) {
      i++;
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  }
  [arr[i + 1], arr[hi]] = [arr[hi], arr[i + 1]];
  return i + 1;
}`;

const python = `def quick_sort(arr, lo=0, hi=None):
    if hi is None:
        hi = len(arr) - 1
    if lo >= hi:
        return arr
    pivot = arr[hi]
    i = lo - 1
    for j in range(lo, hi):
        if arr[j] <= pivot:
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    arr[i + 1], arr[hi] = arr[hi], arr[i + 1]
    quick_sort(arr, lo, i)
    quick_sort(arr, i + 2, hi)
    return arr`;

const c = `static int partition(double arr[], int lo, int hi);
void quickSort(double arr[], int lo, int hi) {
  if (lo >= hi) {
    return;
  }
  const int p = partition(arr, lo, hi);
  quickSort(arr, lo, p - 1);
  quickSort(arr, p + 1, hi);
}
static int partition(double arr[], int lo, int hi) {
  const double pivot = arr[hi];
  int i = lo - 1;
  for (int j = lo; j < hi; j++) {
    if (arr[j] <= pivot) {
      i++;
      double temp = arr[i];
      arr[i] = arr[j];
      arr[j] = temp;
    }
  }
  double temp = arr[i + 1];
  arr[i + 1] = arr[hi];
  arr[hi] = temp;
  return i + 1;
}`;

export const quickSortDefinition: AlgorithmDefinition<
  SortInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "quick-sort",
  title: "Quick Sort",
  category: "sorting",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Partition around a pivot so smaller values go left, then recurse on each side.",
  description:
    "Quick Sort picks a pivot (here the last element, Lomuto scheme) and partitions the range so values ≤ pivot end up on its left and larger values on its right — placing the pivot in its final position. Recursing on both sides sorts the whole array. Average time is O(n log n) with excellent constants; already-sorted input is the worst case for this pivot choice.",
  tags: ["sorting", "comparison", "divide-and-conquer", "in-place", "pivot"],
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n²)",
    time: "O(n log n)",
    space: "O(log n)",
  },
  preconditions: [
    "Worst case O(n²) on already-sorted input with a last-element pivot.",
    "Not stable: equal values can cross during partition swaps.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [7, 2, 9, 4, 6, 1, 8, 3] },
  presets: [
    {
      id: "random",
      label: "Random",
      input: { array: [7, 2, 9, 4, 6, 1, 8, 3] },
    },
    {
      id: "sorted",
      label: "Already sorted (worst case)",
      input: { array: [1, 2, 3, 4, 5, 6, 7] },
      description: "Last-element pivot degrades to O(n²).",
    },
    {
      id: "duplicates",
      label: "With duplicates",
      input: { array: [4, 2, 4, 1, 3, 2, 4, 1] },
    },
    {
      id: "reversed",
      label: "Reverse sorted",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
    },
  ],
  code: { javascript, python, c },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    c: {
      1: 2,
      2: 3,
      3: 4,
      5: 6,
      6: 7,
      7: 8,
      9: 10,
      10: 11,
      11: 12,
      12: 13,
      13: 14,
      14: 15,
      15: [16, 17, 18],
      18: [21, 22, 23],
      19: 24,
    },
    python: {
      1: 1,
      2: 4,
      3: 5,
      9: 6,
      10: [6, 7],
      12: 8,
      13: 9,
      14: 10,
      15: 11,
      18: 12,
      19: [13, 14],
    },
  },
  validateInput: validateSortInput,
  generateSteps: quickSortSteps,
};
