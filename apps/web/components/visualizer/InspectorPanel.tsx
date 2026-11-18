"use client";

import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import { Badge } from "@/components/ui/badge";

export function InspectorPanel({
  definition,
}: {
  definition: AnyAlgorithmDefinition;
}) {
  return (
    <div className="space-y-4 overflow-y-auto p-4 text-xs leading-relaxed scrollbar-thin">
      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          About
        </h3>
        <p className="text-foreground/80">{definition.description}</p>
      </section>

      {definition.preconditions && definition.preconditions.length > 0 && (
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Preconditions &amp; notes
          </h3>
          <ul className="list-disc space-y-1 pl-4 text-foreground/80">
            {definition.preconditions.map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </section>
      )}

      <section>
        <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Tags
        </h3>
        <div className="flex flex-wrap gap-1.5">
          {definition.tags.map((tag) => (
            <Badge key={tag} variant="muted">
              {tag}
            </Badge>
          ))}
        </div>
      </section>
    </div>
  );
}
