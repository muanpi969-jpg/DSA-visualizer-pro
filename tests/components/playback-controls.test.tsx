import { describe, it, expect, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { PlaybackControls } from "@/components/visualizer/PlaybackControls";
import { TooltipProvider } from "@/components/ui/tooltip";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";

function renderControls() {
  return render(
    <TooltipProvider>
      <PlaybackControls />
    </TooltipProvider>,
  );
}

beforeEach(() => {
  usePlaybackStore.getState().pause();
  usePlaybackStore.getState().loadAlgorithm("bubble-sort", { array: [3, 1, 2] });
});

describe("PlaybackControls", () => {
  it("dispatches next / previous / reset to the store", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByLabelText("Next step"));
    expect(usePlaybackStore.getState().currentStepIndex).toBe(1);

    await user.click(screen.getByLabelText("Next step"));
    expect(usePlaybackStore.getState().currentStepIndex).toBe(2);

    await user.click(screen.getByLabelText("Previous step"));
    expect(usePlaybackStore.getState().currentStepIndex).toBe(1);

    await user.click(screen.getByLabelText("Reset"));
    expect(usePlaybackStore.getState().currentStepIndex).toBe(0);
  });

  it("toggles play and pause", async () => {
    const user = userEvent.setup();
    renderControls();

    await user.click(screen.getByLabelText("Play"));
    expect(usePlaybackStore.getState().status).toBe("playing");

    await user.click(screen.getByLabelText("Pause"));
    expect(usePlaybackStore.getState().status).toBe("paused");
  });

  it("disables previous at the first step", () => {
    renderControls();
    expect(screen.getByLabelText("Previous step")).toBeDisabled();
  });
});
