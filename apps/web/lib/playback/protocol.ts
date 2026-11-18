import type { BuildStepsResult } from "./buildSteps";
export interface GenerationRequest {
  runId: number;
  slug: string;
  input: unknown;
}
export type GenerationResponse =
  | { runId: number; ok: true; result: BuildStepsResult }
  | { runId: number; ok: false; error: string };
