import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { VisualizationAudioEngine } from "@/lib/audio/VisualizationAudioEngine";
import { getStepAudioCue } from "@/lib/audio/semanticCue";
import { cue, valueToFrequency } from "@/lib/audio/cue";
import type { VisualizationStep } from "@/lib/algorithms/types";

class Parameter {
  value = 0;
  setValueAtTime = vi.fn();
  setTargetAtTime = vi.fn();
  exponentialRampToValueAtTime = vi.fn();
}
class Node {
  connect = vi.fn();
  disconnect = vi.fn();
  gain = new Parameter();
  frequency = new Parameter();
  Q = new Parameter();
  pan = new Parameter();
  threshold = new Parameter();
  knee = new Parameter();
  ratio = new Parameter();
  attack = new Parameter();
  release = new Parameter();
  type = "sine";
  onended: (() => void) | null = null;
  start = vi.fn();
  stop = vi.fn();
  finish() {
    this.onended?.();
  }
}
class Context {
  static instances: Context[] = [];
  static suspended = false;
  currentTime = 0;
  state = Context.suspended ? "suspended" : "running";
  destination = new Node();
  oscillators: Node[] = [];
  resume = vi.fn(async () => {
    this.state = "running";
  });
  close = vi.fn(async () => {
    this.state = "closed";
  });
  createGain = () => new Node();
  createDynamicsCompressor = () => new Node();
  createBiquadFilter = () => new Node();
  createStereoPanner = () => new Node();
  createOscillator = () => {
    const node = new Node();
    this.oscillators.push(node);
    return node;
  };
  constructor() {
    Context.instances.push(this);
  }
}

let engine: VisualizationAudioEngine;
beforeEach(() => {
  Context.instances = [];
  Context.suspended = false;
  vi.stubGlobal("AudioContext", Context);
  vi.spyOn(document, "hidden", "get").mockReturnValue(false);
  engine = new VisualizationAudioEngine();
});
afterEach(() => {
  engine.dispose();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});
async function start() {
  await engine.ensureStarted();
  engine.setMuted(false);
  return Context.instances[0];
}

