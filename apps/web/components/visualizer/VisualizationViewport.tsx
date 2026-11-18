"use client";

import * as React from "react";
import { Maximize2, Minimize2, Info, LoaderCircle, Scan } from "lucide-react";
import type {
  AnyAlgorithmDefinition,
  VisualizationStep,
} from "@/lib/algorithms/types";
import { RendererSwitch } from "@/components/renderers/RendererSwitch";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
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
    const status = usePlaybackStore((state) => state.status);
    const generating = String(status) === "generating";
    const toggleFullscreen = React.useCallback(() => {
      const element = containerRef.current;
      if (!element) return;
      if (!document.fullscreenElement)
        element.requestFullscreen?.().catch(() => {});
      else document.exitFullscreen?.().catch(() => {});
    }, []);
    React.useImperativeHandle(ref, () => ({ toggleFullscreen }), [
      toggleFullscreen,
    ]);
    React.useEffect(() => {
      const onChange = () =>
        setIsFullscreen(document.fullscreenElement === containerRef.current);
      document.addEventListener("fullscreenchange", onChange);
      return () => document.removeEventListener("fullscreenchange", onChange);
    }, []);
    const label = generating
      ? "Preparing"
      : status === "playing"
        ? "Playing"
        : status === "complete"
          ? "Complete"
          : status === "paused"
            ? "Paused"
            : "Ready to explore";
    return (
      <section
        ref={containerRef}
        className="visualizer-stage glass-panel"
        aria-label="Visualization"
        aria-busy={generating}
      >
        <div className="stage-heading">
          <h2 className="flex items-center gap-2 text-[11px] font-semibold">
            <Scan className="h-3.5 w-3.5 text-primary/70" /> Visualization
          </h2>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-[9px] text-muted-foreground">
              <span
                className={`h-1.5 w-1.5 rounded-full ${status === "playing" || status === "complete" ? "bg-viz-success" : "bg-primary/45"}`}
              />
              {label}
            </span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 rounded-lg text-muted-foreground"
                  aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
                  onClick={toggleFullscreen}
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-3.5 w-3.5" />
                  ) : (
                    <Maximize2 className="h-3.5 w-3.5" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {isFullscreen ? "Exit fullscreen" : "Fullscreen"} (F)
              </TooltipContent>
            </Tooltip>
          </div>
        </div>
        <div className="stage-canvas">
          {error ? (
            <div className="flex flex-col items-center justify-center gap-3 p-8 text-center">
              <Info className="h-6 w-6 text-destructive" />
              <p className="max-w-sm text-sm text-destructive" role="alert">
                {error}
              </p>
            </div>
          ) : generating || !step ? (
            <div
              className="flex flex-col items-center justify-center gap-3 p-8 text-center text-muted-foreground"
              role="status"
            >
              <LoaderCircle className="h-5 w-5 animate-spin text-primary/70" />
              <p className="text-xs">Preparing your step-by-step trace…</p>
            </div>
          ) : (
            <RendererSwitch
              step={step}
              previousStep={previousStep}
              reducedMotion={reducedMotion}
            />
          )}
        </div>
        <div className="stage-note" aria-live="polite">
          <span className="stage-note-index">
            {step ? String(step.index + 1).padStart(2, "0") : "—"}
          </span>
          <p>
            {step
              ? step.note
              : generating
                ? "Building the timeline from your input."
                : error
                  ? "Update your input to try again."
                  : "Your next discovery starts here."}
          </p>
        </div>
        <div className="playback-panel">
          <PlaybackControls />
        </div>
      </section>
    );
  },
);
