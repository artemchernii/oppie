"use client";

// oppie.lab — the React hook over lib/problemPersistence.ts.
//
// Same hydration contract as lib/store.ts: server render and first client render both
// use the seed, so they match. Stored data is swapped in from an effect after mount,
// and persisting is gated on `hydrated` so a pre-load render cannot overwrite what the
// user already had.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Problem } from "./problems";
import { freshProblemSeed, readStoredProblems, writeStoredProblems } from "./problemPersistence";

export function useProblems() {
  const [problems, setProblems] = useState<Problem[]>(freshProblemSeed);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const userEdited = useRef(false);

  useEffect(() => {
    const stored = readStoredProblems();
    if (stored) setProblems(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const ok = writeStoredProblems(problems);
    setStorageError(!ok);
    if (ok && userEdited.current) setLastSavedAt(new Date().toISOString());
  }, [problems, hydrated]);

  const updateProblem = useCallback((id: string, patch: Partial<Problem>) => {
    userEdited.current = true;
    setProblems((current) => current.map((item) => (item.id === id ? { ...item, ...patch, id: item.id, updatedAt: new Date().toISOString() } : item)));
  }, []);

  const insertProblem = useCallback((problem: Problem) => {
    userEdited.current = true;
    setProblems((current) => (current.some((item) => item.id === problem.id) ? current : [...current, problem]));
  }, []);

  const resetToSeed = useCallback(() => {
    userEdited.current = true;
    setProblems(freshProblemSeed());
  }, []);

  return { problems, hydrated, storageError, lastSavedAt, updateProblem, insertProblem, resetToSeed };
}