describe("audio lifecycle and budgets", () => {
  it("does not create a context until a gesture starts it and stays muted by default", async () => {
    engine.play(cue.compare(440));
    expect(Context.instances).toHaveLength(0);
    await engine.ensureStarted();
    const context = Context.instances[0];
    engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(0);
    engine.setMuted(false);
    engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(1);
    expect(context.oscillators[0].stop.mock.calls[0][0]).toBeCloseTo(0.09);
  });

  it("caps concurrent voices and lets completion replace all scheduled regular notes", async () => {
    const context = await start();
    for (let i = 0; i < 12; i++) engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(8);
    engine.play(cue.success());
    expect(context.oscillators).toHaveLength(12);
    for (const oscillator of context.oscillators.slice(0, 8)) {
      expect(oscillator.stop).toHaveBeenLastCalledWith(0);
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
    }
    engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(12);
  });

  it("allows at most 20 regular cues per rolling second even when each voice ends", async () => {
    const context = await start();
    for (let i = 0; i < 30; i++) {
      context.currentTime = i * 0.02;
      engine.play(cue.compare(440));
      context.oscillators.at(-1)?.finish();
    }
    expect(context.oscillators).toHaveLength(20);
    context.currentTime = 1.01;
    engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(21);
  });

  it("mute cancels future chord notes and disconnects their graph immediately", async () => {
    const context = await start();
    engine.play(cue.success());
    expect(context.oscillators[3].start).toHaveBeenCalledWith(0.07);
    engine.setMuted(true);
    for (const oscillator of context.oscillators) {
      expect(oscillator.stop).toHaveBeenLastCalledWith(0);
      expect(oscillator.disconnect).toHaveBeenCalledOnce();
    }
    engine.setMuted(false);
    engine.play(cue.compare(440));
    expect(context.oscillators).toHaveLength(5);
  });

  it("does not throw when audio construction or resuming is blocked", async () => {
    vi.stubGlobal(
      "AudioContext",
      class {
        constructor() {
          throw new Error("blocked");
        }
      },
    );
    await expect(engine.ensureStarted()).resolves.toBe(false);
    expect(engine.getUnavailableMessage()).toMatch(/Allow audio/);
    vi.stubGlobal("AudioContext", Context);
    Context.suspended = true;
    const pending = engine.ensureStarted();
    await pending;
    expect(Context.instances[0].resume).toHaveBeenCalledOnce();
    engine.dispose();
    Context.instances[0].resume.mockRejectedValueOnce(new Error("policy"));
    // A failed context may be retried by a later gesture.
    vi.stubGlobal(
      "AudioContext",
      class extends Context {
        resume = vi.fn(async () => {
          throw new Error("policy");
        });
      },
    );
    await expect(engine.ensureStarted()).resolves.toBe(false);
    expect(Context.instances.at(-1)?.close).toHaveBeenCalledOnce();
  });

  it("shares one startup when a pointer gesture and its click both request audio", async () => {
    Context.suspended = true;
    const first = engine.ensureStarted();
    const second = engine.ensureStarted();
    expect(first).toBe(second);
    await expect(first).resolves.toBe(true);
    expect(Context.instances).toHaveLength(1);
    expect(Context.instances[0].resume).toHaveBeenCalledOnce();
  });

  it("synthesizes two soft tones for node and edge cues and suppresses hidden-tab audio", async () => {
    const context = await start();
    engine.play({ kind: "visit", frequency: 330 });
    engine.play({ kind: "relax", frequency: 440 });
    expect(context.oscillators).toHaveLength(4);
    expect(context.oscillators[3].start).toHaveBeenCalledWith(0.025);
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    engine.play(cue.success());
    expect(context.oscillators).toHaveLength(4);
  });

  it("releases a partially constructed voice if the browser loses its audio device", async () => {
    const context = await start();
    context.createBiquadFilter = () => {
      throw new Error("device unavailable");
    };
    expect(() => engine.play(cue.compare(440))).not.toThrow();
    expect(context.oscillators[0].stop).toHaveBeenLastCalledWith(0);
    expect(context.oscillators[0].disconnect).toHaveBeenCalledOnce();
  });

  it("plays an audible-length two-note preview while paused and respects zero volume", async () => {
    const context = await start();
    expect(engine.playPreview()).toBe(true);
    expect(context.oscillators).toHaveLength(2);
    expect(context.oscillators[1].start).toHaveBeenCalledWith(0.09);
    expect(context.oscillators[1].stop).toHaveBeenCalledWith(0.185);
    engine.setVolume(0);
    expect(engine.playPreview()).toBe(false);
    expect(context.oscillators).toHaveLength(2);
  });

  it("reports unsupported audio and can recover on a later supported gesture", async () => {
    const listener = vi.fn();
    const unsubscribe = engine.subscribeAvailability(listener);
    vi.stubGlobal("AudioContext", undefined);
    await expect(engine.ensureStarted()).resolves.toBe(false);
    expect(engine.getUnavailableMessage()).toMatch(/Web Audio support/);
    expect(listener).toHaveBeenCalledWith(
      expect.stringContaining("Web Audio support"),
    );
    vi.stubGlobal("AudioContext", Context);
    await expect(engine.ensureStarted()).resolves.toBe(true);
    expect(engine.getUnavailableMessage()).toBeNull();
    expect(listener).toHaveBeenLastCalledWith(null);
    unsubscribe();
  });
});

it("maps extreme finite data monotonically without overflowing pitch arithmetic", () => {
  const pitches = [-1e308, -5e307, 0, 5e307, 1e308].map((value) =>
    valueToFrequency(value, -1e308, 1e308),
  );
  expect(pitches.every(Number.isFinite)).toBe(true);
  expect(pitches).toEqual([...pitches].sort((a, b) => a - b));
  expect(new Set(pitches).size).toBe(5);
  expect(pitches[0]).toBe(220);
  expect(pitches.at(-1)).toBe(880);
});

function step(
  operation: string,
  state: unknown = {},
  kind: VisualizationStep["kind"] = "graph",
): VisualizationStep {
  return {
    id: "test",
    index: 0,
    kind,
    state,
    operation,
    highlights: {},
    code: { language: "typescript", activeLines: [] },
    metrics: {},
    note: "",
  };
}

describe("semantic sound mapping", () => {
  it("preserves explicit cues, including a search miss rather than a success chord", () => {
    const explicit = cue.error();
    expect(getStepAudioCue({ ...step("complete"), audio: explicit })).toBe(
      explicit,
    );
    expect(getStepAudioCue(step("init"))).toBeUndefined();
  });
  it("maps graph depth, traversal, pointer changes, and table writes centrally", () => {
    expect(
      getStepAudioCue(step("visit", { depth: 8 }))?.frequency,
    ).toBeGreaterThan(getStepAudioCue(step("visit", { depth: 1 }))!.frequency!);
    expect(getStepAudioCue(step("traverse-edge"))?.kind).toBe("relax");
    expect(getStepAudioCue(step("wire-pointer"))?.variant).toBe("pointer");
    expect(
      getStepAudioCue(step("write", { cellValue: 3 }, "matrix"))?.variant,
    ).toBe("table");
    expect(getStepAudioCue(step("complete"))?.kind).toBe("success");
  });
});
