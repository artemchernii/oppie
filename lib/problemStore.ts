"use client";

// oppie.lab — the problems screen's state.
//
// **There is one store and it is the database.** The server has already read the records and passes
// them in, so the first render already has them and an edit is written straight back. No browser copy,
// no merging, no reconciliation, and nothing on screen about where anything lives.
//
// This used to be different, and the difference was not worth it. `localStorage` held a second copy
// and the two were merged on load, which is what made a stored record hide nine others and what made
// a saved record rewrite itself on every page load. Both were bugs in the merging, not in the data.
// Removing the second store removed that whole class of bug. See `DECISIONS.md` #9.

import { useCallback, useEffect, useRef, useState } from "react";
import { saveProblem } from "./problemActions";
import type { Problem } from "./problems";

export function useProblems(initial: Problem[]) {
  const [problems, setProblems] = useState<Problem[]>(initial);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  /** Ids changed since the last write. A ref, so the write happens after the render rather than inside it. */
  const pending = useRef<Set<string>>(new Set());

  const persist = useCallback(async (problem: Problem) => {
    const result = await saveProblem(problem);
    if (!result.ok) {
      // Said out loud rather than swallowed. A screen that cannot tell "saved" from "not saved" is how
      // somebody keeps typing into a form that is going nowhere.
      setSaveError(result.error);
      return;
    }
    setSaveError(null);
    setSavedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    if (pending.current.size === 0) return;
    const ids = Array.from(pending.current);
    pending.current.clear();
    ids.forEach((id) => {
      const problem = problems.find((item) => item.id === id);
      if (problem) void persist(problem);
    });
  }, [problems, persist]);

  const updateProblem = useCallback((id: string, patch: Partial<Problem>) => {
    pending.current.add(id);
    setProblems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch, id: item.id, updatedAt: new Date().toISOString() } : item))
    );
  }, []);

  const insertProblem = useCallback((problem: Problem) => {
    pending.current.add(problem.id);
    setProblems((current) => (current.some((item) => item.id === problem.id) ? current : [...current, problem]));
  }, []);

  return { problems, saveError, savedAt, updateProblem, insertProblem };
}
