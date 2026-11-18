import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const DIFFICULTY_TONE: Record<string, string> = {
  beginner: "bg-viz-success/15 text-viz-success",
  intermediate: "bg-viz-compare/15 text-viz-compare",
  advanced: "bg-viz-swap/15 text-viz-swap",
};

export function AlgorithmCard({
  definition,
}: {
  definition: AnyAlgorithmDefinition;
}) {
  return (
    <Link
      href={`/visualizers/${definition.slug}`}
      className="group rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <Card className="h-full transition-colors group-hover:border-primary/60 group-hover:bg-accent/40">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{definition.title}</CardTitle>
            <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-foreground" />
          </div>
          <CardDescription className="line-clamp-2">
            {definition.summary}
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2 pt-0">
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
              DIFFICULTY_TONE[definition.difficulty] ?? "bg-muted text-muted-foreground"
            }`}
          >
            {definition.difficulty}
          </span>
          <Badge variant="muted" className="font-mono">
            {definition.complexity.time}
          </Badge>
          <span className="ml-auto font-mono text-xs text-muted-foreground">
            space {definition.complexity.space}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
