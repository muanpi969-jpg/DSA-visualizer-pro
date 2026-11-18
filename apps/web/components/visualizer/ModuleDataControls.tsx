"use client";

import { useEffect, useState } from "react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import type {
  GraphInput,
  InsertInput,
  KnapsackInput,
  ListInput,
  StringInput,
} from "@/lib/algorithms/extended/types";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface ModuleDataControlsProps {
  definition: AnyAlgorithmDefinition;
}
type Fields = Record<string, string>;
const controlClass =
  "w-full min-w-0 rounded-xl border border-input bg-background/60 px-3 py-2 text-xs text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring";

function fieldsFor(slug: string, input: unknown): Fields {
  if (slug === "bfs" || slug === "dfs") {
    const value = input as GraphInput;
    return {
      nodes: value.nodes.join(", "),
      edges: value.edges.map((edge) => edge.join(" ")).join("\n"),
      start: value.start,
      directed: String(value.directed),
    };
  }
  if (slug.startsWith("linked-list-")) {
    const value = input as InsertInput;
    return {
      values: value.values.join(", "),
      afterIndex: String(value.afterIndex ?? 0),
      value: String(value.value ?? 0),
    };
  }
  if (slug === "knapsack") {
    const value = input as KnapsackInput;
    return {
      items: value.items
        .map((item) => item.weight + ", " + item.value)
        .join("\n"),
      capacity: String(value.capacity),
    };
  }
  const value = input as StringInput;
  return { a: value.a, b: value.b };
}
function numberValue(text: string, label: string): number {
  const trimmed = text.trim();
  if (
    !/^[+-]?(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?$/i.test(trimmed) ||
    !Number.isFinite(Number(trimmed))
  )
    throw new Error(label + " must be a finite decimal number.");
  return Number(trimmed);
}
/** Parse all supplied data, then let the algorithm validate it. Never truncate or clamp. */
export function parseModuleInput(
  slug: string,
  fields: Fields,
): GraphInput | InsertInput | ListInput | StringInput | KnapsackInput {
  if (slug === "bfs" || slug === "dfs") {
    const nodes = fields.nodes.trim()
      ? fields.nodes.trim().split(/[,\s]+/)
      : [];
    const edges: [string, string][] = fields.edges
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        const labels = line
          .trim()
          .replace(/->/g, " ")
          .split(/[,\s]+/);
        if (labels.length !== 2)
          throw new Error(
            "Edge line " +
              (index + 1) +
              " must contain exactly two node labels.",
          );
        return [labels[0], labels[1]];
      });
    return {
      nodes,
      edges,
      start: fields.start.trim(),
      directed: fields.directed === "true",
    };
  }
  if (slug.startsWith("linked-list-")) {
    const values = fields.values.trim()
      ? fields.values
          .trim()
          .split(/[,\s]+/)
          .map((value) => numberValue(value, "List value"))
      : [];
    return slug === "linked-list-insert"
      ? {
          values,
          afterIndex: numberValue(fields.afterIndex, "Node index"),
          value: numberValue(fields.value, "New value"),
        }
      : { values };
  }
  if (slug === "knapsack") {
    const items = fields.items
      .split("\n")
      .filter((line) => line.trim())
      .map((line, index) => {
        const pair = line.trim().split(/[,\s]+/);
        if (pair.length !== 2)
          throw new Error(
            "Item line " + (index + 1) + " needs weight and value.",
          );
        return {
          weight: numberValue(pair[0], "Weight"),
          value: numberValue(pair[1], "Item value"),
        };
      });
    return { items, capacity: numberValue(fields.capacity, "Capacity") };
  }
  return { a: fields.a, b: fields.b };
}

