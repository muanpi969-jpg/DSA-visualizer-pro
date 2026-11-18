import type { AudioCue } from "@/lib/algorithms/types";

const MASTER_LEVEL = 0.8;
const MAX_VOICES = 8;
const MAX_REGULAR_CUES_PER_SECOND = 20;

/** Optional synthesis hints used by the semantic adapter, outside algorithm state. */
export interface SynthesizedCue extends AudioCue {
  variant?: "pointer" | "table";
}

interface Tone {
  frequency: number;
  durationMs: number;
  gain: number;
  wave?: OscillatorType;
  delay?: number;
  pan?: number;
}

interface Voice {
  oscillator: OscillatorNode;
  release: () => void;
}

function bounded(
  value: number | undefined,
  fallback: number,
  min: number,
  max: number,
) {
  return Number.isFinite(value)
    ? Math.min(max, Math.max(min, value!))
    : fallback;
}

/** A lazy, dependency-free synthesizer. Every scheduled voice is cancellable. */
export class VisualizationAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private volume = 0.6;
  private muted = true;
  private voices = new Set<Voice>();
  private cueTimes: number[] = [];
  private priorityUntil = 0;
  private unavailableMessage: string | null = null;
  private availabilityListeners = new Set<(message: string | null) => void>();
  private starting: Promise<boolean> | null = null;

  getUnavailableMessage(): string | null {
    return this.unavailableMessage;
  }

  subscribeAvailability(
    listener: (message: string | null) => void,
  ): () => void {
    this.availabilityListeners.add(listener);
    return () => {
      this.availabilityListeners.delete(listener);
    };
  }

  private reportAvailability(message: string | null): void {
    if (message === this.unavailableMessage) return;
    this.unavailableMessage = message;
    for (const listener of this.availabilityListeners) listener(message);
  }

  /** Call from a click/key handler. Unsupported or blocked audio stays silent. */
  ensureStarted(): Promise<boolean> {
    if (this.starting) return this.starting;
    const attempt = this.startContext();
    this.starting = attempt;
    void attempt.then(() => {
      if (this.starting === attempt) this.starting = null;
    });
    return attempt;
  }

  private async startContext(): Promise<boolean> {
    if (typeof window === "undefined") return false;
    try {
      if (this.ctx?.state === "closed") this.dispose();
      if (!this.ctx) {
        const Ctor =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext?: typeof AudioContext })
            .webkitAudioContext;
        if (!Ctor) {
          this.reportAvailability(
            "This browser cannot play sound effects. Open the app in a browser with Web Audio support.",
          );
          return false;
        }
        this.ctx = new Ctor();
        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.setValueAtTime(-12, this.ctx.currentTime);
        this.compressor.knee.setValueAtTime(12, this.ctx.currentTime);
        this.compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
        this.compressor.attack.setValueAtTime(0.002, this.ctx.currentTime);
        this.compressor.release.setValueAtTime(0.12, this.ctx.currentTime);
        this.compressor.connect(this.ctx.destination);
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = this.muted
          ? 0
          : this.volume * MASTER_LEVEL;
        this.masterGain.connect(this.compressor);
      }
      if (this.ctx.state !== "running") await this.ctx.resume();
      if (this.ctx.state !== "running")
        throw new Error("Audio context is not running.");
      this.reportAvailability(null);
      return true;
    } catch {
      // Discard a partial graph so a later user gesture can retry cleanly.
      this.dispose();
      this.reportAvailability(
        "Sound could not start. Allow audio for this browser tab, then click Test sound to try again.",
      );
      return false;
    }
  }

  setMuted(muted: boolean): void {
    this.muted = muted;
    if (muted) this.cancel();
    this.applyGain();
  }

  setVolume(volume: number): void {
    this.volume = bounded(volume, 0, 0, 1);
    this.applyGain();
  }

  private applyGain(): void {
    if (!this.masterGain || !this.ctx) return;
    try {
      this.masterGain.gain.setTargetAtTime(
        this.muted ? 0 : this.volume * MASTER_LEVEL,
        this.ctx.currentTime,
        0.01,
      );
    } catch {
      this.cancel();
      this.reportAvailability(
        "The audio device is unavailable. Check your output device, then click Test sound to try again.",
      );
    }
  }

  /** Clear both sounding and future notes without closing the reusable context. */
  cancel(): void {
    for (const voice of this.voices) {
      try {
        voice.oscillator.stop(this.ctx?.currentTime ?? 0);
      } catch {
        /* Already ended. */
      }
      voice.release();
    }
    this.voices.clear();
    this.cueTimes = [];
    this.priorityUntil = 0;
  }

  /** Rate-limited regular cues; completion takes priority over existing tones. */
  play(cue: SynthesizedCue): void {
    if (
      this.muted ||
      this.volume === 0 ||
      !this.ctx ||
      !this.masterGain ||
      this.ctx.state !== "running"
    )
      return;
    if (typeof document !== "undefined" && document.hidden) return;

    const now = this.ctx.currentTime;
    const frequency = bounded(cue.frequency, 440, 110, 1760);
    const gain = bounded(cue.gain, 0.28, 0, 0.4);
    const pan = bounded(cue.pan, 0, -1, 1);
    const pluck = bounded(cue.durationMs, 45, 25, 90);
    let tones: Tone[];

    if (cue.kind === "success") {
      this.cancel();
      tones = [523.25, 659.25, 783.99, 1046.5].map((note, i) => ({
        frequency: note,
        durationMs: 240 + i * 20,
        gain: gain * 0.45,
        delay: Math.min(i, 2) * 0.035,
        pan,
      }));
      this.priorityUntil = now + 0.4;
    } else {
      if (now < this.priorityUntil) return;
      this.cueTimes = this.cueTimes.filter((time) => now - time < 1);
      if (this.cueTimes.length >= MAX_REGULAR_CUES_PER_SECOND) return;
      if (cue.variant === "pointer") {
        tones = [
          { frequency, durationMs: 45, gain, pan },
          {
            frequency: frequency * 1.25,
            durationMs: 45,
            gain: gain * 0.6,
            delay: 0.025,
            pan,
          },
        ];
      } else if (cue.kind === "visit") {
        tones = [
          { frequency, durationMs: 135, gain: gain * 0.7, pan },
          {
            frequency: frequency * 1.5,
            durationMs: 160,
            gain: gain * 0.35,
            pan,
          },
        ];
      } else if (cue.kind === "relax") {
        tones = [
          { frequency, durationMs: 70, gain: gain * 0.8, pan },
          {
            frequency: frequency * 1.25,
            durationMs: 75,
            gain: gain * 0.65,
            delay: 0.025,
            pan,
          },
        ];
      } else {
        tones = [
          {
            frequency,
            durationMs: cue.kind === "error" ? 130 : pluck,
            gain: cue.kind === "error" ? gain * 0.6 : gain,
            wave: cue.kind === "error" ? "sine" : (cue.wave ?? "sine"),
            pan,
          },
        ];
      }
      if (this.voices.size + tones.length > MAX_VOICES) return;
      this.cueTimes.push(now);
    }

    try {
      for (const tone of tones) this.playTone(tone);
    } catch {
      this.cancel();
      this.reportAvailability(
        "The audio device is unavailable. Check your output device, then click Test sound to try again.",
      );
    }
  }

  /** A deliberate user gesture previews two clear notes, even while paused. */
  playPreview(): boolean {
    if (
      this.muted ||
      this.volume === 0 ||
      !this.ctx ||
      !this.masterGain ||
      this.ctx.state !== "running"
    )
      return false;
    if (typeof document !== "undefined" && document.hidden) return false;
    this.cancel();
    try {
      this.playTone({ frequency: 523.25, durationMs: 90, gain: 0.34 });
      this.playTone({
        frequency: 659.25,
        durationMs: 90,
        gain: 0.3,
        delay: 0.09,
      });
      return true;
    } catch {
      this.cancel();
      this.reportAvailability(
        "The audio device is unavailable. Check your output device, then click Test sound to try again.",
      );
      return false;
    }
  }

  private playTone(tone: Tone): void {
    if (
      !this.ctx ||
      !this.masterGain ||
      tone.gain <= 0 ||
      this.voices.size >= MAX_VOICES
    )
      return;
    const start = this.ctx.currentTime + (tone.delay ?? 0);
    const end = start + tone.durationMs / 1000;
    const oscillator = this.ctx.createOscillator();
    const nodes: AudioNode[] = [oscillator];
    let released = false;
    const voice: Voice = {
      oscillator,
      release: () => {
        if (released) return;
        released = true;
        oscillator.onended = null;
        for (const node of nodes) {
          try {
            node.disconnect();
          } catch {
            /* Device/context may have closed. */
          }
        }
        this.voices.delete(voice);
      },
    };
    this.voices.add(voice);
    const filter = this.ctx.createBiquadFilter();
    nodes.push(filter);
    const envelope = this.ctx.createGain();
    nodes.push(envelope);
    const panner =
      typeof this.ctx.createStereoPanner === "function"
        ? this.ctx.createStereoPanner()
        : null;
    if (panner) nodes.push(panner);
    oscillator.type = tone.wave ?? "sine";
    oscillator.frequency.setValueAtTime(tone.frequency, start);
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      Math.min(6500, Math.max(900, tone.frequency * 4)),
      start,
    );
    filter.Q.setValueAtTime(0.7, start);
    envelope.gain.setValueAtTime(0.0001, start);
    const peak = Math.max(0.0001, tone.gain);
    const duration = tone.durationMs / 1000;
    envelope.gain.exponentialRampToValueAtTime(peak, start + 0.004);
    // Hold the body long enough to survive the compressor's startup response.
    // A very short transient was attenuated before it became clearly audible.
    envelope.gain.setValueAtTime(
      peak,
      start + Math.min(0.04, duration * 0.4),
    );
    envelope.gain.exponentialRampToValueAtTime(
      Math.max(0.0001, peak * 0.22),
      start + duration * 0.7,
    );
    envelope.gain.exponentialRampToValueAtTime(0.0001, end);
    oscillator.connect(filter);
    filter.connect(envelope);
    if (panner) {
      panner.pan.setValueAtTime(tone.pan ?? 0, start);
      envelope.connect(panner);
      panner.connect(this.masterGain);
    } else {
      envelope.connect(this.masterGain);
    }
    oscillator.onended = voice.release;
    oscillator.start(start);
    oscillator.stop(end + 0.005);
  }

  dispose(): void {
    this.cancel();
    try {
      this.masterGain?.disconnect();
    } catch {
      /* Already disconnected. */
    }
    try {
      this.compressor?.disconnect();
    } catch {
      /* Already disconnected. */
    }
    try {
      void this.ctx?.close().catch(() => {});
    } catch {
      /* Closed/unsupported context. */
    }
    this.ctx = null;
    this.masterGain = null;
    this.compressor = null;
  }
}

let engine: VisualizationAudioEngine | null = null;

export function getAudioEngine(): VisualizationAudioEngine {
  if (!engine) engine = new VisualizationAudioEngine();
  return engine;
}
