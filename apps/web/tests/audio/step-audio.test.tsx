import { act, fireEvent, renderHook } from "@testing-library/react";
import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { useStepAudio } from "@/lib/hooks/useStepAudio";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import type { VisualizationStep } from "@/lib/algorithms/types";

const audio = vi.hoisted(() => ({
  play: vi.fn(),
  cancel: vi.fn(),
  setMuted: vi.fn(),
  setVolume: vi.fn(),
  ensureStarted: vi.fn(async () => {}),
}));
vi.mock("@/lib/audio/VisualizationAudioEngine", () => ({
  getAudioEngine: () => audio,
}));
vi.mock("@/lib/stores/usePlaybackStore", async () => {
  const { create } = await import("zustand");
  return {
    usePlaybackStore: create(() => ({
      runId: 1,
      transitionId: 1,
      transitionReason: "load",
      status: "ready",
    })),
  };
});

const compare: VisualizationStep = {
  id: "frame",
  index: 0,
  kind: "array",
  state: {},
  highlights: {},
  operation: "compare",
  metrics: {},
  code: { language: "typescript", activeLines: [] },
  note: "",
};
function transition(
  transitionId: number,
  transitionReason:
    | "load"
    | "forward"
    | "backward"
    | "seek"
    | "reset"
    | "replay"
    | "cancel"
    | "autoplay",
  extra: {
    runId?: number;
    status?: "paused" | "complete" | "playing" | "ready";
  } = {},
) {
  act(() =>
    usePlaybackStore.setState({ transitionId, transitionReason, ...extra }),
  );
}
beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  usePlaybackStore.setState({
    runId: 1,
    transitionId: 1,
    transitionReason: "load",
    status: "ready",
  });
  usePreferencesStore.setState({
    isMuted: false,
    volume: 0.6,
    reducedMotion: true,
  });
});
afterEach(() => vi.restoreAllMocks());

describe("transition-driven audio", () => {
  it("sounds repeated indices on fresh forward transitions even with reduced motion", () => {
    renderHook(() => useStepAudio(compare, true));
    expect(audio.play).not.toHaveBeenCalled();
    transition(2, "forward", { status: "paused" });
    transition(3, "autoplay", { status: "playing" });
    expect(audio.play).toHaveBeenCalledTimes(2);
    transition(4, "backward");
    transition(5, "seek");
    expect(audio.play).toHaveBeenCalledTimes(2);
    expect(audio.cancel).toHaveBeenCalled();
  });

  it("consumes muted transitions so unmuting cannot replay an old cue", () => {
    usePreferencesStore.setState({ isMuted: true });
    renderHook(() => useStepAudio(compare, false));
    transition(2, "forward");
    act(() => usePreferencesStore.getState().setMuted(false));
    expect(audio.play).not.toHaveBeenCalled();
    transition(3, "forward");
    expect(audio.play).toHaveBeenCalledOnce();
  });

  it("plays completion once per run and allows a new replay pass", () => {
    const complete = { ...compare, operation: "complete" };
    renderHook(() => useStepAudio(complete, false));
    transition(2, "forward", { status: "complete" });
    transition(3, "backward", { status: "paused" });
    transition(4, "forward", { status: "complete" });
    expect(audio.play).toHaveBeenCalledOnce();
    transition(5, "replay", { runId: 2, status: "playing" });
    transition(6, "autoplay", { status: "complete" });
    expect(audio.play).toHaveBeenCalledTimes(2);
  });

  it("cancels on visibility changes, reset, navigation, and unmount", () => {
    const hidden = vi.spyOn(document, "hidden", "get");
    const { unmount } = renderHook(() => useStepAudio(compare, false));
    audio.cancel.mockClear();
    hidden.mockReturnValue(true);
    fireEvent(document, new Event("visibilitychange"));
    expect(audio.cancel).toHaveBeenCalledOnce();
    transition(2, "forward");
    expect(audio.play).not.toHaveBeenCalled();
    hidden.mockReturnValue(false);
    transition(3, "reset", { runId: 2 });
    transition(4, "load", { runId: 3 });
    const count = audio.cancel.mock.calls.length;
    unmount();
    expect(audio.cancel).toHaveBeenCalledTimes(count + 1);
  });

  it("starts persisted unmuted audio only after a fresh pointer or keyboard gesture", () => {
    renderHook(() => useStepAudio(compare, false));
    expect(audio.ensureStarted).not.toHaveBeenCalled();
    fireEvent.pointerDown(document);
    expect(audio.ensureStarted).toHaveBeenCalledOnce();
    act(() => usePreferencesStore.getState().setMuted(true));
    fireEvent.keyDown(document, { key: " " });
    expect(audio.ensureStarted).toHaveBeenCalledOnce();
  });
});
