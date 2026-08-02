"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Code2 } from "lucide-react";
import type {
  AnyAlgorithmDefinition,
  CodeLanguage,
  VisualizationStep,
} from "@/lib/algorithms/types";
import { LightweightCode } from "./LightweightCode";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MonacoCode = dynamic(
  () => import("./MonacoCode").then((m) => m.MonacoCode),
  { ssr: false, loading: () => <div className="p-3 text-sm text-muted-foreground">Loading editor…</div> },
);

const LANGUAGE_LABELS: Record<CodeLanguage, string> = {
  javascript: "JavaScript",
  typescript: "TypeScript",
  python: "Python",
  java: "Java",
  cpp: "C++",
  c: "C",
};

export function CodeTracePanel({
  definition,
  step,
}: {
  definition: AnyAlgorithmDefinition;
  step: VisualizationStep | undefined;
}) {
  const useMonaco = usePreferencesStore((s) => s.useMonaco);
  const setUseMonaco = usePreferencesStore((s) => s.setUseMonaco);

  const languages = React.useMemo(
    () => Object.keys(definition.code) as CodeLanguage[],
    [definition.code],
  );

  const [selected, setSelected] = React.useState<CodeLanguage>(
    definition.primaryLanguage,
  );

  // Reset the selected language when switching algorithms.
  React.useEffect(() => {
    setSelected(definition.primaryLanguage);
  }, [definition.primaryLanguage, definition.slug]);

  const code = definition.code[selected] ?? "";

  // Steps carry primary-language line numbers; translate them through the
  // definition's per-language line map so highlighting is live in every tab.
  const activeLines = React.useMemo(() => {
    if (!step) return [];
    if (step.code.language === selected) return step.code.activeLines;
    const map = definition.lineMaps?.[selected];
    if (!map) return [];
    const out = new Set<number>();
    for (const line of step.code.activeLines) {
      const mapped = map[line];
      if (mapped === undefined) continue;
      for (const l of Array.isArray(mapped) ? mapped : [mapped]) out.add(l);
    }
    return Array.from(out).sort((a, b) => a - b);
  }, [step, selected, definition.lineMaps]);

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Code2 className="h-4 w-4 text-muted-foreground" />
          Code trace
          {step?.code.label ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
              {step.code.label}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <Switch
            id="rich-editor"
            checked={useMonaco}
            onCheckedChange={setUseMonaco}
          />
          <Label htmlFor="rich-editor" className="text-xs text-muted-foreground">
            Rich editor
          </Label>
        </div>
      </div>

      {languages.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b px-2 py-1.5">
          {languages.map((lang) => (
            <button
              key={lang}
              type="button"
              onClick={() => setSelected(lang)}
              className={cn(
                "rounded px-2 py-1 text-xs font-medium transition-colors",
                selected === lang
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-foreground",
              )}
              aria-pressed={selected === lang}
            >
              {LANGUAGE_LABELS[lang]}
            </button>
          ))}
        </div>
      )}

      <div className="relative min-h-0 flex-1">
        {useMonaco ? (
          <MonacoCode code={code} language={selected} activeLines={activeLines} />
        ) : (
          <LightweightCode code={code} language={selected} activeLines={activeLines} />
        )}
      </div>

      {selected !== definition.primaryLanguage &&
        !definition.lineMaps?.[selected] && (
          <p className="border-t px-3 py-1.5 text-[11px] text-muted-foreground">
            Line highlighting is not mapped for {LANGUAGE_LABELS[selected]} yet.
          </p>
        )}
    </div>
  );
}
