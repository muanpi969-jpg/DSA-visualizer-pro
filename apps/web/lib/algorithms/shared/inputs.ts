import type { ValidationResult } from "../types";

/** Input for all comparison sorts. */
export interface SortInput {
  array: number[];
}

/** Input for all search algorithms. */
export interface SearchInput {
  array: number[];
  target: number;
}

export const MAX_ARRAY_ELEMENTS = 40;

export function validateArray(
  array: unknown,
  maxElements = MAX_ARRAY_ELEMENTS,
): ValidationResult {
  if (!Array.isArray(array)) {
    return { ok: false, message: "Input must be an array of numbers." };
  }
  if (array.length > maxElements) {
    return {
      ok: false,
      message: `Keep the array at ${maxElements} elements or fewer for a readable visualization.`,
    };
  }
  if (array.some((n) => typeof n !== "number" || !Number.isFinite(n))) {
    return { ok: false, message: "Every element must be a valid number." };
  }
  return { ok: true };
}

export function validateSortInput(input: SortInput): ValidationResult {
  return validateArray(input?.array);
}

export function isSortedAscending(array: number[]): boolean {
  for (let i = 1; i < array.length; i++) {
    if (array[i - 1] > array[i]) return false;
  }
  return true;
}

/**
 * Validation for search inputs. Binary-like searches pass `requireSorted` so
 * the sorted precondition is explained instead of silently auto-sorting.
 */
export function validateSearchInput(
  input: SearchInput,
  opts?: { requireSorted?: boolean },
): ValidationResult {
  const base = validateArray(input?.array);
  if (!base.ok) return base;
  if (typeof input.target !== "number" || !Number.isFinite(input.target)) {
    return { ok: false, message: "Enter a numeric target value." };
  }
  if (opts?.requireSorted && !isSortedAscending(input.array)) {
    return {
      ok: false,
      message:
        "This search requires a sorted (ascending) array. Sort the input or pick a sorted preset.",
    };
  }
  return { ok: true };
}
