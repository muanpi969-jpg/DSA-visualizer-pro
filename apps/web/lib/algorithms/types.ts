/**
 * Core runtime model for the DSA Visualizer.
 *
 * The entire app is built around a single step model: algorithm generators emit
 * `VisualizationStep` objects, the playback store selects the active step, and
 * renderers animate toward the active step's state. Nothing in this file knows
 * about React or any specific algorithm.
 */

export type VisualizerKind =
  | "array"
  | "matrix"
  | "graph"
  | "tree"
  | "linked-list"
  | "stack"
  | "queue"
  | "text";

export type AlgorithmCategory =
  | "sorting"
  | "search"
  | "graph"
  | "tree"
  | "dynamic-programming"
  | "data-structures";

export type Difficulty = "beginner" | "intermediate" | "advanced";

export type CodeLanguage =
  | "javascript"
  | "typescript"
  | "python"
  | "java"
  | "cpp"
  | "c";

export interface AlgorithmComplexity {
  best?: string;
  average?: string;
  worst?: string;
  time: string;
  space: string;
}

export interface StepMetrics {
  comparisons?: number;
  swaps?: number;
  writes?: number;
  reads?: number;
  visited?: number;
  relaxedEdges?: number;
  queueSize?: number;
  stackSize?: number;
  recursionDepth?: number;
  currentPass?: number;
  memoryCells?: number;
}

export interface CodeTrace {
  language: CodeLanguage;
  /** 1-indexed source lines highlighted for this step. */
  activeLines: number[];
  activeToken?: string;
  label?: string;
}

export type AudioCueKind =
  | "compare"
  | "swap"
  | "visit"
  | "relax"
  | "enqueue"
  | "backtrack"
  | "write"
  | "success"
  | "error";

export interface AudioCue {
  kind: AudioCueKind;
  frequency?: number;
  durationMs?: number;
  wave?: OscillatorType;
  pan?: number;
  gain?: number;
}

/**
 * A single atomic frame of an algorithm run. Contains everything needed to
 * render the visualization, highlight code, explain the operation, update
 * metrics, and (optionally) play an audio cue.
 */
export interface VisualizationStep<TState = unknown, THighlights = unknown> {
  id: string;
  index: number;
  kind: VisualizerKind;
  state: TState;
  highlights: THighlights;
  code: CodeTrace;
  metrics: StepMetrics;
  note: string;
  invariant?: string;
  operation?: string;
  audio?: AudioCue;
}

/** Result of validating algorithm input. */
export type ValidationResult =
  | { ok: true }
  | { ok: false; message: string };

/** A named, ready-to-run example input. */
export interface AlgorithmPreset<TInput> {
  id: string;
  label: string;
  input: TInput;
  description?: string;
}

/**
 * Maps a primary-language line number to the equivalent line(s) in another
 * language's snippet, so the code trace can highlight live in every tab.
 */
export type LineMap = Record<number, number | number[]>;

/**
 * Machine-readable facts about an algorithm's input shape so shared data
 * controls can adapt (target field, sorted randomization) without
 * per-algorithm shell code.
 */
export interface InputTraits {
  /** Input includes a numeric search target. */
  hasTarget?: boolean;
  /** validateInput rejects unsorted arrays (binary-like searches). */
  requiresSortedArray?: boolean;
}

/**
 * The single registration contract every algorithm implements. The shell uses
 * this to render catalog cards, metadata, controls, code samples, presets, and
 * to choose the correct renderer — with no per-algorithm shell code.
 */
export interface AlgorithmDefinition<TInput = unknown, TStepState = unknown, THighlights = unknown> {
  slug: string;
  title: string;
  category: AlgorithmCategory;
  difficulty: Difficulty;
  visualizerKind: VisualizerKind;
  /** One-line summary shown on catalog cards. */
  summary: string;
  /** Longer explanation shown in the inspector / SEO content. */
  description: string;
  tags: string[];
  complexity: AlgorithmComplexity;
  /** Preconditions / edge cases worth calling out to a learner. */
  preconditions?: string[];
  /** Optional traits consumed by shared input controls. */
  traits?: InputTraits;
  defaultInput: TInput;
  presets: Array<AlgorithmPreset<TInput>>;
  code: Partial<Record<CodeLanguage, string>>;
  /** The language whose line numbers `step.code.activeLines` refers to. */
  primaryLanguage: CodeLanguage;
  /**
   * Per-language translations of `step.code.activeLines` so line highlighting
   * works in every language tab, not just the primary reference. Update these
   * together with `code` and the generator (they are enforced by tests).
   */
  lineMaps?: Partial<Record<CodeLanguage, LineMap>>;
  validateInput(input: TInput): ValidationResult;
  generateSteps(input: TInput): Generator<VisualizationStep<TStepState, THighlights>>;
}

/** Convenience alias for a fully-erased definition stored in the registry. */
export type AnyAlgorithmDefinition = AlgorithmDefinition<any, any, any>;

/** Props passed to every renderer. Renderers never compute algorithm results. */
export interface RendererProps<TState = unknown, THighlights = unknown> {
  step: VisualizationStep<TState, THighlights>;
  previousStep?: VisualizationStep<TState, THighlights>;
  reducedMotion: boolean;
}
