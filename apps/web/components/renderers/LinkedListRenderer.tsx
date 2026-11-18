"use client";

import { useId } from "react";
import type { RendererProps } from "@/lib/algorithms/types";
import type {
  ListHighlights,
  ListState,
} from "@/lib/algorithms/extended/types";

export function LinkedListRenderer({
  step,
}: RendererProps<ListState, ListHighlights>) {
  const state = step.state,
    highlights = step.highlights;
  const marker = useId().replace(/:/g, "");
  const width = Math.max(440, state.nodes.length * 116 + 60);
  const positions = new Map(
    state.nodes.map((node, i) => [node.id, 64 + i * 116]),
  );
  const pointers = { head: state.head, ...state.pointers };
  return (
    <div className="flex w-full min-w-0 flex-col justify-center gap-3 py-4">
      <div className="w-full min-w-0 overflow-x-auto">
        <svg
          role="img"
          aria-label={
            "Linked list. " +
            Object.entries(pointers)
              .map(([name, id]) => name + ": " + (id ?? "null"))
              .join(", ")
          }
          viewBox={"0 0 " + width + " 290"}
          className="mx-auto block w-full"
          style={{ minWidth: width, minHeight: 280 }}
        >
          <defs>
            <marker
              id={marker}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="hsl(var(--foreground) / .5)" />
            </marker>
          </defs>
          {state.nodes.map((node) => {
            if (node.next === null) return null;
            const x = positions.get(node.id)!,
              target = positions.get(node.next)!;
            const direction = target >= x ? 1 : -1,
              fromX = x + direction * 36,
              toX = target - direction * 40;
            const distant = Math.abs(target - x) > 120;
            const d = distant
              ? "M" +
                fromX +
                ",145 Q" +
                (x + target) / 2 +
                ",35 " +
                toX +
                ",145"
              : "M" + fromX + ",145 L" + toX + ",145";
            return (
              <path
                key={node.id + "-next"}
                d={d}
                stroke="hsl(var(--foreground) / .5)"
                strokeWidth="1.7"
                fill="none"
                markerEnd={"url(#" + marker + ")"}
              >
                <title>{node.id + ".next = " + node.next}</title>
              </path>
            );
          })}
          {state.nodes.map((node) => {
            const x = positions.get(node.id)!;
            const active = highlights.active?.includes(node.id),
              found = highlights.found?.includes(node.id);
            const named = Object.entries(pointers)
              .filter(([, id]) => id === node.id)
              .map(([name]) => name);
            return (
              <g key={node.id} transform={"translate(" + x + ",145)"}>
                <rect
                  x="-36"
                  y="-24"
                  width="72"
                  height="48"
                  rx="12"
                  fill={
                    found
                      ? "hsl(var(--viz-success) / .2)"
                      : active
                        ? "hsl(var(--viz-current) / .2)"
                        : "hsl(var(--card))"
                  }
                  stroke={
                    found
                      ? "hsl(var(--viz-success))"
                      : active
                        ? "hsl(var(--viz-current))"
                        : "hsl(var(--foreground) / .3)"
                  }
                  strokeWidth={active || found ? 2 : 1}
                />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="14"
                  fontWeight="600"
                  fill="hsl(var(--foreground))"
                  textLength={String(node.value).length > 7 ? 60 : undefined}
                  lengthAdjust="spacingAndGlyphs"
                >
                  {node.value}
                </text>
                <text
                  y="43"
                  textAnchor="middle"
                  fontSize="10"
                  fill="hsl(var(--muted-foreground))"
                >
                  {node.id}
                </text>
                {named.map((name, i) => (
                  <text
                    key={name}
                    y={65 + i * 15}
                    textAnchor="middle"
                    fontSize="11"
                    fill="hsl(var(--viz-current))"
                  >
                    ↑ {name}
                  </text>
                ))}
                {node.next === null && (
                  <text
                    y="-37"
                    textAnchor="middle"
                    fontSize="10"
                    fill="hsl(var(--muted-foreground))"
                  >
                    next = null
                  </text>
                )}
              </g>
            );
          })}
          {!state.nodes.length && (
            <text
              x={width / 2}
              y="145"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              Empty list · head = null
            </text>
          )}
        </svg>
      </div>
      <p className="px-3 text-center text-xs text-muted-foreground">
        {Object.entries(pointers)
          .filter(([, id]) => id === null)
          .map(([name]) => name + " = null")
          .join(" · ") || "Arrows show each node’s next pointer."}
      </p>
      {state.result && (
        <p className="px-3 text-center text-sm font-medium text-viz-success">
          {state.result}
        </p>
      )}
    </div>
  );
}
