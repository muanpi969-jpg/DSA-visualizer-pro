import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { PreferencesControls } from "@/components/visualizer/PreferencesControls";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";

const audio = vi.hoisted(() => ({
  setMuted: vi.fn(),
  setVolume: vi.fn(),
  ensureStarted: vi.fn(async () => true),
  getUnavailableMessage: vi.fn<() => string | null>(() => null),
  subscribeAvailability: vi.fn(() => () => {}),
  playPreview: vi.fn(() => true),
}));
vi.mock("@/lib/audio/VisualizationAudioEngine", () => ({
  getAudioEngine: () => audio,
}));
vi.mock("@/lib/stores/usePlaybackStore", async () => {
  const { create } = await import("zustand");
  return {
    usePlaybackStore: create(() => ({ speedMs: 350, setSpeed: vi.fn() })),
  };
});
beforeEach(() => {
  vi.clearAllMocks();
  audio.ensureStarted.mockResolvedValue(true);
  audio.getUnavailableMessage.mockReturnValue(null);
  audio.playPreview.mockReturnValue(true);
  localStorage.clear();
  usePreferencesStore.setState({
    isMuted: true,
    volume: 0.6,
    reducedMotion: false,
    reducedTransparency: false,
  });
  document.documentElement.classList.remove("reduced-transparency");
});
afterEach(() =>
  document.documentElement.classList.remove("reduced-transparency"),
);

it("persists opaque surfaces independently from motion and sound", () => {
  render(
    <TooltipProvider>
      <PreferencesControls />
    </TooltipProvider>,
  );
  fireEvent.click(
    screen.getByRole("button", { name: "Toggle reduced transparency" }),
  );
  expect(document.documentElement).toHaveClass("reduced-transparency");
  expect(usePreferencesStore.getState()).toMatchObject({
    reducedTransparency: true,
    reducedMotion: false,
    isMuted: true,
  });
  const persisted = JSON.parse(
    localStorage.getItem("dsa-visualizer-preferences")!,
  );
  expect(persisted.state.reducedTransparency).toBe(true);
  fireEvent.click(
    screen.getByRole("button", { name: "Toggle reduced transparency" }),
  );
  expect(document.documentElement).not.toHaveClass("reduced-transparency");
});

it("shows Sound off by default and plays a preview only after enabling sound", async () => {
  render(
    <TooltipProvider>
      <PreferencesControls />
    </TooltipProvider>,
  );
  expect(screen.getByText("Sound off")).toBeVisible();
  expect(audio.ensureStarted).not.toHaveBeenCalled();
  expect(audio.playPreview).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Unmute audio" }));
  expect(audio.ensureStarted).toHaveBeenCalledOnce();
  await waitFor(() => expect(audio.playPreview).toHaveBeenCalledOnce());
  expect(screen.getByText("Sound on")).toBeVisible();
  expect(audio.setMuted).toHaveBeenLastCalledWith(false);
  expect(audio.setVolume).toHaveBeenLastCalledWith(0.6);
  fireEvent.click(screen.getByRole("button", { name: "Mute audio" }));
  expect(audio.setMuted).toHaveBeenLastCalledWith(true);
  expect(usePreferencesStore.getState().isMuted).toBe(true);
});

it("Test sound restores zero volume and enables a preview without starting playback", async () => {
  usePreferencesStore.setState({ volume: 0 });
  render(
    <TooltipProvider>
      <PreferencesControls />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Test sound" }));
  await waitFor(() => expect(audio.playPreview).toHaveBeenCalledOnce());
  expect(audio.setVolume).toHaveBeenLastCalledWith(0.6);
  expect(usePreferencesStore.getState()).toMatchObject({
    isMuted: false,
    volume: 0.6,
  });
  expect(
    JSON.parse(localStorage.getItem("dsa-visualizer-preferences")!).state
      .isMuted,
  ).toBe(false);
  expect(screen.getByText("60%")).toBeVisible();
});

it("keeps sound off and gives an actionable error when the browser blocks startup", async () => {
  audio.ensureStarted.mockResolvedValue(false);
  audio.getUnavailableMessage.mockReturnValue(
    "Allow audio for this tab, then click Test sound to try again.",
  );
  render(
    <TooltipProvider>
      <PreferencesControls />
    </TooltipProvider>,
  );
  fireEvent.click(screen.getByRole("button", { name: "Test sound" }));
  await waitFor(() =>
    expect(screen.getByRole("alert")).toHaveTextContent(/Allow audio/),
  );
  expect(usePreferencesStore.getState().isMuted).toBe(true);
  expect(audio.playPreview).not.toHaveBeenCalled();
  expect(screen.getByText("Sound off")).toBeVisible();
});

it("does not preview audio merely because an unmuted preference was restored", () => {
  usePreferencesStore.setState({ isMuted: false });
  render(
    <TooltipProvider>
      <PreferencesControls />
    </TooltipProvider>,
  );
  expect(screen.getByText("Sound on")).toBeVisible();
  expect(audio.ensureStarted).not.toHaveBeenCalled();
  expect(audio.playPreview).not.toHaveBeenCalled();
});
