"use client";

// oppie.lab — the React hook over lib/persistence.ts.
//
// Hydration contract: the server render and the first client render both use the seed
// array, so they always match. Stored data is swapped in from an effect after mount.
// Persisting is gated on `hydrated`, so a pre-load render can never overwrite what the
// user already had.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Opportunity } from "./data";
import { freshSeed, readStored, writeStored } from "./persistence";

export function useOpportunities() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>(freshSeed);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  // The hydration handoff writes identical data back. That is not a user edit, so it
  // must not raise the "saved" confirmation.
  const userEdited = useRef(false);

  // Load once, after mount. Never during render — that is a hydration mismatch.
  useEffect(() => {
    const stored = readStored();
    if (stored) setOpportunities(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const ok = writeStored(opportunities);
    setStorageError(!ok);
    if (ok && userEdited.current) setLastSavedAt(new Date().toISOString());
  }, [opportunities, hydrated]);

  const updateOpportunity = useCallback((id: string, patch: Partial<Opportunity>) => {
    userEdited.current = true;
    setOpportunities((current) => current.map((item) => (item.id === id ? { ...item, ...patch, id: item.id, updatedAt: new Date().toISOString() } : item)));
  }, []);

  const insertOpportunity = useCallback((opportunity: Opportunity) => {
    userEdited.current = true;
    setOpportunities((current) => (current.some((item) => item.id === opportunity.id) ? current : [...current, opportunity]));
  }, []);

  const resetToSeed = useCallback(() => {
    userEdited.current = true;
    setOpportunities(freshSeed());
  }, []);

  return { opportunities, hydrated, storageError, lastSavedAt, updateOpportunity, insertOpportunity, resetToSeed };
}
