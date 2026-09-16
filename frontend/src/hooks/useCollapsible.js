import { useState, useEffect } from "react";

const STORAGE_PREFIX = "pacha_collapsed_";

/**
 * Per-dashboard-section expand/collapse state, persisted to localStorage so
 * a section the user closes (e.g. they never check the weather charts)
 * stays closed across visits instead of resetting to fully expanded every
 * time they open the app - same reasoning as the language preference in
 * LanguageContext.jsx, which this mirrors.
 */
export function useCollapsible(sectionKey, defaultExpanded = true) {
  const storageKey = STORAGE_PREFIX + sectionKey;

  const [expanded, setExpanded] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return saved === "1";
    } catch {
      // localStorage unavailable (private browsing, etc.) - fall through to default
    }
    return defaultExpanded;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, expanded ? "1" : "0");
    } catch {
      // ignore write failures
    }
  }, [expanded, storageKey]);

  return [expanded, setExpanded];
}
