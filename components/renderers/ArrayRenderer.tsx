"use client";

import * as React from "react";
import { motion } from "framer-motion";
import type { RendererProps } from "@/lib/algorithms/types";
import type {
  ArrayVizHighlights,
  ArrayVizState,
} from "@/lib/algorithms/shared/array-model";
import {
  barHeight,
  CELL_CLASSES,
  CELL_STATE_LABELS,
  columnCenter,
  computeSizing,
  POINTER_TONE_CLASSES,
  resolveCellState,
} from "./array-visual";
import { cn } from "@/lib/utils";

type Props = RendererProps<ArrayVizState, ArrayVizHighlights>;

export function ArrayRenderer({ step, reducedMotion }: Props) {
  const items = step.state.items;
  const highlights = step.highlights;
  const count = items.length;

  const values = items.map((i) => i.value);
  const min = values.length ? Math.min(...values) : 0;
  const max = values.length ? Math.max(...values) : 0;

  const sizing = computeSizing(count);

  // Group pointers by index so multiple labels stack cleanly.
  const pointersByIndex = new Map<number, ArrayVizHighlights["pointers"]>();
  for (const p of highlights.pointers ?? []) {
    const list = pointersByIndex.get(p.index) ?? [];
    list.push(p);
    pointersByIndex.set(p.index, list);
  }

  const showValues = sizing.barWidth >= 20;

  return (
    <div className="flex h-full w-full min-w-0 flex-col">
      <div className="scrollbar-thin w-full min-w-0 flex-1 overflow-x-auto overflow-y-hidden">
        <div
          className="relative mx-auto flex min-h-[300px] flex-col justify-end pb-2 pt-16"
          style={{ width: Math.max(sizing.totalWidth, 1) }}
        >
          {/* Pointer overlay — positioned by fixed column, not by moving bar. */}
          <div className="pointer-events-none absolute inset-x-0 top-0 h-16">
            {Array.from(pointersByIndex.entries()).map(([index, pointers]) => (
              <div
                key={index}
                className="absolute flex -translate-x-1/2 flex-col items-center gap-0.5"
                style={{ left: columnCenter(index, sizing) }}
              >
                {(pointers ?? []).map((p) => (
                  <span
                    key={p.label}
                    className={cn(
                      "rounded border px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                      POINTER_TONE_CLASSES[p.tone ?? "neutral"],
                    )}
                  >
                    {p.label}
                  </span>
                ))}
                <span className="text-viz-current" aria-hidden>
                  ▾
                </span>
              </div>
            ))}
          </div>

          {/* Bars — keyed by stable id so swaps animate via layout. */}
          <div
            className="flex items-end"
            style={{ gap: sizing.gap, height: sizing.maxBarHeight + 40 }}
          >
            {items.map((item, index) => {
              const state = resolveCellState(index, highlights);
              const height = barHeight(item.value, min, max, sizing.maxBarHeight);
              return (
                <motion.div
                  key={item.id}
                  layout={!reducedMotion}
                  transition={
                    reducedMotion
                      ? { duration: 0 }
                      : { type: "spring", stiffness: 500, damping: 34 }
                  }
                  className="flex flex-col items-center justify-end"
                  style={{ width: sizing.barWidth }}
                >
                  <div
                    className={cn(
                      "w-full rounded-t-sm border-x border-t transition-colors",
                      CELL_CLASSES[state],
                    )}
                    style={{ height }}
                  />
                  {showValues && (
                    <span className="mt-1 w-full truncate text-center text-[10px] font-medium tabular-nums text-foreground/80">
                      {item.value}
                    </span>
                  )}
                  <span className="text-[9px] tabular-nums text-muted-foreground/60">
                    {index}
                  </span>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Accessible, always-current text summary for screen readers. */}
      <p className="sr-only" aria-live="off">
        Array of {count} value{count === 1 ? "" : "s"}: {values.join(", ")}.
        {highlights.comparing?.length
          ? ` Comparing positions ${highlights.comparing.join(" and ")}.`
          : ""}
        {highlights.swapping?.length
          ? ` Swapping positions ${highlights.swapping.join(" and ")}.`
          : ""}
        {highlights.sorted?.length
          ? ` ${highlights.sorted.length} value(s) in final position.`
          : ""}
        {highlights.found?.length ? ` Result at position ${highlights.found.join(", ")}.` : ""}
      </p>

      <VisibleStateLegendInline highlights={highlights} count={count} />
    </div>
  );
}

/** A compact "what's on screen right now" line under the bars. */
function VisibleStateLegendInline({
  highlights,
  count,
}: {
  highlights: ArrayVizHighlights;
  count: number;
}) {
  const active = new Set<string>();
  for (let i = 0; i < count; i++) {
    active.add(CELL_STATE_LABELS[resolveCellState(i, highlights)]);
  }
  active.delete("unsorted");
  const labels = Array.from(active);
  if (labels.length === 0) return null;
  return (
    <div className="mt-1 text-center text-xs text-muted-foreground">
      Now showing: {labels.join(" · ")}
    </div>
  );
}
