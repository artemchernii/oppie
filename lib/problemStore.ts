"use client";

// oppie.lab — the React hook over lib/problemPersistence.ts and lib/problemSync.ts.
//
// The hydration contract, which is the one thing here that can silently eat records:
//
//   * The server has already read the records and passes them in as `remote`. The first client
//     render uses them, so it matches the server render byte for byte — no `Loading…` flash, and
//     no window in which the seed list is the live state.
//   * Stored/last-loaded data is reconciled in an effect after mount, never during render.
//   * Writes are gated on `hydrated`. That is what makes the dangerous render harmless: even if
//     something re-rendered between mount and reconciliation, nothing would be written from it.
//   * The read used to be synchronous localStorage, so "after mount" and "after the data" were
//     the same instant. A remote read is not instant, which is why `hydrated` is set in the same
//     effect that sets the merged records — one commit, so the first write this hook makes is
//     already the reconciled list rather than a placeholder.

import { useCallback, useEffect, useRef, useState } from "react";
import type { Problem } from "./problems";
import { saveProblem } from "./problemActions";
import { freshProblemSeed, readStoredProblems, writeStoredProblems } from "./problemPersistence";
import { planFirstLoad, planWrite } from "./problemSync";

export function useProblems(remote: Problem[] | null) {
  // `remote === null` means the server could not read (unconfigured, denied, or failed), not that
  // the table is empty. The seed is what a browser with no records shows either way, and it is
  // the same expression the server evaluated, so hydration matches.
  const [problems, setProblems] = useState<Problem[]>(() => planFirstLoad({ remote, local: null }).problems);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const [remoteError, setRemoteError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);

  /** Ids the user actually changed this session. State changes alone do not write anything. */
  const dirty = useRef<Set<string>>(new Set());
  /** Evaluated once, not per render — freshProblemSeed deep-clones ten records. */
  const [seeds] = useState<Problem[]>(() => freshProblemSeed());

  const persist = useCallback(async (rows: Problem[], phase: "cutover" | "edit") => {
    for (const row of rows) {
      const result = await saveProblem(row);
      if (!result.ok) {
        // Put it back on the queue: a failed write must be retried by the next change rather
        // than dropped, or the record is quietly only in this browser. The cutover phase does
        // not need this — a failed push is recomputed from localStorage on the next load.
        if (phase === "edit") dirty.current.add(row.id);
        setRemoteError(result.error);
        return;
      }
    }
    setRemoteError(null);
    setLastSavedAt(new Date().toISOString());
  }, []);

  useEffect(() => {
    const plan = planFirstLoad({ remote, local: readStoredProblems(), seeds });

    // The one-time cutover: records this browser holds and the database does not are pushed up
    // once. A pristine seed is never in this list — see shouldPersistToRemote.
    if (plan.upload.length > 0) {
      void persist(plan.upload, "cutover");
    }

    // One commit for both, so the first render that can write is already the merged list.
    setProblems(plan.problems);
    setHydrated(true);
    // Runs once: this is the reconciliation after mount, not a subscription.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const plan = planWrite({ hydrated, dirty: Array.from(dirty.current), problems, seeds });
    dirty.current.clear();

    setStorageError(!writeStoredProblems(problems));
    if (plan.upload.length > 0) void persist(plan.upload, "edit");
  }, [problems, hydrated, seeds, persist]);

  const updateProblem = useCallback((id: string, patch: Partial<Problem>) => {
    dirty.current.add(id);
    setProblems((current) => current.map((item) => (item.id === id ? { ...item, ...patch, id: item.id, updatedAt: new Date().toISOString() } : item)));
  }, []);

  const insertProblem = useCallback((problem: Problem) => {
    dirty.current.add(problem.id);
    setProblems((current) => (current.some((item) => item.id === problem.id) ? current : [...current, problem]));
  }, []);

  /**
   * Puts the seed back on screen, for this browser only.
   *
   * It is not a delete and it does not touch the database: the recorded problems are the user's,
   * and the seeds are reference data that never belonged there in the first place. Nothing is
   * marked dirty, so nothing is written, and the next page load shows the stored records again.
   */
  const resetToSeed = useCallback(() => {
    setProblems(freshProblemSeed());
  }, []);

  return { problems, hydrated, storageError, remoteError, lastSavedAt, updateProblem, insertProblem, resetToSeed };
}
