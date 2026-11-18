"use client";

import type { RendererProps, VisualizerKind } from "@/lib/algorithms/types";
import { ArrayRenderer } from "./ArrayRenderer";
import { GraphRenderer } from "./GraphRenderer";
import { LinkedListRenderer } from "./LinkedListRenderer";
import { MatrixRenderer } from "./MatrixRenderer";
import type {
  GraphState,
  ListHighlights,
  ListState,
  MatrixHighlights,
  MatrixState,
} from "@/lib/algorithms/extended/types";

/**
 * Chooses a renderer from the active step's `kind`. As new renderers land
 * (matrix, graph, tree, linked-list) they register here — the shell never
 * changes. Renderers never compute algorithm results.
 */
export function RendererSwitch(props: RendererProps) {
  const kind: VisualizerKind = props.step.kind;

  switch (kind) {
    case "array":
      return <ArrayRenderer {...(props as RendererProps<any, any>)} />;
    case "graph":
      return <GraphRenderer {...(props as RendererProps<GraphState>)} />;
    case "linked-list":
      return (
        <LinkedListRenderer
          {...(props as RendererProps<ListState, ListHighlights>)}
        />
      );
    case "matrix":
      return (
        <MatrixRenderer
          {...(props as RendererProps<MatrixState, MatrixHighlights>)}
        />
      );
    default:
      return (
        <div className="flex h-full items-center justify-center p-8 text-center text-sm text-muted-foreground">
          No renderer is registered for &quot;{kind}&quot; yet.
        </div>
      );
  }
}
