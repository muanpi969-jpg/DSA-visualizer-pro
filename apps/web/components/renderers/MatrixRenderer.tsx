"use client";

import type { RendererProps } from "@/lib/algorithms/types";
import type {
  Cell,
  MatrixHighlights,
  MatrixState,
} from "@/lib/algorithms/extended/types";

const same = (a: Cell | undefined, row: number, column: number) =>
  a?.[0] === row && a?.[1] === column;
export function MatrixRenderer({
  step,
}: RendererProps<MatrixState, MatrixHighlights>) {
  const state = step.state,
    highlights = step.highlights;
  return (
    <div className="flex w-full min-w-0 flex-col justify-center gap-3 p-2">
      <div className="max-h-[420px] w-full min-w-0 overflow-auto rounded-xl border">
        <table
          className="w-full border-separate border-spacing-0 text-center font-mono text-xs"
          aria-label="Dynamic programming table"
        >
          <caption className="sr-only">
            Rows: {state.rowLabels.join(", ")}. Columns:{" "}
            {state.columnLabels.join(", ")}.
          </caption>
          <thead className="sticky top-0 z-10">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 min-w-12 border-b border-r bg-card px-2 py-2 text-muted-foreground"
              >
                prefix
              </th>
              {state.columnLabels.map((label, i) => (
                <th
                  scope="col"
                  key={i}
                  className="min-w-9 border-b bg-card px-2 py-2 text-muted-foreground"
                >
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {state.table.map((row, i) => (
              <tr key={i}>
                <th
                  scope="row"
                  className="sticky left-0 border-r bg-card px-2 py-2 text-muted-foreground"
                >
                  {state.rowLabels[i]}
                </th>
                {row.map((value, j) => {
                  const active = same(highlights.active, i, j),
                    dependency = highlights.dependencies?.some((cell) =>
                      same(cell, i, j),
                    ),
                    path = highlights.path?.some((cell) => same(cell, i, j));
                  return (
                    <td
                      key={j}
                      aria-label={
                        "Row " +
                        i +
                        ", column " +
                        j +
                        ": " +
                        value +
                        (active
                          ? ", active"
                          : dependency
                            ? ", dependency"
                            : path
                              ? ", reconstruction path"
                              : "")
                      }
                      className="h-9 min-w-9 border-b border-r border-border/40 px-2 py-1"
                      style={{
                        background: active
                          ? "hsl(var(--viz-current) / .25)"
                          : dependency
                            ? "hsl(var(--viz-compare) / .2)"
                            : path
                              ? "hsl(var(--viz-success) / .2)"
                              : undefined,
                        color: active ? "hsl(var(--viz-current))" : undefined,
                        fontWeight: active || path ? 700 : undefined,
                      }}
                    >
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap justify-center gap-4 text-xs">
        <span className="text-viz-current">■ Active cell</span>
        <span className="text-viz-compare">■ Dependency</span>
        <span className="text-viz-success">■ Reconstruction</span>
      </div>
      {state.result && (
        <p className="text-center text-sm font-medium text-viz-success">
          {state.result}
        </p>
      )}
      {!!state.operations?.length && (
        <p className="max-w-full break-words px-2 text-center text-xs text-muted-foreground">
          {state.operations.join(" · ")}
        </p>
      )}
    </div>
  );
}
