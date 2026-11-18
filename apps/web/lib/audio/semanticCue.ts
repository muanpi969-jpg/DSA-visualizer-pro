import type { VisualizationStep } from "@/lib/algorithms/types";
import { cue, valueToFrequency } from "@/lib/audio/cue";
import type { SynthesizedCue } from "@/lib/audio/VisualizationAudioEngine";

function record(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object"
    ? (value as Record<string, unknown>)
    : {};
}

function finite(...values: unknown[]): number | undefined {
  return values.find(
    (value): value is number =>
      typeof value === "number" && Number.isFinite(value),
  );
}

/** One audio policy for every renderer; explicit algorithm cues remain authoritative. */
export function getStepAudioCue(
  step: VisualizationStep,
): SynthesizedCue | undefined {
  if (step.audio) {
    if (step.audio.kind === "write" && step.kind === "linked-list")
      return { ...step.audio, variant: "pointer" };
    if (step.audio.kind === "write" && step.kind === "matrix")
      return { ...step.audio, variant: "table" };
    return step.audio;
  }
  const operation = (step.operation ?? "").toLowerCase();
  if (!operation || operation === "init") return;
  if (/^(complete|success|done)$/.test(operation)) return cue.success();

  const state = record(step.state);
  const highlights = record(step.highlights);
  const depth =
    finite(state.depth, highlights.depth, step.metrics.recursionDepth) ?? 0;
  const value = finite(
    state.cellValue,
    state.keyValue,
    state.value,
    highlights.value,
  );
  const frequency =
    value === undefined
      ? valueToFrequency(depth, 0, 12)
      : valueToFrequency(value, 0, Math.max(100, Math.abs(value)));

  if (/traverse|edge|relax/.test(operation))
    return { kind: "relax", frequency, gain: 0.16 };
  if (/visit|discover|dequeue/.test(operation))
    return { kind: "visit", frequency, gain: 0.18 };
  if (
    /pointer|link|allocate/.test(operation) ||
    (step.kind === "linked-list" && operation === "advance")
  ) {
    return { ...cue.write(frequency), variant: "pointer" };
  }
  if (operation === "backtrack")
    return { kind: "backtrack", frequency, durationMs: 45, gain: 0.12 };
  if (/compare|probe/.test(operation)) return cue.compare(frequency);
  if (/swap/.test(operation)) return cue.swap(frequency);
  if (
    /write|update|choose|carry|insert|shift|push|pop|enqueue/.test(operation)
  ) {
    return {
      ...cue.write(frequency),
      variant: step.kind === "matrix" ? "table" : undefined,
    };
  }
  return undefined;
}
