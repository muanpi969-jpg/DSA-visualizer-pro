"use client";

import * as React from "react";
import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ThemeProviderProps } from "next-themes";
import { usePreferencesStore } from "@/lib/stores/usePreferencesStore";

export function ThemeProvider({ children, ...props }: ThemeProviderProps) {
  const reducedTransparency = usePreferencesStore((s) => s.reducedTransparency);
  const reducedMotion = usePreferencesStore((s) => s.reducedMotion);
  React.useEffect(() => {
    document.documentElement.classList.toggle(
      "reduced-transparency",
      reducedTransparency,
    );
    document.documentElement.classList.toggle("reduced-motion", reducedMotion);
  }, [reducedTransparency, reducedMotion]);
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
