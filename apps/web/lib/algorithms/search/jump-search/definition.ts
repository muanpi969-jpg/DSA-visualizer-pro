import type { AlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  validateSearchInput,
  type SearchInput,
} from "@/lib/algorithms/shared/inputs";
import { jumpSearchSteps } from "./generator";

const javascript = `function jumpSearch(arr, target) {
  const n = arr.length;
  const step = Math.floor(Math.sqrt(n));
  let prev = 0, curr = step;
  while (curr < n && arr[curr - 1] < target) {
    prev = curr;
    curr += step;
  }
  for (let i = prev; i < Math.min(curr, n); i++) {
    if (arr[i] === target) return i;
  }
  return -1;
}`;

const python = `import math

def jump_search(arr, target):
    n = len(arr)
    step = int(math.isqrt(n))
    prev, curr = 0, step
    while curr < n and arr[curr - 1] < target:
        prev, curr = curr, curr + step
    for i in range(prev, min(curr, n)):
        if arr[i] == target:
            return i
    return -1`;

const c = `#include <math.h>
int jumpSearch(const double arr[], int n, double target) {
  const int step = (int)sqrt((double)n);
  int prev = 0, curr = step;
  while (curr < n && arr[curr - 1] < target) {
    prev = curr;
    curr += step;
  }
  const int end = curr < n ? curr : n;
  for (int i = prev; i < end; i++) {
    if (arr[i] == target) return i;
  }
  return -1;
}`;

export const jumpSearchDefinition: AlgorithmDefinition<
  SearchInput,
  ArrayVizState,
  ArrayVizHighlights
> = {
  slug: "jump-search",
  title: "Jump Search",
  category: "search",
  difficulty: "intermediate",
  visualizerKind: "array",
  summary:
    "Leap through a sorted array in √n blocks, then linearly scan the one block that fits.",
  description:
    "Jump Search skips ahead in fixed blocks of ⌊√n⌋ until the block end passes the target, then linearly scans just that block. With block size √n both phases cost O(√n) — between linear and binary search. It is useful when jumping backward is expensive (e.g. streams or tape-like storage) since it only ever steps forward.",
  tags: ["search", "sorted", "blocks", "sqrt-decomposition"],
  complexity: {
    best: "O(1)",
    average: "O(√n)",
    worst: "O(√n)",
    time: "O(√n)",
    space: "O(1)",
  },
  preconditions: [
    "Requires the array to be sorted in ascending order.",
    "Optimal block size is ⌊√n⌋.",
  ],
  traits: { hasTarget: true, requiresSortedArray: true },
  primaryLanguage: "javascript",
  defaultInput: {
    array: [1, 4, 7, 10, 14, 18, 23, 28, 34, 41, 49, 58],
    target: 34,
  },
  presets: [
    {
      id: "found",
      label: "Found",
      input: {
        array: [1, 4, 7, 10, 14, 18, 23, 28, 34, 41, 49, 58],
        target: 34,
      },
    },
    {
      id: "found-first",
      label: "Found (first block)",
      input: {
        array: [1, 4, 7, 10, 14, 18, 23, 28, 34, 41, 49, 58],
        target: 4,
      },
    },
    {
      id: "found-last",
      label: "Found (last element)",
      input: {
        array: [1, 4, 7, 10, 14, 18, 23, 28, 34, 41, 49, 58],
        target: 58,
      },
    },
    {
      id: "not-found",
      label: "Not found",
      input: {
        array: [1, 4, 7, 10, 14, 18, 23, 28, 34, 41, 49, 58],
        target: 25,
      },
    },
  ],
  code: { javascript, python, c },
  // JS line -> equivalent line(s) per language (kept in sync with `code`).
  lineMaps: {
    c: { 1: 2, 2: 2, 3: 3, 4: 4, 5: 5, 6: 6, 7: 7, 9: [9, 10], 10: 11, 12: 13 },
    python: {
      1: 3,
      2: 4,
      3: 5,
      4: 6,
      5: 7,
      6: 8,
      7: 8,
      9: 9,
      10: [10, 11],
      12: 12,
    },
  },
  validateInput: (input) => validateSearchInput(input, { requireSorted: true }),
  generateSteps: jumpSearchSteps,
};
