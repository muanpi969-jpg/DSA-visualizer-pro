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
import {
  VisualizationViewport,
  type ViewportHandle,
} from "./VisualizationViewport";
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
  const truncated = usePlaybackStore((s) => s.truncated);
  const loadedSlug = usePlaybackStore((s) => s.selectedAlgorithmSlug);

  const reducedMotion = useReducedMotion();
  const toggleMuted = usePreferencesStore((s) => s.toggleMuted);
  const isMuted = usePreferencesStore((s) => s.isMuted);

  const viewportRef = React.useRef<ViewportHandle>(null);

  // Load the algorithm's default input whenever the slug changes.
  React.useEffect(() => {
    if (!definition) return;
    loadAlgorithm(definition.slug, definition.defaultInput);
    return () => usePlaybackStore.getState().cancelRun();
  }, [definition, loadAlgorithm]);

  React.useEffect(() => {
    const pauseWhenHidden = () => {
      if (document.hidden) usePlaybackStore.getState().pause();
    };
    document.addEventListener("visibilitychange", pauseWhenHidden);
    return () =>
      document.removeEventListener("visibilitychange", pauseWhenHidden);
  }, []);

  useStepAudio(step, reducedMotion);

  const onToggleMute = React.useCallback(() => {
    const willUnmute = isMuted;
    toggleMuted();
    if (willUnmute) {
      // Keyboard press is a user gesture — safe to start the audio context.
      void getAudioEngine().ensureStarted();
    }
  }, [isMuted, toggleMuted]);

  const startAudioFromGesture = React.useCallback(() => {
    if (!usePreferencesStore.getState().isMuted)
      void getAudioEngine().ensureStarted();
  }, []);

  const shortcutHandlers = React.useMemo(
    () => ({
      onTogglePlay: () => {
        startAudioFromGesture();
        togglePlay();
      },
      onNext: () => {
        startAudioFromGesture();
        next();
      },
      onPrevious: previous,
      onReset: reset,
      onToggleMute,
      onToggleFullscreen: () => viewportRef.current?.toggleFullscreen(),
    }),
    [togglePlay, next, previous, reset, onToggleMute, startAudioFromGesture],
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
    <div className="studio-content">
      <VisualizerToolbar definition={definition} />
      {truncated && loadedSlug === definition.slug && (
        <p
          role="status"
          className="mb-4 rounded-xl border border-viz-compare/20 bg-viz-compare/[.07] px-4 py-3 text-xs leading-relaxed text-muted-foreground"
        >
          This trace reached the recording budget. Try a smaller input to
          explore the complete run.
        </p>
      )}

      <div className="visualizer-workspace">
        <VisualizationViewport
          ref={viewportRef}
          definition={definition}
          step={activeStep}
          previousStep={activePrev}
          reducedMotion={reducedMotion}
          error={error}
        />

        <div className="inspector-stack">
          <div className="code-panel glass-panel">
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
      <p className="keyboard-shortcuts">
        A little quicker with keys&nbsp;&nbsp; <kbd>Space</kbd> play / pause
        &nbsp;·&nbsp; <kbd>←</kbd> <kbd>→</kbd> step &nbsp;·&nbsp; <kbd>R</kbd>{" "}
        reset &nbsp;·&nbsp; <kbd>M</kbd> audio &nbsp;·&nbsp; <kbd>F</kbd>{" "}
        fullscreen
      </p>
    </div>
  );
}
