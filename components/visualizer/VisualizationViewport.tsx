"use client";

import * as React from "react";
import { Maximize2, Minimize2, Info } from "lucide-react";
import type {
  AnyAlgorithmDefinition,
  VisualizationStep,
} from "@/lib/algorithms/types";
import { RendererSwitch } from "@/components/renderers/RendererSwitch";
import { PlaybackControls } from "./PlaybackControls";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export interface ViewportHandle {
  toggleFullscreen: () => void;
}

interface Props {
  definition: AnyAlgorithmDefinition;
  step: VisualizationStep | undefined;
  previousStep: VisualizationStep | undefined;
  reducedMotion: boolean;
  error: string | null;
}

export const VisualizationViewport = React.forwardRef<ViewportHandle, Props>(
  function VisualizationViewport(
    { step, previousStep, reducedMotion, error },
    ref,
  ) {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const [isFullscreen, setIsFullscreen] = React.useState(false);

    const toggleFullscreen = React.useCallback(() => {
      const el = containerRef.current;
      if (!el) return;
      if (!document.fullscreenElement) {
        el.requestFullscreen?.().catch(() => {});
      } else {
        document.exitFullscreen?.().catch(() => {});
      }
    }, []);

    React.useImperativeHandle(ref, () => ({ toggleFullscreen }), [toggleFullscreen]);

    React.useEffect(() => {
      const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);

    return (
      <section
        ref={containerRef}
        className="flex min-h-[520px] min-w-0 flex-col rounded-lg border bg-card"
        aria-label="Visualization"
      >
        <div className="flex items-center justify-between border-b px-3 py-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Visualization
          </h2>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <Minimize2 className="h-4 w-4" />
                ) : (
                  <Maximize2 className="h-4 w-4" />
                )}
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {isFullscreen ? "Exit fullscreen" : "Fullscreen"}{" "}
              <span className="opacity-60">(F)</span>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Stage */}
        <div className="relative flex min-w-0 flex-1 items-stretch justify-center bg-background/40 p-3">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-2 p-8 text-center">
              <Info className="h-6 w-6 text-destructive" />
              <p className="max-w-sm text-sm text-destructive">{error}</p>
            </div>
          ) : step ? (
            <RendererSwitch
              step={step}
              previousStep={previousStep}
              reducedMotion={reducedMotion}
            />
          ) : (
            <div className="flex items-center justify-center p-8 text-sm text-muted-foreground">
              Loading…
            </div>
          )}
        </div>

        {/* Live operation note */}
        <div
          className="min-h-[3rem] border-t px-4 py-2 text-sm"
          aria-live="polite"
        >
          {step ? (
            <p>
              <span className="mr-2 font-mono text-xs text-muted-foreground">
                step {step.index + 1}
              </span>
              {step.note}
            </p>
          ) : (
            <p className="text-muted-foreground">Ready.</p>
          )}
        </div>

        {/* Transport */}
        <div className="border-t px-4 py-3">
          <PlaybackControls />
        </div>
      </section>
    );
  },
);
