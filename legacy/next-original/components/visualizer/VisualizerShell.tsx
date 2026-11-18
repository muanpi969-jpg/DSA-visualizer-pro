"use client";

import * as React from "react";
import { getAlgorithmBySlug } from "@/lib/algorithms/registry";
import {
  selectCurrentStep,
  selectPreviousStep,
  usePlaybackStore,
} from "@/lib/stores/usePlaybackStore";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import { useReducedMotion } from "@/lib/hooks/useReducedMotion";
import { useKeyboardShortcuts } from "@/lib/hooks/useKeyboardShortcuts";
import { useStepAudio } from "@/lib/hooks/useStepAudio";
import { getAudioEngine } from "@/lib/audio/VisualizationAudioEngine";
import { VisualizerToolbar } from "./VisualizerToolbar";
import { VisualizationViewport, type ViewportHandle } from "./VisualizationViewport";
import { CodeTracePanel } from "./CodeTracePanel";
import { InfoTabs } from "./InfoTabs";

export function VisualizerShell({ slug }: { slug: string }) {
  const definition = getAlgorithmBySlug(slug);

  const loadAlgorithm = usePlaybackStore((s) => s.loadAlgorithm);
  const togglePlay = usePlaybackStore((s) => s.togglePlay);
  const next = usePlaybackStore((s) => s.next);
  const previous = usePlaybackStore((s) => s.previous);
  const reset = usePlaybackStore((s) => s.reset);

  const step = usePlaybackStore(selectCurrentStep);
  const previousStep = usePlaybackStore(selectPreviousStep);
  const totalSteps = usePlaybackStore((s) => s.steps.length);
  const error = usePlaybackStore((s) => s.error);
  const loadedSlug = usePlaybackStore((s) => s.selectedAlgorithmSlug);

  const reducedMotion = useReducedMotion();
  const toggleMuted = usePreferencesStore((s) => s.toggleMuted);
  const isMuted = usePreferencesStore((s) => s.isMuted);

  const viewportRef = React.useRef<ViewportHandle>(null);

  // Load the algorithm's default input whenever the slug changes.
  React.useEffect(() => {
    if (!definition) return;
    loadAlgorithm(definition.slug, definition.defaultInput);
  }, [definition, loadAlgorithm]);

  useStepAudio(step, reducedMotion);

  const onToggleMute = React.useCallback(() => {
    const willUnmute = isMuted;
    toggleMuted();
    if (willUnmute) {
      // Keyboard press is a user gesture — safe to start the audio context.
      void getAudioEngine().ensureStarted();
    }
  }, [isMuted, toggleMuted]);

  const shortcutHandlers = React.useMemo(
    () => ({
      onTogglePlay: togglePlay,
      onNext: next,
      onPrevious: previous,
      onReset: reset,
      onToggleMute,
      onToggleFullscreen: () => viewportRef.current?.toggleFullscreen(),
    }),
    [togglePlay, next, previous, reset, onToggleMute],
  );
  useKeyboardShortcuts(shortcutHandlers);

  if (!definition) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <p className="text-muted-foreground">Algorithm not found.</p>
      </div>
    );
  }

  // Guard against showing another algorithm's steps for a frame after switching.
  const activeStep = loadedSlug === definition.slug ? step : undefined;
  const activePrev = loadedSlug === definition.slug ? previousStep : undefined;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 py-4">
      <VisualizerToolbar definition={definition} />

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(360px,460px)]">
        <VisualizationViewport
          ref={viewportRef}
          definition={definition}
          step={activeStep}
          previousStep={activePrev}
          reducedMotion={reducedMotion}
          error={error}
        />

        <div className="flex min-w-0 flex-col gap-4">
          <div className="h-[340px] overflow-hidden rounded-lg border bg-card lg:h-[380px]">
            <CodeTracePanel definition={definition} step={activeStep} />
          </div>
          <InfoTabs
            definition={definition}
            step={activeStep}
            totalSteps={totalSteps}
          />
        </div>
      </div>

      {/* Keyboard hint */}
      <p className="mt-4 text-center text-xs text-muted-foreground">
        Shortcuts: <kbd className="rounded border px-1">Space</kbd> play/pause ·{" "}
        <kbd className="rounded border px-1">←</kbd>/
        <kbd className="rounded border px-1">→</kbd> step ·{" "}
        <kbd className="rounded border px-1">R</kbd> reset ·{" "}
        <kbd className="rounded border px-1">M</kbd> mute ·{" "}
        <kbd className="rounded border px-1">F</kbd> fullscreen
      </p>
    </div>
  );
}
