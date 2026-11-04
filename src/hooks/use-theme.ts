"use client";

import { useSyncExternalStore } from "react";
import {
  DEFAULT_THEME,
  readThemePreference,
  resolveTheme,
  setThemePreference,
  subscribeTheme,
  type ResolvedTheme,
  type ThemePreference,
} from "@/lib/theme";

export function useTheme(): {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
} {
  const preference = useSyncExternalStore(
    subscribeTheme,
    readThemePreference,
    () => DEFAULT_THEME,
  );
  const resolved = useSyncExternalStore(
    subscribeTheme,
    () => resolveTheme(readThemePreference()),
    (): ResolvedTheme => (DEFAULT_THEME === "light" ? "light" : "dark"),
  );
  return { preference, resolved, setPreference: setThemePreference };
}
