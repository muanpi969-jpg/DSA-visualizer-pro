import type { Metadata } from "next";
import { getAlgorithmsByCategory } from "@/lib/algorithms/registry";
import { AlgorithmCard } from "@/components/catalog/AlgorithmCard";

export const metadata: Metadata = {
  title: "Algorithm catalog",
  description:
    "Browse interactive, step-by-step algorithm visualizers across sorting, searching, graphs, trees, dynamic programming, and data structures.",
};

// Roadmap of the core catalog. Items without a live visualizer are shown as
// clearly-labelled "planned" so nothing is misrepresented as complete.
const ROADMAP: Record<string, string[]> = {
  Graphs: ["BFS", "DFS", "Dijkstra", "Bellman-Ford", "Kruskal", "Prim", "Topological Sort"],
  Trees: ["Tree Traversals", "BST Operations", "AVL Operations"],
  "Dynamic Programming": ["Fibonacci DP", "0/1 Knapsack", "LCS", "LIS"],
};

export default function VisualizersPage() {
  const groups = getAlgorithmsByCategory();
  const liveCount = groups.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight">
          Algorithm Visualizers
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Watch algorithms think, one atomic step at a time — with live code
          tracing, metrics, and fully keyboard-accessible playback. Pick a
          visualizer to begin.
        </p>
        <p className="mt-2 text-xs text-muted-foreground">
          {liveCount} interactive visualizer{liveCount === 1 ? "" : "s"} available.
        </p>
      </header>

      <div className="space-y-10">
        {groups.map((group) => (
          <section key={group.category} aria-labelledby={`cat-${group.category}`}>
            <h2
              id={`cat-${group.category}`}
              className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground"
            >
              {group.label}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {group.items.map((def) => (
                <AlgorithmCard key={def.slug} definition={def} />
              ))}
            </div>
          </section>
        ))}
      </div>

      <section className="mt-12 rounded-lg border border-dashed p-5" aria-label="Roadmap">
        <h2 className="text-sm font-semibold">Planned visualizers</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Coming as the engine expands through the build phases. These are not
          yet interactive.
        </p>
        <div className="mt-4 space-y-3">
          {Object.entries(ROADMAP).map(([label, items]) => (
            <div key={label} className="flex flex-wrap items-center gap-2">
              <span className="w-full text-xs font-medium text-muted-foreground sm:w-40">
                {label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {items.map((name) => (
                  <span
                    key={name}
                    className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground"
                  >
                    {name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
