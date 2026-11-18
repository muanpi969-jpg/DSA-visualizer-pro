"use client";

import { useEffect, useRef } from "react";
import { getAudioEngine } from "@/lib/audio/VisualizationAudioEngine";
import { getStepAudioCue } from "@/lib/audio/semanticCue";
import { cue } from "@/lib/audio/cue";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import type { VisualizationStep } from "@/lib/algorithms/types";

/** Sound follows forward transitions, independently of visual motion settings. */
export function useStepAudio(
  step: VisualizationStep | undefined,
  _reducedMotion: boolean,
): void {
  const isMuted = usePreferencesStore((s) => s.isMuted);
  const volume = usePreferencesStore((s) => s.volume);
  const runId = usePlaybackStore((s) => s.runId);
  const transitionId = usePlaybackStore((s) => s.transitionId);
  const reason = usePlaybackStore((s) => s.transitionReason);
  const status = usePlaybackStore((s) => s.status);
  const lastTransition = useRef<string | null>(null);
  const lastRun = useRef(runId);
  const completedRun = useRef<number | null>(null);
  const previousStatus = useRef(status);

  useEffect(() => {
    const engine = getAudioEngine();
    engine.setMuted(isMuted);
    engine.setVolume(volume);
  }, [isMuted, volume]);

  useEffect(() => {
    const engine = getAudioEngine();
    const transition = `${runId}:${transitionId}`;
    const firstObservation = lastTransition.current === null;
    if (lastRun.current !== runId) {
      engine.cancel();
      completedRun.current = null;
      lastRun.current = runId;
    }
    if (lastTransition.current === transition) {
      if (previousStatus.current === "playing" && status === "paused")
        engine.cancel();
      previousStatus.current = status;
      return;
    }
    lastTransition.current = transition;
    previousStatus.current = status;

    if (reason !== "autoplay" && reason !== "forward") {
      engine.cancel();
      if (reason === "reset" || reason === "replay" || reason === "load")
        completedRun.current = null;
      return;
    }
    if (
      status === "generating" ||
      status === "truncated" ||
      status === "error" ||
      status === "idle"
    ) {
      engine.cancel();
      return;
    }
    // Observing while muted/hidden still consumes the transition: unmuting or
    // returning to the tab never replays an old event or completion chord.
    if (firstObservation || !step || isMuted || document.hidden) return;
    const audio =
      getStepAudioCue(step) ??
      (status === "complete" ? cue.success() : undefined);
    if (!audio) return;
    const complete = audio.kind === "success" || step.operation === "complete";
    if (complete) {
      if (completedRun.current === runId) return;
      completedRun.current = runId;
    }
    engine.play(audio);
  }, [step, runId, transitionId, reason, status, isMuted]);

  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) getAudioEngine().cancel();
    };
    // Persisted unmuted preferences still require a fresh browser gesture.
    const onGesture = () => {
      if (!usePreferencesStore.getState().isMuted)
        void getAudioEngine().ensureStarted();
    };
    document.addEventListener("visibilitychange", onVisibility);
    document.addEventListener("pointerdown", onGesture, true);
    document.addEventListener("keydown", onGesture, true);
    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      document.removeEventListener("pointerdown", onGesture, true);
      document.removeEventListener("keydown", onGesture, true);
      getAudioEngine().cancel();
    };
  }, []);
}
