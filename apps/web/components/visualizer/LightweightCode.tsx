"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import type { CodeLanguage } from "@/lib/algorithms/types";

const KEYWORDS = new Set([
  "function",
  "const",
  "let",
  "var",
  "for",
  "while",
  "if",
  "else",
  "return",
  "break",
  "continue",
  "true",
  "false",
  "def",
  "in",
  "range",
  "not",
  "and",
  "or",
  "void",
  "int",
  "bool",
  "boolean",
  "std",
  "vector",
  "new",
  "class",
  "public",
  "private",
  "static",
  "null",
  "None",
  "True",
  "False",
]);

type Token = {
  text: string;
  kind: "kw" | "num" | "str" | "com" | "punct" | "plain";
};

/** Tiny, dependency-free tokenizer — good enough for readable, colored code. */
function tokenizeLine(line: string, language: CodeLanguage): Token[] {
  const tokens: Token[] = [];
  const commentStart =
    language === "python" ? line.indexOf("#") : line.indexOf("//");
  let code = line;
  let comment = "";
  if (commentStart >= 0) {
    code = line.slice(0, commentStart);
    comment = line.slice(commentStart);
  }

  const re =
    /(\s+|"[^"]*"|'[^']*'|`[^`]*`|\d+(?:\.\d+)?|[A-Za-z_]\w*|[^\sA-Za-z0-9_])/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(code)) !== null) {
    const text = match[0];
    if (/^\s+$/.test(text)) tokens.push({ text, kind: "plain" });
    else if (/^["'`]/.test(text)) tokens.push({ text, kind: "str" });
    else if (/^\d/.test(text)) tokens.push({ text, kind: "num" });
    else if (/^[A-Za-z_]/.test(text))
      tokens.push({ text, kind: KEYWORDS.has(text) ? "kw" : "plain" });
    else tokens.push({ text, kind: "punct" });
  }
  if (comment) tokens.push({ text: comment, kind: "com" });
  return tokens;
}

const TOKEN_CLASS: Record<Token["kind"], string> = {
  kw: "text-viz-swap font-medium",
  num: "text-viz-frontier",
  str: "text-viz-success",
  com: "text-muted-foreground italic",
  punct: "text-foreground/70",
  plain: "text-foreground",
};

export function LightweightCode({
  code,
  language,
  activeLines,
}: {
  code: string;
  language: CodeLanguage;
  activeLines: number[];
}) {
  const activeSet = React.useMemo(() => new Set(activeLines), [activeLines]);
  const lines = React.useMemo(() => code.split("\n"), [code]);
  const activeRef = React.useRef<HTMLDivElement | null>(null);
  const scrollRef = React.useRef<HTMLDivElement | null>(null);

  // Keep the current line in view as playback advances.
  React.useEffect(() => {
    const container = scrollRef.current;
    const active = activeRef.current;
    if (!container || !active) return;
    const offset =
      active.getBoundingClientRect().top -
      container.getBoundingClientRect().top;
    if (offset < 0) container.scrollTop += offset;
    else if (offset + active.offsetHeight > container.clientHeight) {
      container.scrollTop +=
        offset + active.offsetHeight - container.clientHeight;
    }
  }, [activeLines]);

  return (
    <div
      ref={scrollRef}
      className="scrollbar-thin h-full overflow-auto bg-muted/30 font-mono text-[12px] leading-6"
    >
      <pre className="min-w-full">
        <code>
          {lines.map((line, i) => {
            const lineNo = i + 1;
            const isActive = activeSet.has(lineNo);
            return (
              <div
                key={lineNo}
                ref={isActive ? activeRef : undefined}
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "flex px-2 transition-colors",
                  isActive
                    ? "bg-viz-current/15 shadow-[inset_3px_0_0_0_hsl(var(--viz-current))]"
                    : "hover:bg-foreground/5",
                )}
              >
                <span className="mr-3 w-7 shrink-0 select-none text-right text-muted-foreground/50">
                  {lineNo}
                </span>
                <span className="whitespace-pre">
                  {tokenizeLine(line, language).map((t, ti) => (
                    <span key={ti} className={TOKEN_CLASS[t.kind]}>
                      {t.text}
                    </span>
                  ))}
                  {line.length === 0 ? " " : ""}
                </span>
              </div>
            );
          })}
        </code>
      </pre>
    </div>
  );
}
