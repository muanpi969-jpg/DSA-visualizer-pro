"use client";

import { Pause, Play, RotateCcw, SkipBack, SkipForward } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import { getAudioEngine } from "@/lib/audio/VisualizationAudioEngine";

function TransportButton({
  label,
  hint,
  onClick,
  disabled,
  children,
}: {
  label: string;
  hint?: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          disabled={disabled}
          className="transport-button"
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        {label}
        {hint ? <span className="ml-1 opacity-60">({hint})</span> : null}
      </TooltipContent>
    </Tooltip>
  );
}

export function PlaybackControls() {
  const status = usePlaybackStore((s) => s.status);
  const currentStepIndex = usePlaybackStore((s) => s.currentStepIndex);
  const total = usePlaybackStore((s) => s.steps.length);
  const play = usePlaybackStore((s) => s.play);
  const pause = usePlaybackStore((s) => s.pause);
  const reset = usePlaybackStore((s) => s.reset);
  const next = usePlaybackStore((s) => s.next);
  const previous = usePlaybackStore((s) => s.previous);
  const seek = usePlaybackStore((s) => s.seek);

  const isPlaying = status === "playing";
  const hasSteps = total > 0;
  const lastIndex = Math.max(total - 1, 0);
  const startAudioFromGesture = () => {
    if (!usePreferencesStore.getState().isMuted)
      void getAudioEngine().ensureStarted();
  };

  return (
    <div className="flex w-full flex-col gap-3">
      <div className="flex items-center justify-center gap-2">
        <TransportButton
          label="Reset"
          hint="R"
          onClick={reset}
          disabled={!hasSteps}
        >
          <RotateCcw className="h-4 w-4" />
        </TransportButton>
        <TransportButton
          label="Previous step"
          hint="←"
          onClick={previous}
          disabled={!hasSteps || currentStepIndex === 0}
        >
          <SkipBack className="h-4 w-4" />
        </TransportButton>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              aria-label={isPlaying ? "Pause" : "Play"}
              onClick={() => {
                if (isPlaying) pause();
                else {
                  startAudioFromGesture();
                  play();
                }
              }}
              disabled={!hasSteps}
              className="play-button"
            >
              {isPlaying ? (
                <Pause className="h-5 w-5" />
              ) : (
                <Play className="h-5 w-5" />
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>
            {isPlaying ? "Pause" : "Play"}{" "}
            <span className="opacity-60">(Space)</span>
          </TooltipContent>
        </Tooltip>

        <TransportButton
          label="Next step"
          hint="→"
          onClick={() => {
            startAudioFromGesture();
            next();
          }}
          disabled={!hasSteps || currentStepIndex >= lastIndex}
        >
          <SkipForward className="h-4 w-4" />
        </TransportButton>

        <div className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
          <span className="text-foreground">
            {hasSteps ? currentStepIndex + 1 : 0}
          </span>
          <span className="mx-1.5 opacity-50">/</span>
          {total}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span className="text-[9px] text-muted-foreground">Timeline</span>
        <Slider
          aria-label="Seek to step"
          min={0}
          max={lastIndex}
          step={1}
          value={[currentStepIndex]}
          onValueChange={(v) => seek(v[0] ?? 0)}
          disabled={!hasSteps}
          className="flex-1"
        />
      </div>
    </div>
  );
}
