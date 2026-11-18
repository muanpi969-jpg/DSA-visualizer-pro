import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildSteps } from "@/lib/playback/buildSteps";
import { getAlgorithmBySlug } from "@/lib/algorithms/registry";
import { usePlaybackStore as store } from "@/lib/stores/usePlaybackStore";
import type {
  GenerationRequest,
  GenerationResponse,
} from "@/lib/playback/protocol";
class FakeWorker {
  static instances: FakeWorker[] = [];
  onmessage: ((event: MessageEvent<GenerationResponse>) => void) | null = null;
  onerror: ((event: ErrorEvent) => void) | null = null;
  onmessageerror: (() => void) | null = null;
  request!: GenerationRequest;
  terminated = false;
  constructor() {
    FakeWorker.instances.push(this);
  }
  postMessage(request: GenerationRequest) {
    this.request = request;
  }
  terminate() {
    this.terminated = true;
  }
  finish() {
    const def = getAlgorithmBySlug(this.request.slug)!;
    this.onmessage?.({
      data: {
        runId: this.request.runId,
        ok: true,
        result: buildSteps(def, this.request.input),
      },
    } as MessageEvent<GenerationResponse>);
  }
}
beforeEach(() => {
  store.getState().cancelRun();
  FakeWorker.instances = [];
});
afterEach(() => {
  store.getState().cancelRun();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
describe("bounded generation", () => {
  it("checks frame limit before retaining an extra frame, distinguishing exact completion", () => {
    const def = getAlgorithmBySlug("bubble-sort")!;
    const all = buildSteps(def, { array: [2, 1] });
    expect(
      buildSteps(
        def,
        { array: [2, 1] },
        { maxSteps: all.steps.length, maxBytes: 1e6 },
      ).truncated,
    ).toBe(false);
    const limited = buildSteps(
      def,
      { array: [2, 1] },
      { maxSteps: 2, maxBytes: 1e6 },
    );
    expect(limited.steps).toHaveLength(2);
    expect(limited.truncated).toBe(true);
  });
  it("measures UTF-8 trace size and bounds bytes before appending", () => {
    const def = getAlgorithmBySlug("bubble-sort")!;
    const result = buildSteps(def, { array: [2, 1] });
    expect(result.bytes).toBe(
      new TextEncoder().encode(JSON.stringify(result.steps)).byteLength,
    );
    const limited = buildSteps(
      def,
      { array: [2, 1] },
      { maxSteps: 100, maxBytes: result.bytes - 1 },
    );
    expect(limited.truncated).toBe(true);
    expect(limited.bytes).toBeLessThan(result.bytes);
  });
  it("retains independent traces without caching consumer mutations", () => {
    const def = getAlgorithmBySlug("bubble-sort")!;
    const first = buildSteps(def, { array: [2, 1] });
    (first.steps[0].state as { items: { value: number }[] }).items[0].value =
      999;
    const second = buildSteps(def, { array: [2, 1] });
    expect(
      (second.steps[0].state as { items: { value: number }[] }).items[0].value,
    ).toBe(2);
  });
});
describe("worker lifecycle", () => {
  beforeEach(() => vi.stubGlobal("Worker", FakeWorker));
  it("waits for worker, terminates superseded work, and ignores stale responses", () => {
    store.getState().loadAlgorithm("bubble-sort", { array: [2, 1] });
    expect(store.getState().status).toBe("generating");
    const old = FakeWorker.instances[0];
    store.getState().loadAlgorithm("linear-search", { array: [4], target: 4 });
    expect(old.terminated).toBe(true);
    old.finish();
    expect(store.getState().status).toBe("generating");
    FakeWorker.instances[1].finish();
    expect(store.getState().status).toBe("ready");
    expect(store.getState().selectedAlgorithmSlug).toBe("linear-search");
  });
  it("cancels on unmount and handles failures visibly", () => {
    store.getState().loadAlgorithm("bubble-sort", { array: [2, 1] });
    const worker = FakeWorker.instances[0];
    store.getState().cancelRun();
    worker.finish();
    expect(store.getState().status).toBe("idle");
    expect(store.getState().steps).toEqual([]);
    store.getState().loadAlgorithm("bubble-sort", { array: [2, 1] });
    FakeWorker.instances[1].onmessageerror?.();
    expect(store.getState().status).toBe("error");
    expect(store.getState().error).toMatch(/unreadable/);
  });
});
describe("transition intent", () => {
  it("keeps truncated playback distinct from completion", () => {
    store.getState().loadAlgorithm("bubble-sort", { array: [2, 1] });
    store.setState({ truncated: true });
    store.getState().seek(9999);
    expect(store.getState().status).toBe("truncated");
  });
  it("records silent rewind/reset and forward/replay intent", () => {
    store.getState().loadAlgorithm("bubble-sort", { array: [2, 1] });
    store.getState().next();
    expect(store.getState().transitionReason).toBe("forward");
    store.getState().previous();
    expect(store.getState().transitionReason).toBe("backward");
    const frames = store.getState().steps;
    store.getState().reset();
    expect(store.getState().steps).toBe(frames);
    expect(store.getState().transitionReason).toBe("reset");
    store.getState().seek(9999);
    store.getState().play();
    expect(store.getState().transitionReason).toBe("replay");
  });
});
