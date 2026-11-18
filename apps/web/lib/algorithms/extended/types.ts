import type {
  AlgorithmDefinition,
  CodeLanguage,
  LineMap,
  StepMetrics,
  ValidationResult,
  VisualizationStep,
  VisualizerKind,
} from "../types";
import type { AdditionalSources } from "./sources";

export interface GraphInput {
  nodes: string[];
  edges: [string, string][];
  directed: boolean;
  start: string;
}
export interface GraphState {
  nodes: { id: string; x: number; y: number }[];
  edges: { id: string; from: string; to: string }[];
  directed: boolean;
  status: Record<string, "unseen" | "frontier" | "current" | "visited">;
  frontier: string[];
  order: string[];
  current: string | null;
  activeEdge: string | null;
  parents: Record<string, string | null>;
}
export interface ListInput {
  values: number[];
}
export interface InsertInput extends ListInput {
  afterIndex: number;
  value: number;
}
export interface ListNode {
  id: string;
  value: number;
  next: string | null;
}
export interface ListState {
  nodes: ListNode[];
  head: string | null;
  pointers: Record<string, string | null>;
  resultIds: string[];
  result: string;
}
export interface ListHighlights {
  active?: string[];
  found?: string[];
}
export type Cell = [number, number];
export interface StringInput {
  a: string;
  b: string;
}
export interface KnapsackInput {
  items: { weight: number; value: number }[];
  capacity: number;
}
export interface MatrixState {
  table: number[][];
  rowLabels: string[];
  columnLabels: string[];
  result: string;
  sequence?: string;
  selectedItems?: number[];
  operations?: string[];
}
export interface MatrixHighlights {
  active?: Cell;
  dependencies?: Cell[];
  path?: Cell[];
}
export type GraphStep = VisualizationStep<GraphState, Record<string, never>>;
export type ListStep = VisualizationStep<ListState, ListHighlights>;
export type MatrixStep = VisualizationStep<MatrixState, MatrixHighlights>;

export const valid: ValidationResult = { ok: true };
export const invalid = (message: string): ValidationResult => ({
  ok: false,
  message,
});
export const finite = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value);
export const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

/** Snapshots own their data: later mutations can never rewrite history. */
export function frameEmitter<S, H>(slug: string, kind: VisualizerKind) {
  let index = 0;
  return (
    state: S,
    highlights: H,
    line: number,
    note: string,
    operation: string,
    metrics: StepMetrics = {},
  ): VisualizationStep<S, H> => ({
    id: slug + "-" + index,
    index: index++,
    kind,
    state: copy(state),
    highlights: copy(highlights),
    code: { language: "typescript", activeLines: [line] },
    metrics: { ...metrics },
    note,
    operation,
  });
}

export function sourcePair(
  ts: string[],
  python: string[],
  map: LineMap,
  additional?: AdditionalSources,
) {
  return {
    code: {
      typescript: ts.join("\n"),
      python: python.join("\n"),
      ...additional?.code,
    } as Partial<Record<CodeLanguage, string>>,
    primaryLanguage: "typescript" as const,
    lineMaps: { python: map, ...additional?.lineMaps },
  };
}

export function definition<I, S, H>(
  base: Omit<
    AlgorithmDefinition<I, S, H>,
    "tags" | "presets" | "preconditions"
  > &
    Partial<
      Pick<AlgorithmDefinition<I, S, H>, "tags" | "presets" | "preconditions">
    >,
): AlgorithmDefinition<I, S, H> {
  return { tags: [base.category], presets: [], ...base };
}
