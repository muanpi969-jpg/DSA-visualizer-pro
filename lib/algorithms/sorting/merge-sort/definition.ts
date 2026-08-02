import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { validateSortInput, type SortInput } from "@/lib/algorithms/shared/inputs";
import { mergeSortSteps } from "./generator";

const javascript = `function mergeSort(arr, lo = 0, hi = arr.length - 1) {
  if (lo >= hi) return;
  const mid = Math.floor((lo + hi) / 2);
  mergeSort(arr, lo, mid);
  mergeSort(arr, mid + 1, hi);
  merge(arr, lo, mid, hi);
}
function merge(arr, lo, mid, hi) {
  const left = arr.slice(lo, mid + 1);
  const right = arr.slice(mid + 1, hi + 1);
  let i = 0, j = 0, k = lo;
  while (i < left.length && j < right.length) {
    if (left[i] <= right[j]) arr[k++] = left[i++];
    else arr[k++] = right[j++];
  }
  while (i < left.length) arr[k++] = left[i++];
  while (j < right.length) arr[k++] = right[j++];
}`;

const python = `def merge_sort(arr):
    if len(arr) <= 1:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i]); i += 1
        else:
            out.append(right[j]); j += 1
    return out + left[i:] + right[j:]`;

export const mergeSortDefinition: AlgorithmDefinition<
  SortInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "merge-sort",
  title: "Merge Sort",
  category: "sorting",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Divide the array in half, sort each half recursively, then merge the sorted halves.",
  description:
    "Merge Sort is the classic divide-and-conquer sort: split the array in half, recursively sort each half, then merge the two sorted runs by repeatedly taking the smaller head. It guarantees O(n log n) time in every case and is stable, at the cost of O(n) auxiliary space for the merge buffers.",
  tags: ["sorting", "comparison", "divide-and-conquer", "stable", "recursive"],
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    time: "O(n log n)",
    space: "O(n)",
  },
  preconditions: [
    "Guaranteed O(n log n) regardless of input order.",
    "Uses O(n) auxiliary space for merge buffers — not in-place.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [8, 3, 5, 1, 9, 2, 7, 4] },
  presets: [
    { id: "random", label: "Random", input: { array: [8, 3, 5, 1, 9, 2, 7, 4] } },
    {
      id: "reversed",
      label: "Reverse sorted",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
      description: "Same O(n log n) work as any other order.",
    },
    { id: "duplicates", label: "With duplicates", input: { array: [4, 2, 4, 1, 3, 2, 4, 1] } },
    {
      id: "two-runs",
      label: "Two sorted runs",
      input: { array: [1, 3, 5, 7, 2, 4, 6, 8] },
      description: "Watch the final merge interleave both halves.",
    },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language. The Python version merges via
  // list building, so JS merge lines map onto the closest semantic equivalent.
  lineMaps: {
    python: {
      1: 1,
      3: 4,
      6: 13,
      9: 5,
      10: 6,
      11: 7,
      12: [8, 9],
      13: 10,
      14: 12,
      16: 13,
      17: 13,
    },
  },
  validateInput: validateSortInput,
  generateSteps: mergeSortSteps,
};
