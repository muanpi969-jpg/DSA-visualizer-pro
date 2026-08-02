import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";

/** Bubble sort operates on a plain list of numbers. */
export interface BubbleSortInput {
  array: number[];
}

export type BubbleSortState = ArrayVizState;
export type BubbleSortHighlights = ArrayVizHighlights;
