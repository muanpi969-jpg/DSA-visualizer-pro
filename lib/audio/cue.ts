import type { AudioCue } from "@/lib/algorithms/types";

/**
 * Major-pentatonic pitch table from A3 (220 Hz) up ~2 octaves. Snapping data
 * values to this scale keeps rapid tone sequences consonant and musical —
 * no dissonant sliding pitches.
 */
const PENTATONIC: number[] = (() => {
  const ratios = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3]; // major pentatonic
  const notes: number[] = [];
  for (let octave = 0; octave < 2; octave++) {
    for (const r of ratios) notes.push(220 * r * 2 ** octave);
  }
  notes.push(880);
  return notes.map((f) => Math.round(f * 100) / 100);
})();

/**
 * Map a numeric value within [min, max] to a pitch on the pentatonic scale so
 * that cues rise and fall pleasantly with the data. Pure + deterministic so it
 * can be asserted in tests.
 */
export function valueToFrequency(
  value: number,
  min: number,
  max: number,
): number {
  if (max === min) return PENTATONIC[Math.floor(PENTATONIC.length / 2)];
  const t = Math.min(1, Math.max(0, (value - min) / (max - min)));
  return PENTATONIC[Math.round(t * (PENTATONIC.length - 1))];
}

/** Convenience constructors for common cues (keeps generators terse). */
export const cue = {
  compare(frequency: number): AudioCue {
    return { kind: "compare", frequency, wave: "sine", durationMs: 85, gain: 0.22 };
  },
  swap(frequency: number): AudioCue {
    return { kind: "swap", frequency, wave: "triangle", durationMs: 120, gain: 0.3 };
  },
  write(frequency: number): AudioCue {
    return { kind: "write", frequency, wave: "sine", durationMs: 110, gain: 0.26 };
  },
  success(): AudioCue {
    // Frequency/duration are advisory: the engine plays a rising arpeggio.
    return { kind: "success", frequency: 523.25, wave: "sine", durationMs: 200, gain: 0.3 };
  },
  error(): AudioCue {
    return { kind: "error", frequency: 150, wave: "sawtooth", durationMs: 200, gain: 0.2 };
  },
};
