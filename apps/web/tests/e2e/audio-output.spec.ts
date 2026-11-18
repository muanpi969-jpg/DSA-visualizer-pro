import { expect, test } from "@playwright/test";

declare global {
  interface Window {
    __dsaOfflineAudio: OfflineAudioContext;
  }
}

// Render the application's real synthesis graph to PCM instead of speakers.
// This catches silent/inaudible output that oscillator-start spies cannot.
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    const NativeOfflineContext = window.OfflineAudioContext;
    window.AudioContext = function () {
      const context = new NativeOfflineContext(2, 48_000, 48_000);
      // Offline contexts use the same native synthesis nodes, while rendering
      // begins explicitly after the user action under test schedules its cues.
      Object.defineProperty(context, "state", { get: () => "running" });
      Object.defineProperty(context, "close", { value: async () => {} });
      window.__dsaOfflineAudio = context;
      return context;
    } as unknown as typeof AudioContext;
  });
});

for (const source of ["preview", "binary comparison"] as const) {
  test(`${source} produces audible PCM at the default volume`, async ({
    page,
  }) => {
    await page.goto("/visualizers/binary-search/");
    await expect(
      page.getByRole("button", { name: "Next step", exact: true }),
    ).toBeEnabled();
    await page.getByRole("button", { name: "Test sound", exact: true }).click();
    await expect(
      page.getByRole("button", { name: "Mute audio", exact: true }),
    ).toBeVisible();
    if (source === "binary comparison") {
      // Reset removes the preview voices, isolating the actual paused forward
      // step rather than letting preview audio make this assertion pass.
      await page.getByRole("button", { name: "Reset", exact: true }).click();
      await page
        .getByRole("button", { name: "Next step", exact: true })
        .click();
      await expect(
        page.getByRole("button", { name: "Play", exact: true }),
      ).toBeVisible();
    }
    const output = await page.evaluate(async () => {
      const buffer = await window.__dsaOfflineAudio.startRendering();
      const channel = buffer.getChannelData(0);
      const body = channel.subarray(0, Math.round(buffer.sampleRate * 0.2));
      let peak = 0,
        energy = 0;
      for (const sample of body) {
        peak = Math.max(peak, Math.abs(sample));
        energy += sample * sample;
      }
      return { peak, rms: Math.sqrt(energy / body.length) };
    });
    await test.info().attach("audio-output.json", {
      body: JSON.stringify({ source, volume: 0.6, ...output }),
      contentType: "application/json",
    });
    expect(output.peak).toBeGreaterThan(0.07);
    expect(output.rms).toBeGreaterThan(0.015);
    expect(output.peak).toBeLessThan(1);
  });
}
