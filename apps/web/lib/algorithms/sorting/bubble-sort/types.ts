import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";

/** Bubble sort operates on a plain list of numbers. */
export type BubbleSortInput =
  import("@/lib/algorithms/shared/inputs").SortInput;

export type BubbleSortState = ArrayVizState;
export type BubbleSortHighlights = ArrayVizHighlights;
