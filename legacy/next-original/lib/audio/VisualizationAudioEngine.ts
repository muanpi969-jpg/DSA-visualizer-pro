import type { AudioCue } from "@/lib/algorithms/types";

/**
 * Master output level, scaled by the user's volume (0..1). Sits at a normal
 * listening level; the compressor below keeps overlapping tones from clipping.
 */
const MASTER_LEVEL = 0.5;

interface VoiceOptions {
  frequency: number;
  wave: OscillatorType;
  durationMs: number;
  gain: number;
  pan?: number;
  /** Offset (seconds) from now — used to schedule arpeggio notes. */
  delay?: number;
}

/**
 * Lightweight Web Audio engine that synthesizes short tones for step cues.
 *
 * Design rules (see CLAUDE.md "Audio Engine"):
 * - AudioContext is created lazily, only after a user gesture.
 * - Master + per-cue gain; respects mute and volume.
 * - Short envelopes with a decaying tail avoid clicks and sound "plucked"
 *   rather than beepy; a low-pass filter rounds off harsh harmonics and a
 *   quiet octave layer adds shimmer.
 * - A gentle compressor lets the output sit at a standard level without
 *   clipping when many tones overlap at high playback speed.
 * - Nodes are stopped and disconnected after use.
 * - Never required: the app is fully usable with audio disabled.
 */
export class VisualizationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private volume = 0.6;
  private muted = true;

  /** Must be called from within a user gesture handler. */
  async ensureStarted(): Promise<void> {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();

      // Gentle bus compressor: keeps stacked tones loud but never harsh.
      this.compressor = this.ctx.createDynamicsCompressor();
      this.compressor.threshold.setValueAtTime(-18, this.ctx.currentTime);
      this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
      this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
      this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
      this.compressor.connect(this.ctx.destination);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.muted ? 0 : this.volume * MASTER_LEVEL;
      this.masterGain.connect(this.compressor);
    }
    if (this.ctx.state === "suspended") {
      await this.ctx.resume();
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.applyGain();
  }

  setVolume(volume: number) {
    this.volume = Math.min(1, Math.max(0, volume));
    this.applyGain();
  }

  private applyGain() {
    if (!this.masterGain || !this.ctx) return;
    const target = this.muted ? 0 : this.volume * MASTER_LEVEL;
    this.masterGain.gain.setTargetAtTime(target, this.ctx.currentTime, 0.01);
  }

  /** Play a single cue. No-op when muted or before the context is started. */
  play(cue: AudioCue): void {
    if (this.muted || !this.ctx || !this.masterGain) return;

    if (cue.kind === "success") {
      this.playSuccessArpeggio(cue);
      return;
    }

    this.playVoice({
      frequency: cue.frequency ?? 440,
      wave: cue.wave ?? "sine",
      durationMs: cue.durationMs ?? 100,
      gain: cue.gain ?? 0.25,
      pan: cue.pan,
    });
  }

  /** Completion: a short, rising major arpeggio — much more satisfying than a lone beep. */
  private playSuccessArpeggio(cue: AudioCue): void {
    const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
    const gain = cue.gain ?? 0.28;
    notes.forEach((frequency, i) => {
      this.playVoice({
        frequency,
        wave: "sine",
        durationMs: i === notes.length - 1 ? 260 : 150,
        gain: i === notes.length - 1 ? gain : gain * 0.85,
        pan: cue.pan,
        delay: i * 0.085,
      });
    });
  }

  /** One synthesized "pluck": filtered main tone + quiet octave shimmer. */
  private playVoice(opts: VoiceOptions): void {
    if (!this.ctx || !this.masterGain) return;

    const start = this.ctx.currentTime + (opts.delay ?? 0);
    const duration = opts.durationMs / 1000;
    const tail = duration * 1.7; // let the note ring slightly past its body
    const peak = opts.gain;

    // Low-pass filter rounds off harsh upper harmonics (esp. saw/triangle).
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      Math.min(Math.max(opts.frequency * 5, 900), 6500),
      start,
    );
    filter.Q.setValueAtTime(0.7, start);

    const envelope = this.ctx.createGain();
    envelope.gain.setValueAtTime(0.0001, start);
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.008);
    envelope.gain.exponentialRampToValueAtTime(peak * 0.35, start + duration);
    envelope.gain.exponentialRampToValueAtTime(0.0001, start + tail);

    const main = this.ctx.createOscillator();
    main.type = opts.wave;
    main.frequency.setValueAtTime(opts.frequency, start);

    // A quiet octave-up sine adds pleasant shimmer without sounding shrill.
    const octave = this.ctx.createOscillator();
    octave.type = "sine";
    octave.frequency.setValueAtTime(opts.frequency * 2, start);
    const octaveGain = this.ctx.createGain();
    octaveGain.gain.setValueAtTime(0.3, start);

    main.connect(filter);
    octave.connect(octaveGain);
    octaveGain.connect(filter);
    filter.connect(envelope);

    let out: AudioNode = envelope;
    if (
      opts.pan !== undefined &&
      typeof this.ctx.createStereoPanner === "function"
    ) {
      const panner = this.ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.min(1, Math.max(-1, opts.pan)), start);
      envelope.connect(panner);
      out = panner;
    }
    out.connect(this.masterGain);

    const stopAt = start + tail + 0.05;
    main.start(start);
    octave.start(start);
    main.stop(stopAt);
    octave.stop(stopAt);
    main.onended = () => {
      main.disconnect();
      octave.disconnect();
      octaveGain.disconnect();
      filter.disconnect();
      envelope.disconnect();
      if (out !== envelope) out.disconnect();
    };
  }

  dispose(): void {
    void this.ctx?.close();
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
  }
}

/** App-wide singleton (a page never needs more than one audio graph). */
let engine: VisualizationAudioEngine | null = null;

export function getAudioEngine(): VisualizationAudioEngine {
  if (!engine) engine = new VisualizationAudioEngine();
  return engine;
}