export function ModuleDataControls({ definition }: ModuleDataControlsProps) {
  const selectedInput = usePlaybackStore((state) => state.selectedInput);
  const selectedSlug = usePlaybackStore((state) => state.selectedAlgorithmSlug);
  const loadAlgorithm = usePlaybackStore((state) => state.loadAlgorithm);
  const [fields, setFields] = useState<Fields>(() =>
    fieldsFor(definition.slug, definition.defaultInput),
  );
  const [error, setError] = useState<string | null>(null);
  const [preset, setPreset] = useState("");
  useEffect(() => {
    const source =
      selectedSlug === definition.slug && selectedInput
        ? selectedInput
        : definition.defaultInput;
    setFields(fieldsFor(definition.slug, source));
    setError(null);
    setPreset("");
  }, [definition, selectedInput, selectedSlug]);
  const update = (name: string, value: string) =>
    setFields((previous) => ({ ...previous, [name]: value }));
  const field = (
    name: string,
    label: string,
    extra?: {
      multiline?: boolean;
      hint?: string;
      inputMode?: "numeric" | "decimal";
      type?: string;
    },
  ) => (
    <label
      className="flex min-w-0 flex-1 flex-col gap-1.5 text-xs text-muted-foreground"
      key={name}
    >
      <span>{label}</span>
      {extra?.multiline ? (
        <textarea
          aria-label={label}
          value={fields[name] ?? ""}
          onChange={(event) => update(name, event.target.value)}
          rows={3}
          spellCheck={false}
          className={controlClass + " resize-y font-mono"}
        />
      ) : (
        <Input
          aria-label={label}
          type={extra?.type ?? "text"}
          inputMode={extra?.inputMode}
          value={fields[name] ?? ""}
          onChange={(event) => update(name, event.target.value)}
          className="h-9 w-full min-w-0 bg-background/60 font-mono text-xs"
        />
      )}
      {extra?.hint && (
        <span className="text-[10px] leading-relaxed">{extra.hint}</span>
      )}
    </label>
  );
  const apply = () => {
    try {
      const input = parseModuleInput(definition.slug, fields),
        validation = definition.validateInput(input);
      if (!validation.ok) throw new Error(validation.message);
      setError(null);
      setPreset("");
      loadAlgorithm(definition.slug, input);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Check the input.");
    }
  };
  const graph = definition.visualizerKind === "graph",
    list = definition.visualizerKind === "linked-list",
    knapsack = definition.slug === "knapsack";
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="grid min-w-0 gap-3 sm:grid-cols-2">
        {graph ? (
          <>
            {field("nodes", "Graph nodes", {
              hint: "Unique labels separated by commas; 30 nodes maximum.",
            })}
            {field("start", "Start node", {
              hint: "Must name an existing node. Empty graph: leave blank.",
            })}
            {field("edges", "Graph edges", {
              multiline: true,
              hint: "One source target pair per line; 60 edges maximum.",
            })}
            <label className="flex items-center gap-2 self-start pt-6 text-xs">
              <input
                type="checkbox"
                aria-label="Directed graph"
                checked={fields.directed === "true"}
                onChange={(event) =>
                  update("directed", String(event.target.checked))
                }
                className="h-4 w-4 accent-primary"
              />
              Directed graph
              <span className="text-muted-foreground">
                Follow source → target only
              </span>
            </label>
          </>
        ) : list ? (
          <>
            {field("values", "List values", {
              hint:
                definition.slug === "linked-list-insert"
                  ? "Up to 11 values, leaving room for the inserted node."
                  : "Up to 12 finite values. An empty field creates an empty list.",
            })}
            {definition.slug === "linked-list-insert" ? (
              <div className="grid min-w-0 grid-cols-2 gap-3">
                {field("afterIndex", "Insert after index", {
                  inputMode: "numeric",
                  hint: "Zero-based; use 0 for an empty list.",
                })}
                {field("value", "New node value", { inputMode: "decimal" })}
              </div>
            ) : (
              <p className="self-center text-xs text-muted-foreground">
                {definition.slug === "linked-list-middle"
                  ? "Even lengths return the second middle node."
                  : "Track previous, current and next as links reverse."}
              </p>
            )}
          </>
        ) : knapsack ? (
          <>
            {field("items", "Knapsack items", {
              multiline: true,
              hint: "One weight, value pair per line. Positive integer weights; nonnegative integer values. Up to 12 items.",
            })}
            {field("capacity", "Knapsack capacity", {
              inputMode: "numeric",
              hint: "Integer from 0 to 40.",
            })}
          </>
        ) : (
          <>
            {field("a", "First string", {
              hint: "Source / row string. Up to 12 Unicode characters.",
            })}
            {field("b", "Second string", {
              hint: "Target / column string. Empty strings are supported.",
            })}
          </>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" onClick={apply}>
          Apply input
        </Button>
        <label className="sr-only" htmlFor={"preset-" + definition.slug}>
          Choose a module preset
        </label>
        <select
          id={"preset-" + definition.slug}
          aria-label="Choose a module preset"
          value={preset}
          onChange={(event) => {
            const chosen = definition.presets.find(
              (item) => item.id === event.target.value,
            );
            if (!chosen) return;
            setPreset(chosen.id);
            setFields(fieldsFor(definition.slug, chosen.input));
            setError(null);
            loadAlgorithm(definition.slug, chosen.input);
          }}
          className={controlClass + " max-w-64"}
        >
          <option value="">Choose a preset</option>
          {definition.presets.map((item) => (
            <option value={item.id} key={item.id}>
              {item.label}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
