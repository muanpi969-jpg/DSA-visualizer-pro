import Link from "next/link";
import {
  ArrowDownUp,
  ArrowUpRight,
  Boxes,
  Braces,
  GitBranch,
  Network,
  ScanSearch,
} from "lucide-react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import { CATEGORY_LABELS } from "@/lib/algorithms/registry";
import { AlgorithmPreview } from "./AlgorithmPreview";

const ICONS = {
  sorting: ArrowDownUp,
  search: ScanSearch,
  graph: Network,
  tree: GitBranch,
  "dynamic-programming": Braces,
  "data-structures": Boxes,
};
const TONES = {
  beginner: "text-viz-success",
  intermediate: "text-viz-compare",
  advanced: "text-viz-swap",
};

export function AlgorithmCard({
  definition,
  index = 0,
}: {
  definition: AnyAlgorithmDefinition;
  index?: number;
}) {
  const Icon = ICONS[definition.category];
  return (
    <Link
      href={`/visualizers/${definition.slug}`}
      className="algorithm-card glass-panel group"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[10px] font-medium text-muted-foreground">
          <Icon className="h-3.5 w-3.5 text-primary/70" strokeWidth={1.7} />
          {CATEGORY_LABELS[definition.category]}
        </div>
        <ArrowUpRight className="h-3.5 w-3.5 text-muted-foreground/60 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
      </div>
      <div className="algorithm-thumbnail text-primary">
        <AlgorithmPreview category={definition.category} variant={index} />
      </div>
      <h2 className="text-[15px] font-semibold tracking-[-.03em]">
        {definition.title}
      </h2>
      <p className="mb-5 mt-1.5 line-clamp-2 text-[11px] leading-[1.7] text-muted-foreground">
        {definition.summary}
      </p>
      <div className="mt-auto flex items-center justify-between gap-2 border-t border-border/50 pt-3 text-[10px]">
        <span
          className={`flex items-center gap-1.5 capitalize ${TONES[definition.difficulty]}`}
        >
          <span className="difficulty-dot" />
          {definition.difficulty}
        </span>
        <span className="rounded-md bg-muted/50 px-2 py-1 font-mono text-[9px] text-muted-foreground">
          {definition.complexity.time}
        </span>
      </div>
    </Link>
  );
}
