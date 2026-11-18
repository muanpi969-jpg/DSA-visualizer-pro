"use client";

import * as React from "react";
import Editor, { loader, type OnMount } from "@monaco-editor/react";
import { useTheme } from "next-themes";
import type { CodeLanguage } from "@/lib/algorithms/types";

loader.config({ paths: { vs: "/monaco/vs" } });

const MONACO_LANG: Record<CodeLanguage, string> = {
  javascript: "javascript",
  typescript: "typescript",
  python: "python",
  java: "java",
  cpp: "cpp",
  c: "c",
};

/**
 * Read-only Monaco editor with whole-line decorations for active step lines.
 * Loaded dynamically (never on the server). The lightweight highlighter is the
 * default; this is an opt-in "rich editor" enhancement.
 */
export function MonacoCode({
  code,
  language,
  activeLines,
}: {
  code: string;
  language: CodeLanguage;
  activeLines: number[];
}) {
  const { resolvedTheme } = useTheme();
  const editorRef = React.useRef<Parameters<OnMount>[0] | null>(null);
  const monacoRef = React.useRef<Parameters<OnMount>[1] | null>(null);
  const decorationsRef = React.useRef<string[]>([]);

  const applyDecorations = React.useCallback(() => {
    const editor = editorRef.current;
    const monaco = monacoRef.current;
    if (!editor || !monaco) return;
    const newDecorations = activeLines.map((line) => ({
      range: new monaco.Range(line, 1, line, 1),
      options: {
        isWholeLine: true,
        className: "monaco-active-line",
        marginClassName: "monaco-active-line-margin",
      },
    }));
    decorationsRef.current = editor.deltaDecorations(
      decorationsRef.current,
      newDecorations,
    );
    if (activeLines.length > 0) {
      editor.revealLineInCenterIfOutsideViewport(activeLines[0]);
    }
  }, [activeLines]);

  React.useEffect(() => {
    applyDecorations();
  }, [applyDecorations, code]);

  const onMount: OnMount = (editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;
    applyDecorations();
  };

  return (
    <>
      <style jsx global>{`
        .monaco-active-line {
          background: hsl(var(--viz-current) / 0.16);
        }
        .monaco-active-line-margin {
          border-left: 3px solid hsl(var(--viz-current));
        }
      `}</style>
      <Editor
        height="100%"
        language={MONACO_LANG[language]}
        value={code}
        theme={resolvedTheme === "dark" ? "vs-dark" : "light"}
        onMount={onMount}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          lineNumbers: "on",
          scrollBeyondLastLine: false,
          renderLineHighlight: "none",
          folding: false,
          contextmenu: false,
          scrollbar: { alwaysConsumeMouseWheel: false },
          automaticLayout: true,
        }}
        loading={
          <div className="p-3 text-sm text-muted-foreground">
            Loading editor…
          </div>
        }
      />
    </>
  );
}
