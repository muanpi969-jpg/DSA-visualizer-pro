"use client";

import type {
  AnyAlgorithmDefinition,
  VisualizationStep,
} from "@/lib/algorithms/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { MetricsPanel } from "./MetricsPanel";
import { Legend } from "./Legend";
import { InspectorPanel } from "./InspectorPanel";

export function InfoTabs({
  definition,
  step,
  totalSteps,
}: {
  definition: AnyAlgorithmDefinition;
  step: VisualizationStep | undefined;
  totalSteps: number;
}) {
  return (
    <div className="glass-panel flex min-h-[300px] min-w-0 flex-col overflow-hidden rounded-[18px]">
      <Tabs defaultValue="metrics" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b border-border/50 p-2">
          <TabsList className="w-full rounded-xl bg-muted/50">
            <TabsTrigger
              value="metrics"
              className="flex-1 rounded-lg text-[10px]"
            >
              Metrics
            </TabsTrigger>
            <TabsTrigger
              value="legend"
              className="flex-1 rounded-lg text-[10px]"
            >
              Legend
            </TabsTrigger>
            <TabsTrigger
              value="about"
              className="flex-1 rounded-lg text-[10px]"
            >
              About
            </TabsTrigger>
          </TabsList>
        </div>
        <TabsContent value="metrics" className="mt-0 min-h-0 flex-1">
          <MetricsPanel
            definition={definition}
            step={step}
            totalSteps={totalSteps}
          />
        </TabsContent>
        <TabsContent value="legend" className="mt-0 min-h-0 flex-1">
          <Legend definition={definition} />
        </TabsContent>
        <TabsContent value="about" className="mt-0 min-h-0 flex-1">
          <InspectorPanel definition={definition} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
