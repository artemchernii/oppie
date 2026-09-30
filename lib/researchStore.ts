"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { applyProposal, ingest, type CollectedSource, type Proposal } from "./research";
import { freshInbox, freshProposals, readStoredResearch, writeStoredResearch } from "./researchPersistence";
import type { Problem } from "./problems";

export function useResearch() {
  const [sources, setSources] = useState<CollectedSource[]>(freshInbox);
  const [proposals, setProposals] = useState<Proposal[]>(freshProposals);
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState(false);
  const userEdited = useRef(false);

  useEffect(() => {
    const stored = readStoredResearch();
    if (stored) {
      setSources(stored.sources);
      setProposals(stored.proposals);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    setStorageError(!writeStoredResearch(sources, proposals));
  }, [sources, proposals, hydrated]);

  const mark = useCallback((id: string, patch: Partial<CollectedSource>) => {
    userEdited.current = true;
    setSources((current) => current.map((source) => (source.id === id ? { ...source, ...patch } : source)));
  }, []);

  const discard = useCallback((id: string) => {
    userEdited.current = true;
    setSources((current) => current.map((source) => (source.id === id ? { ...source, status: "spent" } : source)));
  }, []);

  /** Anything already triaged keeps its decision, so re-ingesting never undoes human work. */
  const addSources = useCallback((incoming: CollectedSource[]) => {
    userEdited.current = true;
    setSources((current) => ingest(current, incoming));
  }, []);

  const decideProposal = useCallback((id: string, status: Proposal["status"]) => {
    userEdited.current = true;
    setProposals((current) => current.map((proposal) => (proposal.id === id ? { ...proposal, status } : proposal)));
  }, []);

  /** The one place a suggestion becomes a record, and only when a human asks for it. */
  const acceptProposal = useCallback(
    (id: string, problem: Problem, apply: (next: Problem) => void) => {
      const proposal = proposals.find((item) => item.id === id);
      if (!proposal) return;
      userEdited.current = true;
      apply(applyProposal(problem, proposal));
      setProposals((current) => current.map((item) => (item.id === id ? { ...item, status: "accepted" } : item)));
    },
    [proposals]
  );

  const resetResearch = useCallback(() => {
    userEdited.current = true;
    setSources(freshInbox());
    setProposals(freshProposals());
  }, []);

  return { sources, proposals, hydrated, storageError, mark, discard, addSources, decideProposal, acceptProposal, resetResearch };
}
