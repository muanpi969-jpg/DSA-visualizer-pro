"use client";

import * as React from "react";
import { Volume2, VolumeX, Gauge, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { getAudioEngine } from "@/lib/audio/VisualizationAudioEngine";
import { useMounted } from "@/lib/hooks/useMounted";
import { SPEED_PRESETS } from "@/lib/playback/timing";

const SPEED_OPTIONS: Array<{ label: string; ms: number }> = [
  { label: "0.5×", ms: SPEED_PRESETS.slow },
  { label: "1×", ms: SPEED_PRESETS.normal },
  { label: "2×", ms: SPEED_PRESETS.fast },
  { label: "5×", ms: SPEED_PRESETS.turbo },
];

export function PreferencesControls() {
  const mounted = useMounted();
  const isMuted = usePreferencesStore((s) => s.isMuted);
  const volume = usePreferencesStore((s) => s.volume);
  const reducedMotion = usePreferencesStore((s) => s.reducedMotion);
  const reducedTransparency = usePreferencesStore((s) => s.reducedTransparency);
  const setMuted = usePreferencesStore((s) => s.setMuted);
  const setVolume = usePreferencesStore((s) => s.setVolume);
  const setReducedMotion = usePreferencesStore((s) => s.setReducedMotion);
  const setReducedTransparency = usePreferencesStore(
    (s) => s.setReducedTransparency,
  );
  const [startingSound, setStartingSound] = React.useState(false);
  const [audioError, setAudioError] = React.useState<string | null>(null);
  const [audioMessage, setAudioMessage] = React.useState<string | null>(null);
  const soundRequest = React.useRef(0);

  React.useEffect(() => {
    document.documentElement.classList.toggle(
      "reduced-transparency",
      reducedTransparency,
    );
  }, [reducedTransparency]);

  React.useEffect(() => {
    const engine = getAudioEngine();
    const onAvailability = (message: string | null) => {
      setAudioError(message);
      if (message) {
        setMuted(true);
        engine.setMuted(true);
      }
    };
    onAvailability(engine.getUnavailableMessage());
    const unsubscribe = engine.subscribeAvailability(onAvailability);
    const invalidatePendingSound = () => { soundRequest.current++; };
    return () => {
      invalidatePendingSound();
      unsubscribe();
    };
  }, [setMuted]);

  const speedMs = usePlaybackStore((s) => s.speedMs);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);

  const startSound = async () => {
    const request = ++soundRequest.current;
    const engine = getAudioEngine();
    const audibleVolume = volume > 0 ? volume : 0.6;
    setStartingSound(true);
    setAudioError(null);
    setAudioMessage(null);
    // This call stays inside the click handler, before the first await.
    const ready = await engine.ensureStarted();
    if (request !== soundRequest.current) return;
    setStartingSound(false);
    if (!ready) {
      setMuted(true);
      engine.setMuted(true);
      setAudioError(
        engine.getUnavailableMessage() ??
          "Sound could not start. Allow audio for this tab, then click Test sound to try again.",
      );
      return;
    }
    setVolume(audibleVolume);
    setMuted(false);
    engine.setVolume(audibleVolume);
    engine.setMuted(false);
    if (engine.playPreview()) {
      setAudioMessage(
        "Test sound played. If it is silent, check your device volume or whether this browser tab is muted.",
      );
    } else {
      setMuted(true);
      engine.setMuted(true);
      setAudioError(
        engine.getUnavailableMessage() ??
          "Sound is unavailable. Check your output device, then click Test sound to try again.",
      );
    }
  };

  const onToggleMute = () => {
    if (isMuted) {
      void startSound();
      return;
    }
    soundRequest.current++;
    setMuted(true);
    getAudioEngine().setMuted(true);
    setAudioMessage(null);
  };

  const speedValue = String(
    SPEED_OPTIONS.find((o) => o.ms === speedMs)?.ms ?? SPEED_PRESETS.normal,
  );

  return (
    <div className="flex max-w-full flex-wrap items-center gap-2">
      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Select value={speedValue} onValueChange={(v) => setSpeed(Number(v))}>
          <SelectTrigger
            className="h-8 w-[74px] text-xs"
            aria-label="Playback speed"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SPEED_OPTIONS.map((o) => (
              <SelectItem key={o.ms} value={String(o.ms)} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Reduced motion */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mounted && reducedMotion ? "secondary" : "ghost"}
            size="icon"
            aria-pressed={mounted ? reducedMotion : false}
            aria-label="Toggle reduced motion"
            onClick={() => setReducedMotion(!reducedMotion)}
          >
            <Sparkles className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {mounted && reducedMotion
            ? "Reduced motion on"
            : "Reduced motion off"}
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mounted && reducedTransparency ? "secondary" : "ghost"}
            size="icon"
            aria-pressed={mounted ? reducedTransparency : false}
            aria-label="Toggle reduced transparency"
            onClick={() => setReducedTransparency(!reducedTransparency)}
          >
            <Layers className="h-4 w-4" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {mounted && reducedTransparency
            ? "Opaque surfaces on"
            : "Glass surfaces on"}
        </TooltipContent>
      </Tooltip>

      {/* Mute + volume */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant={mounted && !isMuted ? "secondary" : "outline"}
            size="sm"
            aria-label={mounted && !isMuted ? "Mute audio" : "Unmute audio"}
            aria-pressed={mounted ? !isMuted : false}
            onClick={onToggleMute}
            disabled={startingSound}
            className="gap-1.5 text-xs"
          >
            {mounted && !isMuted ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
            <span>
              {startingSound
                ? "Starting sound…"
                : mounted && !isMuted
                  ? "Sound on"
                  : "Sound off"}
            </span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {mounted && !isMuted ? "Mute (M)" : "Unmute (M)"}
        </TooltipContent>
      </Tooltip>

      <Button
        size="sm"
        variant="ghost"
        className="text-xs"
        aria-label="Test sound"
        onClick={() => {
          void startSound();
        }}
        disabled={startingSound}
        title="Turn sound on and play a short sample"
      >
        Test sound
      </Button>

      {mounted && !isMuted && (
        <div className="flex items-center gap-2">
          <Slider
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={[volume]}
            onValueChange={(v) => {
              const vol = v[0] ?? 0;
              setVolume(vol);
              getAudioEngine().setVolume(vol);
            }}
            className="w-20"
          />
          <span className="min-w-7 text-[10px] tabular-nums text-muted-foreground">
            {Math.round(volume * 100)}%
          </span>
        </div>
      )}
      {audioError && (
        <p
          role="alert"
          className="w-full max-w-sm text-xs leading-relaxed text-destructive"
        >
          {audioError}
        </p>
      )}
      {!audioError && audioMessage && (
        <p
          role="status"
          className="w-full max-w-sm text-[10px] leading-relaxed text-muted-foreground"
        >
          {audioMessage}
        </p>
      )}
    </div>
  );
}
