"use client";
import { create } from "zustand";
import type { VisualizationStep } from "@/lib/algorithms/types";
import { getAlgorithmBySlug } from "@/lib/algorithms/registry";
import { generateRun } from "@/lib/playback/generate";
import {
  DEFAULT_SPEED_MS,
  MIN_SPEED_MS,
  MAX_SPEED_MS,
} from "@/lib/playback/timing";
import { clamp } from "@/lib/utils";
export type PlaybackStatus =
  | "idle"
  | "generating"
  | "ready"
  | "playing"
  | "paused"
  | "complete"
  | "truncated"
  | "error";
export type TransitionReason =
  | "load"
  | "autoplay"
  | "forward"
  | "backward"
  | "seek"
  | "reset"
  | "replay"
  | "cancel";
export interface PlaybackState {
  status: PlaybackStatus;
  steps: VisualizationStep[];
  currentStepIndex: number;
  speedMs: number;
  selectedAlgorithmSlug: string | null;
  selectedInput: unknown;
  error: string | null;
  truncated: boolean;
  runId: number;
  transitionId: number;
  transitionReason: TransitionReason;
  loadAlgorithm: (slug: string, input: unknown) => void;
  cancelRun: () => void;
  play: () => void;
  pause: () => void;
  togglePlay: () => void;
  reset: () => void;
  next: () => void;
  previous: () => void;
  seek: (index: number) => void;
  setSpeed: (ms: number) => void;
}
let timer: ReturnType<typeof setTimeout> | null = null;
let cancelGeneration: (() => void) | null = null;
const clearTimer = () => {
  if (timer !== null) clearTimeout(timer);
  timer = null;
};
const clearGeneration = () => {
  cancelGeneration?.();
  cancelGeneration = null;
};
export const usePlaybackStore = create<PlaybackState>((set, get) => {
  const transition = (
    reason: TransitionReason,
    patch: Partial<PlaybackState>,
  ) =>
    set((state) => ({
      ...patch,
      transitionReason: reason,
      transitionId: state.transitionId + 1,
    }));
  const endStatus = () =>
    get().truncated ? ("truncated" as const) : ("complete" as const);
  const scheduleTick = () => {
    clearTimer();
    const expectedRun = get().runId;
    timer = setTimeout(() => {
      const state = get();
      if (state.status !== "playing" || state.runId !== expectedRun) return;
      const index = Math.min(
        state.currentStepIndex + 1,
        state.steps.length - 1,
      );
      const final = index >= state.steps.length - 1;
      transition("autoplay", {
        currentStepIndex: index,
        status: final ? endStatus() : "playing",
      });
      if (!final) scheduleTick();
      else clearTimer();
    }, get().speedMs);
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
    runId: 0,
    transitionId: 0,
    transitionReason: "load",
    loadAlgorithm: (slug, input) => {
      clearTimer();
      clearGeneration();
      const runId = get().runId + 1;
      transition("load", {
        runId,
        selectedAlgorithmSlug: slug,
        selectedInput: input,
        steps: [],
        currentStepIndex: 0,
        truncated: false,
        error: null,
        status: "generating",
      });
      const fail = (message: string) => {
        if (get().runId === runId)
          set({ status: "error", error: message, steps: [] });
      };
      try {
        const definition = getAlgorithmBySlug(slug);
        if (!definition) {
          fail(`Unknown algorithm: ${slug}`);
          return;
        }
        const validation = definition.validateInput(input);
        if (!validation.ok) {
          fail(validation.message);
          return;
        }
        cancelGeneration = generateRun(
          { runId, slug, input },
          definition,
          (result) => {
            if (get().runId !== runId) return;
            if (!result.steps.length) {
              fail("No usable frames. Reduce the input and try again.");
              return;
            }
            set({
              steps: result.steps,
              truncated: result.truncated,
              status: "ready",
              error: null,
            });
          },
          fail,
        );
      } catch (error) {
        fail(error instanceof Error ? error.message : "Invalid input.");
      }
    },
    cancelRun: () => {
      clearTimer();
      clearGeneration();
      transition("cancel", {
        runId: get().runId + 1,
        status: "idle",
        steps: [],
        currentStepIndex: 0,
        error: null,
        truncated: false,
      });
    },
    play: () => {
      const state = get();
      if (
        !state.steps.length ||
        state.status === "generating" ||
        state.status === "error"
      )
        return;
      if (state.currentStepIndex >= state.steps.length - 1)
        transition("replay", { currentStepIndex: 0, status: "playing" });
      else set({ status: "playing" });
      scheduleTick();
    },
    pause: () => {
      clearTimer();
      if (get().status === "playing") set({ status: "paused" });
    },
    togglePlay: () =>
      get().status === "playing" ? get().pause() : get().play(),
    reset: () => {
      clearTimer();
      transition("reset", {
        currentStepIndex: 0,
        status: get().steps.length
          ? "ready"
          : get().status === "generating"
            ? "generating"
            : "idle",
      });
    },
    next: () => {
      clearTimer();
      const state = get();
      if (!state.steps.length) return;
      const index = Math.min(
        state.currentStepIndex + 1,
        state.steps.length - 1,
      );
      if (index === state.currentStepIndex) return;
      transition("forward", {
        currentStepIndex: index,
        status: index === state.steps.length - 1 ? endStatus() : "paused",
      });
    },
    previous: () => {
      clearTimer();
      const state = get();
      if (!state.steps.length) return;
      transition("backward", {
        currentStepIndex: Math.max(0, state.currentStepIndex - 1),
        status: "paused",
      });
    },
    seek: (index) => {
      clearTimer();
      const state = get();
      if (!state.steps.length || !Number.isFinite(index)) return;
      const target = clamp(Math.round(index), 0, state.steps.length - 1);
      transition("seek", {
        currentStepIndex: target,
        status: target === state.steps.length - 1 ? endStatus() : "paused",
      });
    },
    setSpeed: (ms) => {
      if (!Number.isFinite(ms)) return;
      set({ speedMs: clamp(ms, MIN_SPEED_MS, MAX_SPEED_MS) });
      if (get().status === "playing") scheduleTick();
    },
  };
});
export const selectCurrentStep = (state: PlaybackState) =>
  state.steps[state.currentStepIndex];
export const selectPreviousStep = (state: PlaybackState) =>
  state.currentStepIndex > 0
    ? state.steps[state.currentStepIndex - 1]
    : undefined;
