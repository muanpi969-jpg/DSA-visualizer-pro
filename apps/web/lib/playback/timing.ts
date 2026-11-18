/** Playback speed presets, expressed as milliseconds per step. */
export const SPEED_PRESETS = {
  slow: 1200,
  normal: 600,
  fast: 260,
  turbo: 90,
} as const;

export const MIN_SPEED_MS = 40;
export const MAX_SPEED_MS = 2000;
export const DEFAULT_SPEED_MS = SPEED_PRESETS.normal;

/**
 * A speed slider is more intuitive when higher = faster, but the store thinks in
 * ms/step (lower = faster). These helpers invert between the two.
 */
export function sliderToSpeedMs(slider: number): number {
  const clamped = Math.min(100, Math.max(0, slider));
  return Math.round(MAX_SPEED_MS - (clamped / 100) * (MAX_SPEED_MS - MIN_SPEED_MS));
}

export function speedMsToSlider(speedMs: number): number {
  const clamped = Math.min(MAX_SPEED_MS, Math.max(MIN_SPEED_MS, speedMs));
  return Math.round(((MAX_SPEED_MS - clamped) / (MAX_SPEED_MS - MIN_SPEED_MS)) * 100);
}
