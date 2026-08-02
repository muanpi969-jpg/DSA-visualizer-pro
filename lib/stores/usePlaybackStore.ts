"use client";

import { create } from "zustand";
import type { VisualizationStep } from "@/lib/algorithms/types";
import { getAlgorithmBySlug } from "@/lib/algorithms/registry";
import { buildSteps } from "@/lib/playback/buildSteps";
import { DEFAULT_SPEED_MS } from "@/lib/playback/timing";
import { clamp } from "@/lib/utils";

export type PlaybackStatus =
  | "idle"
  | "ready"
  | "playing"
  | "paused"
  | "complete"
  | "error";

interface PlaybackState {
  status: PlaybackStatus;
  steps: VisualizationStep[];
  currentStepIndex: number;
  speedMs: number;
  selectedAlgorithmSlug: string | null;
  selectedInput: unknown;
  error: string | null;
  truncated: boolean;

  loadAlgorithm: (slug: string, input: unknown) => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  reset: () => void;
  next: () => void;
  previous: () => void;
  seek: (index: number) => void;
  setSpeed: (ms: number) => void;
}

/**
 * The playback store owns timeline behavior only. It never knows the details of
 * any specific algorithm or renderer. A single module-scoped timer drives
 * autoplay and is always cleaned up before a new one is scheduled.
 */
let timer: ReturnType<typeof setTimeout> | null = null;

function clearTimer() {
  if (timer !== null) {
    clearTimeout(timer);
    timer = null;
  }
}

export const usePlaybackStore = create<PlaybackState>((set, get) => {
  const scheduleTick = () => {
    clearTimer();
    const { speedMs } = get();
    timer = setTimeout(() => {
      const { status, currentStepIndex, steps } = get();
      if (status !== "playing") {
        clearTimer();
        return;
      }
      const lastIndex = steps.length - 1;
      const nextIndex = currentStepIndex + 1;
      if (nextIndex >= lastIndex) {
        set({ currentStepIndex: lastIndex, status: "complete" });
        clearTimer();
        return;
      }
      set({ currentStepIndex: nextIndex });
      scheduleTick();
    }, speedMs);
  };

  return {
    status: "idle",
    steps: [],
    currentStepIndex: 0,
    speedMs: DEFAULT_SPEED_MS,
    selectedAlgorithmSlug: null,
    selectedInput: null,
    error: null,
    truncated: false,

    loadAlgorithm: (slug, input) => {
      clearTimer();
      const definition = getAlgorithmBySlug(slug);
      if (!definition) {
        set({
          status: "error",
          error: `Unknown algorithm: ${slug}`,
          steps: [],
          currentStepIndex: 0,
          selectedAlgorithmSlug: slug,
          selectedInput: input,
          truncated: false,
        });
        return;
      }

      const validation = definition.validateInput(input);
      if (!validation.ok) {
        set({
          status: "error",
          error: validation.message,
          steps: [],
          currentStepIndex: 0,
          selectedAlgorithmSlug: slug,
          selectedInput: input,
          truncated: false,
        });
        return;
      }

      try {
        const { steps, truncated } = buildSteps(definition, input);
        set({
          status: "ready",
          steps,
          currentStepIndex: 0,
          selectedAlgorithmSlug: slug,
          selectedInput: input,
          error: null,
          truncated,
        });
      } catch (err) {
        set({
          status: "error",
          error: err instanceof Error ? err.message : "Failed to generate steps.",
          steps: [],
          currentStepIndex: 0,
          selectedAlgorithmSlug: slug,
          selectedInput: input,
          truncated: false,
        });
      }
    },

    play: () => {
      const { steps, currentStepIndex } = get();
      if (steps.length === 0) return;
      const lastIndex = steps.length - 1;
      // Replay from the start if we are sitting on the final step.
      if (currentStepIndex >= lastIndex) {
        set({ currentStepIndex: 0 });
      }
      set({ status: "playing" });
      scheduleTick();
    },

    pause: () => {
      clearTimer();
      const { status } = get();
      if (status === "playing") {
        set({ status: "paused" });
      }
    },

    togglePlay: () => {
      const { status } = get();
      if (status === "playing") {
        get().pause();
      } else {
        get().play();
      }
    },

    reset: () => {
      clearTimer();
      const { steps } = get();
      set({
        currentStepIndex: 0,
        status: steps.length > 0 ? "ready" : "idle",
      });
    },

    next: () => {
      clearTimer();
      const { steps, currentStepIndex } = get();
      if (steps.length === 0) return;
      const lastIndex = steps.length - 1;
      const nextIndex = clamp(currentStepIndex + 1, 0, lastIndex);
      set({
        currentStepIndex: nextIndex,
        status: nextIndex >= lastIndex ? "complete" : "paused",
      });
    },

    previous: () => {
      clearTimer();
      const { steps, currentStepIndex } = get();
      if (steps.length === 0) return;
      const lastIndex = steps.length - 1;
      const prevIndex = clamp(currentStepIndex - 1, 0, lastIndex);
      set({
        currentStepIndex: prevIndex,
        status: "paused",
      });
    },

    seek: (index) => {
      clearTimer();
      const { steps } = get();
      if (steps.length === 0) return;
      const lastIndex = steps.length - 1;
      const clamped = clamp(Math.round(index), 0, lastIndex);
      set({
        currentStepIndex: clamped,
        status: clamped >= lastIndex ? "complete" : "paused",
      });
    },

    setSpeed: (ms) => {
      set({ speedMs: clamp(ms, 1, 5000) });
      // If currently playing, reschedule so the new speed applies immediately.
      if (get().status === "playing") {
        scheduleTick();
      }
    },
  };
});

/** Narrow selector for the active step (avoids re-rendering on unrelated state). */
export function selectCurrentStep(
  state: PlaybackState,
): VisualizationStep | undefined {
  return state.steps[state.currentStepIndex];
}

export function selectPreviousStep(
  state: PlaybackState,
): VisualizationStep | undefined {
  return state.currentStepIndex > 0
    ? state.steps[state.currentStepIndex - 1]
    : undefined;
}
