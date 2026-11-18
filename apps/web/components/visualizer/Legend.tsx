"use client";

import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";

interface LegendItem {
  label: string;
  className: string;
}
const ARRAY_LEGEND: LegendItem[] = [
  {
    label: "Unsorted",
    className: "bg-muted-foreground/25 border-muted-foreground/30",
  },
  { label: "Current", className: "bg-viz-current/80 border-viz-current" },
  { label: "Comparing", className: "bg-viz-compare/80 border-viz-compare" },
  { label: "Swap / write", className: "bg-viz-swap/80 border-viz-swap" },
  {
    label: "Ordered working region",
    className: "bg-viz-current/25 border-viz-current/50",
  },
  {
    label: "Sorted / final",
    className: "bg-viz-success/70 border-viz-success",
  },
  {
    label: "Eliminated",
    className: "bg-viz-eliminated/40 border-viz-eliminated/60",
  },
  { label: "Found", className: "bg-viz-success border-viz-success" },
  { label: "Not found", className: "bg-viz-error/85 border-viz-error" },
];
const GRAPH_LEGEND: LegendItem[] = [
  { label: "Current node", className: "bg-viz-current/80 border-viz-current" },
  { label: "Frontier", className: "bg-viz-frontier/70 border-viz-frontier" },
  { label: "Visited", className: "bg-viz-visited/60 border-viz-visited" },
  { label: "Path / final", className: "bg-viz-success/70 border-viz-success" },
];
const MATRIX_LEGEND: LegendItem[] = [
  { label: "Current cell", className: "bg-viz-current/80 border-viz-current" },
  { label: "Dependency", className: "bg-viz-compare/70 border-viz-compare" },
  { label: "Written cell", className: "bg-viz-swap/65 border-viz-swap" },
  { label: "Answer / path", className: "bg-viz-success/70 border-viz-success" },
];
const POINTER_LEGEND: LegendItem[] = [
  {
    label: "Current pointer",
    className: "bg-viz-current/80 border-viz-current",
  },
  { label: "Pointer update", className: "bg-viz-swap/70 border-viz-swap" },
  { label: "Visited node", className: "bg-viz-visited/60 border-viz-visited" },
  { label: "Result", className: "bg-viz-success/70 border-viz-success" },
];

export function Legend({ definition }: { definition: AnyAlgorithmDefinition }) {
  const kind = definition.visualizerKind;
  const items =
    kind === "array"
      ? ARRAY_LEGEND
      : kind === "matrix"
        ? MATRIX_LEGEND
        : kind === "graph" || kind === "tree"
          ? GRAPH_LEGEND
          : POINTER_LEGEND;
  return (
    <div className="p-4">
      <h3 className="eyebrow mb-4">Reading the visualization</h3>
      <ul className="grid grid-cols-2 gap-x-3 gap-y-3 text-[11px]">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-3 w-3 shrink-0 rounded-[4px] border ${item.className}`}
            />
            <span className="text-foreground/80">{item.label}</span>
          </li>
        ))}
      </ul>
      <p className="mt-5 border-t border-border/50 pt-3 text-[10px] leading-relaxed text-muted-foreground">
        {kind === "array"
          ? "Pointer labels mark the positions the algorithm is examining. Values stay attached to their elements as they move."
          : kind === "matrix"
            ? "Each cell records a subproblem. Follow the highlighted dependencies to understand how the next answer is built."
            : "Follow the active node and pointer labels. The step narration explains each visit, connection, or update."}
      </p>
    </div>
  );
}
