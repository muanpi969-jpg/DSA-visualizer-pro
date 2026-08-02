"use client";

import { useEffect, useState } from "react";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";

/** True when the OS reports `prefers-reduced-motion: reduce`. */
export function useSystemReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setReduced(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Effective reduced motion = system preference OR user override. */
export function useReducedMotion(): boolean {
  const system = useSystemReducedMotion();
  const userOverride = usePreferencesStore((s) => s.reducedMotion);
  return system || userOverride;
}
