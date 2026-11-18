import { Suspense } from "react";
import type { Metadata } from "next";
import { CatalogExplorer } from "@/components/catalog/CatalogExplorer";

export const metadata: Metadata = {
  title: "Algorithm library",
  description:
    "Explore interactive sorting, searching, graphs, trees, dynamic programming, and data structures with step-by-step code tracing.",
};

export default function VisualizersPage() {
  return (
    <Suspense
      fallback={
        <div className="studio-content">
          <div className="glass-panel flex min-h-80 items-center justify-center rounded-3xl text-sm text-muted-foreground">
            Opening your algorithm workspace…
          </div>
        </div>
      }
    >
      <CatalogExplorer />
    </Suspense>
  );
}
