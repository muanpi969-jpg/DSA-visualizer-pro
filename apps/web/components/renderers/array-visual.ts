import type { ArrayVizHighlights } from "@/lib/algorithms/shared/array-model";

export type CellState =
  | "default"
  | "active"
  | "comparing"
  | "swapping"
  | "ordered"
  | "sorted"
  | "eliminated"
  | "found"
  | "error";

/** Resolve the single visual state for a cell, highest priority wins. */
export function resolveCellState(
  index: number,
  h: ArrayVizHighlights,
): CellState {
  if (h.error?.includes(index)) return "error";
  if (h.found?.includes(index)) return "found";
  if (h.swapping?.includes(index)) return "swapping";
  if (h.comparing?.includes(index)) return "comparing";
  if (h.active?.includes(index)) return "active";
  if (h.eliminated?.includes(index)) return "eliminated";
  if (h.ordered?.includes(index)) return "ordered";
  if (h.sorted?.includes(index)) return "sorted";
  return "default";
}

/** Tailwind classes for each bar state (fill + border). */
export const CELL_CLASSES: Record<CellState, string> = {
  default: "bg-muted-foreground/25 border-muted-foreground/30",
  active: "bg-viz-current/80 border-viz-current",
  comparing: "bg-viz-compare/80 border-viz-compare",
  swapping: "bg-viz-swap/80 border-viz-swap",
  ordered: "bg-viz-current/25 border-viz-current/50",
  sorted: "bg-viz-success/70 border-viz-success",
  eliminated: "bg-viz-eliminated/40 border-viz-eliminated/60",
  found: "bg-viz-success border-viz-success",
  error: "bg-viz-error/85 border-viz-error",
};

export const POINTER_TONE_CLASSES: Record<string, string> = {
  current: "bg-viz-current/15 text-viz-current border-viz-current/40",
  compare: "bg-viz-compare/15 text-viz-compare border-viz-compare/40",
  swap: "bg-viz-swap/15 text-viz-swap border-viz-swap/40",
  bound: "bg-viz-frontier/15 text-viz-frontier border-viz-frontier/40",
  neutral: "bg-muted text-muted-foreground border-border",
};

/** Human-readable label per state, used by the accessible summary + legend. */
export const CELL_STATE_LABELS: Record<CellState, string> = {
  default: "unsorted",
  active: "current",
  comparing: "comparing",
  swapping: "swapping",
  ordered: "ordered prefix",
  sorted: "sorted",
  eliminated: "eliminated",
  found: "found",
  error: "not found",
};

export interface BarSizing {
  barWidth: number;
  gap: number;
  totalWidth: number;
  maxBarHeight: number;
}

export function computeSizing(count: number): BarSizing {
  const gap = 6;
  const barWidth = Math.max(
    16,
    Math.min(48, Math.floor(600 / Math.max(count, 1)) - gap),
  );
  const totalWidth = count * barWidth + Math.max(count - 1, 0) * gap;
  return { barWidth, gap, totalWidth, maxBarHeight: 220 };
}

/** Map a value into a pixel bar height within the data's [min,max] range. */
export function barHeight(
  value: number,
  min: number,
  max: number,
  maxBarHeight: number,
): number {
  const minHeight = 14;
  if (max === min) return Math.round((minHeight + maxBarHeight) / 2);
  const scale = Math.max(Math.abs(min), Math.abs(max), Math.abs(value), 1);
  const fraction = (value / scale - min / scale) / (max / scale - min / scale);
  const t = Number.isFinite(fraction)
    ? Math.min(1, Math.max(0, fraction))
    : 0.5;
  return Math.round(minHeight + t * (maxBarHeight - minHeight));
}

/** Center x (px) of column `index` given sizing — used to place pointers. */
export function columnCenter(index: number, sizing: BarSizing): number {
  return index * (sizing.barWidth + sizing.gap) + sizing.barWidth / 2;
}
