"use client";

import { useEffect, useState } from "react";

/** True only after the first client render — used to avoid hydration mismatch
 *  when rendering values that come from localStorage / matchMedia. */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
