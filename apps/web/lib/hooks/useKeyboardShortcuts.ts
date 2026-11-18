"use client";

import { useEffect } from "react";

interface ShortcutHandlers {
  onTogglePlay?: () => void;
  onNext?: () => void;
  onPrevious?: () => void;
  onReset?: () => void;
  onToggleMute?: () => void;
  onToggleFullscreen?: () => void;
}

const EDITABLE = new Set(["INPUT", "TEXTAREA", "SELECT"]);

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  if (EDITABLE.has(target.tagName)) return true;
  if (target.isContentEditable) return true;
  // Monaco and other editors mark editable regions with role/textbox.
  if (target.closest("[contenteditable='true'], .monaco-editor")) return true;
  return false;
}

/**
 * Global playback shortcuts. Never hijacks typing in inputs, selects, or the
 * code editor. See the root README for the keyboard controls.
 */
export function useKeyboardShortcuts(handlers: ShortcutHandlers): void {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;
      if (isTypingTarget(event.target)) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;

      switch (event.key) {
        case " ":
        case "Spacebar":
          event.preventDefault();
          handlers.onTogglePlay?.();
          break;
        case "ArrowRight":
          event.preventDefault();
          handlers.onNext?.();
          break;
        case "ArrowLeft":
          event.preventDefault();
          handlers.onPrevious?.();
          break;
        case "r":
        case "R":
          handlers.onReset?.();
          break;
        case "m":
        case "M":
          handlers.onToggleMute?.();
          break;
        case "f":
        case "F":
          handlers.onToggleFullscreen?.();
          break;
        default:
          break;
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [handlers]);
}
