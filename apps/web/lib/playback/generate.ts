import type { AnyAlgorithmDefinition } from "../algorithms/types";
import { buildSteps, type BuildStepsResult } from "./buildSteps";
import type { GenerationRequest, GenerationResponse } from "./protocol";
/** The bounded synchronous fallback supports environments without Worker. */
export function generateRun(
  request: GenerationRequest,
  definition: AnyAlgorithmDefinition,
  onResult: (result: BuildStepsResult) => void,
  onError: (message: string) => void,
): () => void {
  if (typeof Worker === "undefined") {
    try {
      onResult(buildSteps(definition, request.input));
    } catch (error) {
      onError(
        error instanceof Error ? error.message : "Unable to build this run.",
      );
    }
    return () => {};
  }
  let worker: Worker | undefined;
  let cancelled = false;
  try {
    worker = new Worker(new URL("./generation.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<GenerationResponse>) => {
      if (cancelled || event.data.runId !== request.runId) return;
      worker?.terminate();
      if (event.data.ok) onResult(event.data.result);
      else onError(event.data.error);
    };
    worker.onerror = (event) => {
      event.preventDefault();
      worker?.terminate();
      if (!cancelled)
        onError("The algorithm worker stopped. Apply the input to try again.");
    };
    worker.onmessageerror = () => {
      worker?.terminate();
      if (!cancelled) onError("The algorithm returned an unreadable trace.");
    };
    worker.postMessage(request);
  } catch (error) {
    worker?.terminate();
    onError(
      error instanceof Error
        ? error.message
        : "Unable to start algorithm worker.",
    );
  }
  return () => {
    cancelled = true;
    worker?.terminate();
  };
}
