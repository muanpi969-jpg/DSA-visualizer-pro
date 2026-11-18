"use client";

import { useId } from "react";
import type { RendererProps } from "@/lib/algorithms/types";
import type { GraphState } from "@/lib/algorithms/extended/types";

const nodeColors = {
  unseen: "hsl(var(--muted))",
  frontier: "hsl(var(--viz-frontier) / .22)",
  current: "hsl(var(--viz-current) / .28)",
  visited: "hsl(var(--viz-visited) / .25)",
};
export function GraphRenderer({ step }: RendererProps<GraphState>) {
  const state = step.state;
  const marker = useId().replace(/:/g, "");
  const radius = state.nodes.length > 16 ? 15 : 24;
  const byId = new Map(state.nodes.map((node) => [node.id, node]));
  return (
    <div className="flex w-full min-w-0 flex-col gap-3 p-2">
      <div className="w-full min-w-0 flex-1 overflow-x-auto">
        <svg
          role="img"
          aria-label={
            (state.directed ? "Directed" : "Undirected") +
            " graph; visited order: " +
            (state.order.join(", ") || "none")
          }
          viewBox="0 0 600 440"
          className="mx-auto block w-full"
          style={{
            minWidth: state.nodes.length > 16 ? 720 : 420,
            maxHeight: 440,
          }}
        >
          <defs>
            <marker
              id={marker}
              markerWidth="8"
              markerHeight="8"
              refX="7"
              refY="4"
              orient="auto"
              markerUnits="userSpaceOnUse"
            >
              <path d="M0,0 L8,4 L0,8 Z" fill="context-stroke" />
            </marker>
          </defs>
          {state.edges.map((edge) => {
            const source = byId.get(edge.from)!,
              target = byId.get(edge.to)!;
            const dx = target.x - source.x,
              dy = target.y - source.y,
              length = Math.hypot(dx, dy) || 1;
            const start = {
              x: source.x + (dx / length) * (radius + 2),
              y: source.y + (dy / length) * (radius + 2),
            };
            const end = {
              x: target.x - (dx / length) * (radius + 7),
              y: target.y - (dy / length) * (radius + 7),
            };
            const reciprocal =
              state.directed &&
              state.edges.some(
                (other) => other.from === edge.to && other.to === edge.from,
              );
            const loopDirection = source.y < 100 ? 1 : -1;
            const path =
              edge.from === edge.to
                ? "M" +
                  (source.x - 8) +
                  "," +
                  (source.y + loopDirection * radius) +
                  " C" +
                  (source.x - 65) +
                  "," +
                  (source.y + loopDirection * 85) +
                  " " +
                  (source.x + 65) +
                  "," +
                  (source.y + loopDirection * 85) +
                  " " +
                  (source.x + 8) +
                  "," +
                  (source.y + loopDirection * radius)
                : reciprocal
                  ? "M" +
                    start.x +
                    "," +
                    start.y +
                    " Q" +
                    ((source.x + target.x) / 2 - (dy / length) * 26) +
                    "," +
                    ((source.y + target.y) / 2 + (dx / length) * 26) +
                    " " +
                    end.x +
                    "," +
                    end.y
                  : "M" + start.x + "," + start.y + " L" + end.x + "," + end.y;
            return (
              <path
                key={edge.id}
                d={path}
                fill="none"
                stroke={
                  state.activeEdge === edge.id
                    ? "hsl(var(--viz-current))"
                    : "hsl(var(--foreground) / .25)"
                }
                strokeWidth={state.activeEdge === edge.id ? 3 : 1.5}
                markerEnd={state.directed ? "url(#" + marker + ")" : undefined}
              >
                <title>
                  {edge.from + (state.directed ? " → " : " — ") + edge.to}
                </title>
              </path>
            );
          })}
          {state.nodes.map((node) => (
            <g
              key={node.id}
              transform={"translate(" + node.x + "," + node.y + ")"}
            >
              <circle
                r={radius}
                fill={nodeColors[state.status[node.id]]}
                stroke={
                  state.status[node.id] === "current"
                    ? "hsl(var(--viz-current))"
                    : "hsl(var(--foreground) / .35)"
                }
                strokeWidth={state.status[node.id] === "current" ? 2.5 : 1}
              />
              <text
                textAnchor="middle"
                dominantBaseline="central"
                fill="hsl(var(--foreground))"
                fontSize={radius < 20 ? 9 : 12}
                fontWeight="600"
                textLength={node.id.length > 6 ? radius * 1.65 : undefined}
                lengthAdjust="spacingAndGlyphs"
              >
                {node.id}
              </text>
              <title>{node.id + ": " + state.status[node.id]}</title>
            </g>
          ))}
          {!state.nodes.length && (
            <text
              x="300"
              y="220"
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              Empty graph
            </text>
          )}
        </svg>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <span>○ Unseen</span>
        <span className="text-viz-frontier">◉ Frontier</span>
        <span className="text-viz-current">◉ Current</span>
        <span className="text-viz-visited">◉ Visited</span>
      </div>
      <p className="text-center text-xs">
        <span className="text-muted-foreground">
          {step.id.startsWith("dfs")
            ? "Stack · top at right: "
            : "Queue · next at left: "}
        </span>
        {state.frontier.join(" · ") || "empty"}
      </p>
      <p className="text-center text-xs">
        <span className="text-muted-foreground">Visit order: </span>
        {state.order.join(" → ") || "none"}
      </p>
      <p className="text-center text-xs text-muted-foreground">
        Discovery parents:{" "}
        {Object.entries(state.parents)
          .filter(([, parent]) => parent !== null)
          .map(([node, parent]) => node + " ← " + parent)
          .join(" · ") || "none"}
      </p>
    </div>
  );
}
