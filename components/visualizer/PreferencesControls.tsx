"use client";

import * as React from "react";
import { Volume2, VolumeX, Gauge, Sparkles } from "lucide-react";
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
  const setMuted = usePreferencesStore((s) => s.setMuted);
  const setVolume = usePreferencesStore((s) => s.setVolume);
  const setReducedMotion = usePreferencesStore((s) => s.setReducedMotion);

  const speedMs = usePlaybackStore((s) => s.speedMs);
  const setSpeed = usePlaybackStore((s) => s.setSpeed);

  const onToggleMute = async () => {
    const next = !isMuted;
    setMuted(next);
    if (!next) {
      // Unmuting is a user gesture — safe to start the audio context now.
      await getAudioEngine().ensureStarted();
      getAudioEngine().setMuted(false);
      getAudioEngine().setVolume(volume);
    }
  };

  const speedValue = String(
    SPEED_OPTIONS.find((o) => o.ms === speedMs)?.ms ?? SPEED_PRESETS.normal,
  );

  return (
    <div className="flex items-center gap-2">
      {/* Speed */}
      <div className="flex items-center gap-1.5">
        <Gauge className="h-4 w-4 text-muted-foreground" aria-hidden />
        <Select value={speedValue} onValueChange={(v) => setSpeed(Number(v))}>
          <SelectTrigger className="h-8 w-[74px] text-xs" aria-label="Playback speed">
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
          {mounted && reducedMotion ? "Reduced motion on" : "Reduced motion off"}
        </TooltipContent>
      </Tooltip>

      {/* Mute + volume */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            aria-label={mounted && !isMuted ? "Mute audio" : "Unmute audio"}
            aria-pressed={mounted ? !isMuted : false}
            onClick={onToggleMute}
          >
            {mounted && !isMuted ? (
              <Volume2 className="h-4 w-4" />
            ) : (
              <VolumeX className="h-4 w-4" />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          {mounted && !isMuted ? "Mute (M)" : "Unmute (M)"}
        </TooltipContent>
      </Tooltip>

      {mounted && !isMuted && (
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
      )}
    </div>
  );
}
