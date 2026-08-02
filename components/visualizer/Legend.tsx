"use client";

import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";

interface LegendItem {
  label: string;
  className: string;
  shape?: "bar" | "dot";
}

// Legend for array-based visualizers. Uses both color and text so it never
// relies on color alone (accessibility).
const ARRAY_LEGEND: LegendItem[] = [
  { label: "Unsorted", className: "bg-muted-foreground/25 border-muted-foreground/30" },
  { label: "Current", className: "bg-viz-current/80 border-viz-current" },
  { label: "Comparing", className: "bg-viz-compare/80 border-viz-compare" },
  { label: "Swapping / write", className: "bg-viz-swap/80 border-viz-swap" },
  { label: "Sorted / final", className: "bg-viz-success/70 border-viz-success" },
  { label: "Eliminated", className: "bg-viz-eliminated/40 border-viz-eliminated/60" },
  { label: "Found", className: "bg-viz-success border-viz-success" },
  { label: "Not found", className: "bg-viz-error/85 border-viz-error" },
];

export function Legend({ definition }: { definition: AnyAlgorithmDefinition }) {
  const items = definition.visualizerKind === "array" ? ARRAY_LEGEND : [];

  return (
    <div className="p-3">
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Legend
      </h3>
      <ul className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
        {items.map((item) => (
          <li key={item.label} className="flex items-center gap-2">
            <span
              aria-hidden
              className={`h-3.5 w-3.5 shrink-0 rounded-sm border ${item.className}`}
            />
            <span className="text-foreground/80">{item.label}</span>
          </li>
        ))}
      </ul>
      <div className="mt-3 border-t pt-2 text-xs text-muted-foreground">
        <span className="font-medium text-foreground/70">Pointers</span> such as{" "}
        <span className="font-mono">j</span>,{" "}
        <span className="font-mono">j+1</span> mark the array positions the
        algorithm is examining.
      </div>
    </div>
  );
}
