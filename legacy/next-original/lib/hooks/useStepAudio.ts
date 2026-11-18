"use client";

import { useEffect, useRef } from "react";
import { getAudioEngine } from "@/lib/audio/VisualizationAudioEngine";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import type { VisualizationStep } from "@/lib/algorithms/types";

/**
 * Plays the active step's audio cue when the step changes. Audio only fires
 * after the user has started the engine (a gesture) and while unmuted, so it
 * never violates autoplay rules and never blocks playback.
 */
export function useStepAudio(
  step: VisualizationStep | undefined,
  reducedMotion: boolean,
): void {
  const isMuted = usePreferencesStore((s) => s.isMuted);
  const volume = usePreferencesStore((s) => s.volume);
  const lastPlayedIndex = useRef<number>(-1);

  // Keep the engine's mute/volume in sync with preferences.
  useEffect(() => {
    const engine = getAudioEngine();
    engine.setMuted(isMuted);
    engine.setVolume(volume);
  }, [isMuted, volume]);

  useEffect(() => {
    if (!step || isMuted || reducedMotion) return;
    if (!step.audio) return;
    if (step.index === lastPlayedIndex.current) return;
    lastPlayedIndex.current = step.index;
    getAudioEngine().play(step.audio);
  }, [step, isMuted, reducedMotion]);
}
