import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { DEFAULT_SPEED_MS } from "@/lib/playback/timing";

const store = usePlaybackStore;
const SLUG = "bubble-sort";
const INPUT = { array: [3, 1, 2] };

function load() {
  store.getState().loadAlgorithm(SLUG, INPUT);
}

beforeEach(() => {
  store.getState().pause();
  store.setState({
    status: "idle",
    steps: [],
    currentStepIndex: 0,
    speedMs: DEFAULT_SPEED_MS,
    selectedAlgorithmSlug: null,
    selectedInput: null,
    error: null,
    truncated: false,
  });
});

afterEach(() => {
  store.getState().pause();
  vi.useRealTimers();
});

describe("loadAlgorithm", () => {
  it("loads steps and becomes ready at index 0", () => {
    load();
    const s = store.getState();
    expect(s.status).toBe("ready");
    expect(s.steps.length).toBeGreaterThan(0);
    expect(s.currentStepIndex).toBe(0);
    expect(s.error).toBeNull();
  });

  it("reports an error for invalid input", () => {
    store.getState().loadAlgorithm(SLUG, { array: [1, Number.NaN] });
    const s = store.getState();
    expect(s.status).toBe("error");
    expect(s.error).toBeTruthy();
    expect(s.steps).toHaveLength(0);
  });

  it("reports an error for an unknown algorithm", () => {
    store.getState().loadAlgorithm("does-not-exist", INPUT);
    expect(store.getState().status).toBe("error");
  });
});

describe("stepping", () => {
  beforeEach(load);

  it("next advances and clamps at the last step", () => {
    const last = store.getState().steps.length - 1;
    for (let i = 0; i < last + 5; i++) store.getState().next();
    expect(store.getState().currentStepIndex).toBe(last);
    expect(store.getState().status).toBe("complete");
  });

  it("previous rewinds and clamps at 0", () => {
    store.getState().seek(2);
    store.getState().previous();
    expect(store.getState().currentStepIndex).toBe(1);
    for (let i = 0; i < 10; i++) store.getState().previous();
    expect(store.getState().currentStepIndex).toBe(0);
  });

  it("seek clamps out-of-range indexes", () => {
    store.getState().seek(9999);
    expect(store.getState().currentStepIndex).toBe(
      store.getState().steps.length - 1,
    );
    store.getState().seek(-5);
    expect(store.getState().currentStepIndex).toBe(0);
  });

  it("reset returns to the first step", () => {
    store.getState().seek(2);
    store.getState().reset();
    expect(store.getState().currentStepIndex).toBe(0);
    expect(store.getState().status).toBe("ready");
  });
});

describe("autoplay", () => {
  beforeEach(load);

  it("plays through to completion and then stops", () => {
    vi.useFakeTimers();
    store.getState().setSpeed(40);
    store.getState().play();
    expect(store.getState().status).toBe("playing");

    const total = store.getState().steps.length;
    vi.advanceTimersByTime(40 * (total + 3));

    expect(store.getState().currentStepIndex).toBe(total - 1);
    expect(store.getState().status).toBe("complete");
  });

  it("pause halts progress", () => {
    vi.useFakeTimers();
    store.getState().setSpeed(40);
    store.getState().play();
    vi.advanceTimersByTime(45); // ~1 step
    store.getState().pause();
    const frozen = store.getState().currentStepIndex;
    vi.advanceTimersByTime(500);
    expect(store.getState().currentStepIndex).toBe(frozen);
    expect(store.getState().status).toBe("paused");
  });

  it("replays from the start when play is pressed on the final step", () => {
    store.getState().seek(store.getState().steps.length - 1);
    expect(store.getState().status).toBe("complete");
    store.getState().play();
    expect(store.getState().currentStepIndex).toBe(0);
    expect(store.getState().status).toBe("playing");
    store.getState().pause();
  });
});

describe("setSpeed", () => {
  it("clamps to a sane range", () => {
    store.getState().setSpeed(999999);
    expect(store.getState().speedMs).toBe(2000);
    store.getState().setSpeed(0);
    expect(store.getState().speedMs).toBe(40);
  });
});
