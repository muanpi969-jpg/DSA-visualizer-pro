"use client";

import type {
  AnyAlgorithmDefinition,
  StepMetrics,
  VisualizationStep,
} from "@/lib/algorithms/types";
import { Badge } from "@/components/ui/badge";

const METRIC_LABELS: Record<keyof StepMetrics, string> = {
  comparisons: "Comparisons",
  swaps: "Swaps",
  writes: "Writes",
  reads: "Reads",
  visited: "Visited",
  relaxedEdges: "Relaxed edges",
  queueSize: "Queue size",
  stackSize: "Stack size",
  recursionDepth: "Recursion depth",
  currentPass: "Pass",
  memoryCells: "Memory cells",
};

export function MetricsPanel({
  definition,
  step,
  totalSteps,
}: {
  definition: AnyAlgorithmDefinition;
  step: VisualizationStep | undefined;
  totalSteps: number;
}) {
  const metrics = step?.metrics ?? {};
  const entries = (Object.keys(METRIC_LABELS) as Array<keyof StepMetrics>)
    .filter((key) => metrics[key] !== undefined)
    .map((key) => [METRIC_LABELS[key], metrics[key] as number] as const);

  const c = definition.complexity;
  const stepNumber = step ? step.index + 1 : 0;

  return (
    <div className="flex h-full flex-col gap-4 overflow-y-auto p-4 scrollbar-thin">
      {/* Complexity */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Complexity
        </h3>
        <dl className="grid grid-cols-2 gap-2 text-sm">
          {c.best && <Stat label="Best" value={c.best} mono />}
          <Stat label="Average" value={c.average ?? c.time} mono />
          {c.worst && <Stat label="Worst" value={c.worst} mono />}
          <Stat label="Space" value={c.space} mono />
        </dl>
      </section>

      {/* Progress */}
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Progress
        </h3>
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Step</span>
          <span className="font-mono tabular-nums">
            {stepNumber} / {totalSteps}
          </span>
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-[width]"
            style={{
              width: `${totalSteps > 1 ? Math.max(0, ((stepNumber - 1) / (totalSteps - 1)) * 100) : totalSteps === 1 && stepNumber === 1 ? 100 : 0}%`,
            }}
          />
        </div>
      </section>

      {/* Live counters */}
      {entries.length > 0 && (
        <section>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Live counters
          </h3>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            {entries.map(([label, value]) => (
              <Stat key={label} label={label} value={String(value)} mono />
            ))}
          </dl>
        </section>
      )}

      {/* Operation + invariant */}
      <section className="space-y-2">
        {step?.operation && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Operation</span>
            <Badge
              variant="secondary"
              className="font-mono text-[11px] capitalize"
            >
              {step.operation}
            </Badge>
          </div>
        )}
        {step?.invariant && (
          <div className="rounded-md border border-viz-success/30 bg-viz-success/5 p-2 text-xs">
            <span className="font-medium text-viz-success">Invariant:</span>{" "}
            <span className="text-foreground/80">{step.invariant}</span>
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="metrics-stat flex min-w-0 flex-col gap-1">
      <dt className="text-[9px] text-muted-foreground">{label}</dt>
      <dd
        className={
          mono ? "break-words font-mono text-xs tabular-nums" : "text-xs"
        }
      >
        {value}
      </dd>
    </div>
  );
}
