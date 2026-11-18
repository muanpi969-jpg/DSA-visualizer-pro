"use client";

import Link from "next/link";
import { ArrowLeft, ChevronRight } from "lucide-react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import { CATEGORY_LABELS } from "@/lib/algorithms/registry";
import { ArrayDataControls } from "./ArrayDataControls";
import { ModuleDataControls } from "./ModuleDataControls";
import { PreferencesControls } from "./PreferencesControls";
import { useMounted } from "@/lib/hooks/useMounted";

export function VisualizerToolbar({
  definition,
}: {
  definition: AnyAlgorithmDefinition;
}) {
  const mounted = useMounted();
  return (
    <div className="visualizer-header">
      <div className="mb-5 flex items-center gap-2 text-[11px] text-muted-foreground">
        <Link
          href="/visualizers"
          className="inline-flex items-center gap-1.5 transition-colors hover:text-primary"
        >
          <ArrowLeft className="h-3 w-3" /> Algorithm library
        </Link>
        <ChevronRight className="h-3 w-3 opacity-50" />
        <span>{CATEGORY_LABELS[definition.category]}</span>
      </div>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="mb-1.5 flex flex-wrap items-center gap-2.5">
            <h1 className="text-[27px] font-semibold leading-tight tracking-[-.045em]">
              {definition.title}
            </h1>
            <span className="rounded-full border border-primary/10 bg-primary/[.065] px-2.5 py-1 text-[9px] font-medium capitalize text-primary">
              {definition.difficulty}
            </span>
          </div>
          <p className="max-w-xl text-[12px] leading-relaxed text-muted-foreground">
            {definition.summary}
          </p>
        </div>
        <div className="visualizer-preferences max-w-full rounded-xl border border-white/30 bg-card/30 px-2 py-1">
          <PreferencesControls />
        </div>
      </div>
      {/* SSR controls become editable only after their client handlers attach. */}
      <fieldset disabled={!mounted} className="visualizer-data glass-panel min-w-0">
        <legend className="sr-only">Algorithm input</legend>
        <div className="mb-3 flex items-center gap-2">
          <span className="eyebrow">Your input</span>
          <span className="text-[10px] text-muted-foreground/70">
            Make it your own
          </span>
        </div>
        {definition.visualizerKind === "array" ? (
          <div className="array-data-controls">
            <ArrayDataControls key={definition.slug} definition={definition} />
          </div>
        ) : (
          <ModuleDataControls key={definition.slug} definition={definition} />
        )}
      </fieldset>
    </div>
  );
}
