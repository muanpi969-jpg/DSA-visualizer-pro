"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function VisualizerError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; do not swallow it silently.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 px-4 py-24 text-center">
      <h1 className="text-xl font-semibold">Something went wrong</h1>
      <p className="text-sm text-muted-foreground">
        The visualizer hit an unexpected error while rendering.
      </p>
      <Button onClick={reset}>Try again</Button>
    </div>
  );
}
