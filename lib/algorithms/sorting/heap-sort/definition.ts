import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import { validateSortInput, type SortInput } from "@/lib/algorithms/shared/inputs";
import { heapSortSteps } from "./generator";

const javascript = `function heapSort(arr) {
  const n = arr.length;
  for (let i = Math.floor(n / 2) - 1; i >= 0; i--) {
    siftDown(arr, i, n);
  }
  for (let end = n - 1; end > 0; end--) {
    [arr[0], arr[end]] = [arr[end], arr[0]];
    siftDown(arr, 0, end);
  }
  return arr;
}
function siftDown(arr, i, size) {
  while (true) {
    let largest = i;
    const l = 2 * i + 1, r = 2 * i + 2;
    if (l < size && arr[l] > arr[largest]) largest = l;
    if (r < size && arr[r] > arr[largest]) largest = r;
    if (largest === i) return;
    [arr[i], arr[largest]] = [arr[largest], arr[i]];
    i = largest;
  }
}`;

const python = `def heap_sort(arr):
    n = len(arr)

    def sift(i, size):
        while True:
            l, r, big = 2 * i + 1, 2 * i + 2, i
            if l < size and arr[l] > arr[big]:
                big = l
            if r < size and arr[r] > arr[big]:
                big = r
            if big == i:
                return
            arr[i], arr[big] = arr[big], arr[i]
            i = big

    for i in range(n // 2 - 1, -1, -1):
        sift(i, n)
    for end in range(n - 1, 0, -1):
        arr[0], arr[end] = arr[end], arr[0]
        sift(0, end)
    return arr`;

export const heapSortDefinition: AlgorithmDefinition<
  SortInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "heap-sort",
  title: "Heap Sort",
  category: "sorting",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Build a max-heap in place, then repeatedly swap the maximum to the end of the array.",
  description:
    "Heap Sort treats the array as a binary max-heap (children of index i live at 2i+1 and 2i+2). After an O(n) bottom-up heapify, it repeatedly swaps the root — the maximum — with the last heap element, shrinks the heap, and sifts the new root down. The sorted suffix grows from the right, giving guaranteed O(n log n) time with O(1) extra space.",
  tags: ["sorting", "comparison", "in-place", "heap", "priority-queue"],
  complexity: {
    best: "O(n log n)",
    average: "O(n log n)",
    worst: "O(n log n)",
    time: "O(n log n)",
    space: "O(1)",
  },
  preconditions: [
    "Guaranteed O(n log n) with O(1) extra space.",
    "Not stable, and poor cache locality compared to quick/merge sort.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [5, 9, 3, 7, 1, 8, 2, 6] },
  presets: [
    { id: "random", label: "Random", input: { array: [5, 9, 3, 7, 1, 8, 2, 6] } },
    {
      id: "reversed",
      label: "Reverse sorted",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
      description: "Already a valid max-heap — heapify does no swaps.",
    },
    {
      id: "sorted",
      label: "Already sorted",
      input: { array: [1, 2, 3, 4, 5, 6, 7, 8] },
      description: "Heapify must rearrange everything.",
    },
    { id: "duplicates", label: "With duplicates", input: { array: [4, 2, 4, 1, 3, 2, 4, 1] } },
  ],
  code: { javascript, python },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: {
      1: 1,
      2: 2,
      3: 16,
      4: 17,
      6: 18,
      7: 19,
      8: 20,
      10: 21,
      16: [7, 8],
      17: [9, 10],
      18: [11, 12],
      19: 13,
      20: 14,
    },
  },
  validateInput: validateSortInput,
  generateSteps: heapSortSteps,
};
