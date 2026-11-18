"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

interface PreferencesState {
  /** Audio is off by default — audio is an enhancement, never required. */
  isMuted: boolean;
  /** Master volume 0..1. */
  volume: number;
  /** User override to force reduced motion regardless of system setting. */
  reducedMotion: boolean;
  /** Use opaque surfaces in place of translucent glass. */
  reducedTransparency: boolean;
  /** Prefer the heavier Monaco editor for the code panel (desktop). */
  useMonaco: boolean;

  setMuted: (muted: boolean) => void;
  toggleMuted: () => void;
  setVolume: (volume: number) => void;
  setReducedMotion: (enabled: boolean) => void;
  setReducedTransparency: (enabled: boolean) => void;
  setUseMonaco: (enabled: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      isMuted: true,
      volume: 0.6,
      reducedMotion: false,
      reducedTransparency: false,
      useMonaco: false,

      setMuted: (isMuted) => set({ isMuted }),
      toggleMuted: () => set((s) => ({ isMuted: !s.isMuted })),
      setVolume: (volume) =>
        set({
          volume: Number.isFinite(volume)
            ? Math.min(1, Math.max(0, volume))
            : 0.6,
        }),
      setReducedMotion: (reducedMotion) => set({ reducedMotion }),
      setReducedTransparency: (reducedTransparency) =>
        set({ reducedTransparency }),
      setUseMonaco: (useMonaco) => set({ useMonaco }),
    }),
    {
      name: "dsa-visualizer-preferences",
      version: 1,
    },
  ),
);
