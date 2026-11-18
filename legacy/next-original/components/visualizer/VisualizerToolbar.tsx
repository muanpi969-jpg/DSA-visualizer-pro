"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import { ArrayDataControls } from "./ArrayDataControls";
import { PreferencesControls } from "./PreferencesControls";
import { Badge } from "@/components/ui/badge";

export function VisualizerToolbar({
  definition,
}: {
  definition: AnyAlgorithmDefinition;
}) {
  return (
    <div className="flex flex-col gap-3 border-b pb-4">
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/visualizers"
          className="flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Catalog
        </Link>
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-semibold tracking-tight">
            {definition.title}
          </h1>
          <Badge variant="secondary" className="capitalize">
            {definition.difficulty}
          </Badge>
        </div>
        <div className="ml-auto">
          <PreferencesControls />
        </div>
      </div>

      {definition.visualizerKind === "array" && (
        <ArrayDataControls definition={definition} />
      )}
    </div>
  );
}
