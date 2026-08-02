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
    <div className="flex min-h-[300px] flex-col rounded-lg border bg-card">
      <Tabs defaultValue="metrics" className="flex min-h-0 flex-1 flex-col">
        <div className="border-b p-2">
          <TabsList className="w-full">
            <TabsTrigger value="metrics" className="flex-1">
              Metrics
            </TabsTrigger>
            <TabsTrigger value="legend" className="flex-1">
              Legend
            </TabsTrigger>
            <TabsTrigger value="about" className="flex-1">
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
