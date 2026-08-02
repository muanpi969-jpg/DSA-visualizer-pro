import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import { bubbleSortSteps } from "./generator";
import type {
  BubbleSortHighlights,
  BubbleSortInput,
  BubbleSortState,
} from "./types";

const MAX_ELEMENTS = 40;

const javascript = `function bubbleSort(arr) {
  const n = arr.length;
  for (let i = 0; i < n - 1; i++) {
    let swapped = false;
    for (let j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return arr;
}`;

const python = `def bubble_sort(arr):
    n = len(arr)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if arr[j] > arr[j + 1]:
                arr[j], arr[j + 1] = arr[j + 1], arr[j]
                swapped = True
        if not swapped:
            break
    return arr`;

const cpp = `void bubbleSort(std::vector<int>& arr) {
  int n = arr.size();
  for (int i = 0; i < n - 1; ++i) {
    bool swapped = false;
    for (int j = 0; j < n - 1 - i; ++j) {
      if (arr[j] > arr[j + 1]) {
        std::swap(arr[j], arr[j + 1]);
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`;

const java = `void bubbleSort(int[] arr) {
  int n = arr.length;
  for (int i = 0; i < n - 1; i++) {
    boolean swapped = false;
    for (int j = 0; j < n - 1 - i; j++) {
      if (arr[j] > arr[j + 1]) {
        int t = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = t;
        swapped = true;
      }
    }
    if (!swapped) break;
  }
}`;

export const bubbleSortDefinition: AlgorithmDefinition<
  BubbleSortInput,
  BubbleSortState,
  BubbleSortHighlights
> = {
  slug: "bubble-sort",
  title: "Bubble Sort",
  category: "sorting",
  difficulty: "beginner",
  visualizerKind: "array",
  summary:
    "Repeatedly compare adjacent elements and swap them until the largest values bubble to the end.",
  description:
    "Bubble Sort steps through the list comparing each pair of adjacent items and swapping them when they are out of order. After each pass the largest remaining value settles into its final position, so the sorted region grows from the right. An early-exit check stops the algorithm as soon as a full pass makes no swaps.",
  tags: ["sorting", "comparison", "in-place", "stable", "adjacent-swaps"],
  complexity: {
    best: "O(n)",
    average: "O(n²)",
    worst: "O(n²)",
    time: "O(n²)",
    space: "O(1)",
  },
  preconditions: [
    "Works on any comparable array; no sorting precondition required.",
    "Best-case O(n) only triggers on already-sorted input thanks to the early-exit check.",
  ],
  primaryLanguage: "javascript",
  defaultInput: { array: [5, 2, 9, 1, 6, 3, 8, 4] },
  presets: [
    {
      id: "random",
      label: "Random",
      input: { array: [5, 2, 9, 1, 6, 3, 8, 4] },
      description: "A typical unsorted array.",
    },
    {
      id: "reversed",
      label: "Reverse sorted (worst case)",
      input: { array: [8, 7, 6, 5, 4, 3, 2, 1] },
      description: "Maximum number of swaps.",
    },
    {
      id: "nearly-sorted",
      label: "Nearly sorted",
      input: { array: [1, 2, 4, 3, 5, 6, 7, 8] },
      description: "Only one pair out of order.",
    },
    {
      id: "already-sorted",
      label: "Already sorted (best case)",
      input: { array: [1, 2, 3, 4, 5, 6, 7, 8] },
      description: "Early exit after a single pass.",
    },
    {
      id: "duplicates",
      label: "With duplicates",
      input: { array: [4, 2, 4, 1, 3, 2, 4, 1] },
      description: "Stability keeps equal values in order.",
    },
  ],
  code: { javascript, python, cpp, java },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    python: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 11: [9, 10], 13: 11 },
    cpp: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 8: 8, 11: 11, 13: 13 },
    java: { 1: 1, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: [7, 8, 9], 8: 10, 11: 13, 13: 15 },
  },
  validateInput(input) {
    if (!input || !Array.isArray(input.array)) {
      return { ok: false, message: "Input must be an array of numbers." };
    }
    if (input.array.length > MAX_ELEMENTS) {
      return {
        ok: false,
        message: `Keep the array at ${MAX_ELEMENTS} elements or fewer for a readable visualization.`,
      };
    }
    if (input.array.some((n) => typeof n !== "number" || Number.isNaN(n))) {
      return { ok: false, message: "Every element must be a valid number." };
    }
    return { ok: true };
  },
  generateSteps(input) {
    return bubbleSortSteps(input);
  },
};
