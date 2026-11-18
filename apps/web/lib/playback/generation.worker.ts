import { getAlgorithmBySlug } from "../algorithms/registry";
import { buildSteps } from "./buildSteps";
import type { GenerationRequest, GenerationResponse } from "./protocol";
self.onmessage = (event: MessageEvent<GenerationRequest>) => {
  const { runId, slug, input } = event.data;
  let response: GenerationResponse;
  try {
    const definition = getAlgorithmBySlug(slug);
    if (!definition) throw new Error(`Unknown algorithm: ${slug}`);
    const validation = definition.validateInput(input);
    if (!validation.ok) throw new Error(validation.message);
    response = { runId, ok: true, result: buildSteps(definition, input) };
  } catch (error) {
    response = {
      runId,
      ok: false,
      error:
        error instanceof Error ? error.message : "Unable to build this run.",
    };
  }
  self.postMessage(response);
};
