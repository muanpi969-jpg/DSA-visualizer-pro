/**
 * Shared view-model for array-based visualizers (sorting, searching, and simple
 * array/DP-on-array algorithms). Both the step generators and the ArrayRenderer
 * import these types so the contract stays in one place.
 *
 * Elements carry a stable `id` so DOM-based swap animations can track a moving
 * element even when values are duplicated.
 */

export interface ArrayItem {
  id: string;
  value: number;
}

export interface ArrayVizState {
  items: ArrayItem[];
}

/** A labelled pointer rendered above a cell (e.g. i, j, low, mid, high, pivot). */
export interface ArrayPointer {
  label: string;
  index: number;
  /** Optional semantic tone; defaults to neutral. */
  tone?: "current" | "compare" | "swap" | "bound" | "neutral";
}

/**
 * Highlight indices reference positions in the *current* `items` array. Each
 * bucket is a discriminated visual state; a cell may appear in at most one of
 * the mutually-exclusive state buckets, resolved in renderer priority order.
 */
export interface ArrayVizHighlights {
  /** Cells currently being compared. */
  comparing?: number[];
  /** Cells being swapped / written this step. */
  swapping?: number[];
  /** Cells that are in their final sorted position. */
  sorted?: number[];
  /** The current focus cell (e.g. probe / key being inserted). */
  active?: number[];
  /** Cells eliminated from a search window. */
  eliminated?: number[];
  /** A successful match / result cell. */
  found?: number[];
  /** A failure marker (e.g. target not present). */
  error?: number[];
  /** Labelled pointers above cells. */
  pointers?: ArrayPointer[];
}

export type ArrayStep = import("../types").VisualizationStep<
  ArrayVizState,
  ArrayVizHighlights
>;

/** Build a stable-id item list from raw numbers. */
export function toItems(values: number[]): ArrayItem[] {
  return values.map((value, index) => ({ id: `el-${index}`, value }));
}

/** Extract raw values from an item list. */
export function toValues(items: ArrayItem[]): number[] {
  return items.map((item) => item.value);
}

/** Deep-ish clone of items so a generator never mutates a caller's array. */
export function cloneItems(items: ArrayItem[]): ArrayItem[] {
  return items.map((item) => ({ ...item }));
}

/** Inclusive index range [from..to]; empty when from > to. */
export function rangeIndices(from: number, to: number): number[] {
  const out: number[] = [];
  for (let i = from; i <= to; i++) out.push(i);
  return out;
}

/** All indices outside the inclusive window [lo..hi] — e.g. eliminated cells. */
export function outsideWindow(lo: number, hi: number, n: number): number[] {
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    if (i < lo || i > hi) out.push(i);
  }
  return out;
}
