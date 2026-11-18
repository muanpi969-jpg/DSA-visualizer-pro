"use client";

import * as React from "react";
import { Shuffle, Check, AlertCircle } from "lucide-react";
import type { AnyAlgorithmDefinition } from "@/lib/algorithms/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { usePlaybackStore } from "@/lib/stores/usePlaybackStore";

interface ArrayLikeInput {
  array: number[];
  target?: number;
}

function parseArray(text: string): number[] | null {
  const parts = text
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  const nums = parts.map(Number);
  if (nums.some((n) => !Number.isFinite(n))) return null;
  return nums;
}

function randomArray(size = 8, maxValue = 20): number[] {
  return Array.from(
    { length: size },
    () => Math.floor(Math.random() * maxValue) + 1,
  );
}

/**
 * Shared data controls for every array-based visualizer. Adapts to the
 * algorithm's declared input traits: shows a target field for searches and
 * randomizes into sorted order when the algorithm requires it.
 */
export function ArrayDataControls({
  definition,
}: {
  definition: AnyAlgorithmDefinition;
}) {
  const traits = definition.traits ?? {};
  const selectedInput = usePlaybackStore(
    (s) => s.selectedInput,
  ) as ArrayLikeInput | null;
  const loadAlgorithm = usePlaybackStore((s) => s.loadAlgorithm);

  const currentArray = React.useMemo(
    () => selectedInput?.array ?? [],
    [selectedInput],
  );
  const [text, setText] = React.useState(currentArray.join(", "));
  const [targetText, setTargetText] = React.useState(
    selectedInput?.target !== undefined ? String(selectedInput.target) : "",
  );
  const [error, setError] = React.useState<string | null>(null);
  const [presetId, setPresetId] = React.useState<string>("");

  // Keep the fields in sync when the input changes elsewhere (e.g. presets,
  // switching algorithms).
  React.useEffect(() => {
    setText(currentArray.join(", "));
    if (selectedInput?.target !== undefined) {
      setTargetText(String(selectedInput.target));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedInput]);

  const apply = React.useCallback(
    (array: number[], target?: number) => {
      const input: ArrayLikeInput = traits.hasTarget
        ? { array, target }
        : { array };
      const validation = definition.validateInput(input);
      if (!validation.ok) {
        setError(validation.message);
        return;
      }
      setError(null);
      loadAlgorithm(definition.slug, input);
    },
    [definition, loadAlgorithm, traits.hasTarget],
  );

  const parseTarget = (): number | undefined => {
    if (!traits.hasTarget) return undefined;
    const t = Number(targetText.trim());
    return targetText.trim() === "" || !Number.isFinite(t) ? Number.NaN : t;
  };

  const onApplyText = () => {
    const parsed = parseArray(text);
    if (parsed === null) {
      setError("Enter numbers separated by commas or spaces.");
      return;
    }
    setPresetId("");
    apply(parsed, parseTarget());
  };

  const onRandomize = () => {
    const arr = randomArray();
    if (traits.requiresSortedArray) arr.sort((a, b) => a - b);
    let target: number | undefined;
    if (traits.hasTarget) {
      // Usually pick a present value so "found" flows are common.
      target =
        Math.random() < 0.7
          ? arr[Math.floor(Math.random() * arr.length)]
          : Math.max(...arr) + 1;
      setTargetText(String(target));
    }
    setPresetId("");
    setText(arr.join(", "));
    apply(arr, target);
  };

  const onPreset = (id: string) => {
    const preset = definition.presets.find((p) => p.id === id);
    if (!preset) return;
    setPresetId(id);
    const input = preset.input as ArrayLikeInput;
    setText(input.array.join(", "));
    if (input.target !== undefined) setTargetText(String(input.target));
    apply(input.array, input.target);
  };

  return (
    <div className="flex w-full flex-wrap items-start gap-2">
      <div className="flex min-w-0 flex-1 flex-col gap-1 sm:flex-none">
        <div className="flex flex-wrap items-center gap-2">
          <Input
            aria-label="Array values"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") onApplyText();
            }}
            placeholder="e.g. 5, 2, 9, 1"
            className="h-8 w-full min-w-0 flex-1 font-mono text-xs sm:w-52 sm:flex-none"
          />
          {traits.hasTarget && (
            <Input
              aria-label="Target value"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") onApplyText();
              }}
              placeholder="target"
              className="h-8 w-20 font-mono text-xs"
            />
          )}
          <Button size="sm" variant="secondary" onClick={onApplyText}>
            <Check className="h-3.5 w-3.5" /> Apply
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={onRandomize}
            aria-label="Randomize array"
          >
            <Shuffle className="h-3.5 w-3.5" /> Random
          </Button>
        </div>
        {error && (
          <p
            role="alert"
            className="flex items-center gap-1 text-xs text-destructive"
          >
            <AlertCircle className="h-3.5 w-3.5" /> {error}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1">
        <Select value={presetId} onValueChange={onPreset}>
          <SelectTrigger
            className="h-8 w-48 text-xs"
            aria-label="Choose a preset"
          >
            <SelectValue placeholder="Presets" />
          </SelectTrigger>
          <SelectContent>
            {definition.presets.map((p) => (
              <SelectItem key={p.id} value={p.id} className="text-xs">
                {p.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
