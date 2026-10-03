# Tasks

## 1. Discovery contract

- [ ] 1.1 Define `DiscoveryInput` for market, geography, role, workflow, constraints and prompt.
- [ ] 1.2 Define proposal-shaped `CandidateProblem` and `BusinessPattern` records with source bundles.
- [ ] 1.3 Decide whether candidates and business patterns share a proposal table or use separate tables.
- [ ] 1.4 Add tests proving discovery cannot write to tracked problems without acceptance.

## 2. First source class

- [ ] 2.1 Choose one source class for the first adapter: procurement, job postings or pricing pages.
- [ ] 2.2 Collect URL, title, quote, figure, date, source status and query provenance.
- [ ] 2.3 Keep source collection separate from candidate generation.
- [ ] 2.4 Add deduplication by URL and then by workflow.

## 3. Candidate discovery

- [ ] 3.1 Extract concrete workflows, actors, buyers, money signals and repetition signals.
- [ ] 3.2 Cluster sources into candidate problems with explicit unknowns.
- [ ] 3.3 Find comparable businesses, services or vendors for each candidate.
- [ ] 3.4 Label copy/adapt/start paths as hypotheses with evidence and differences.

## 4. Human review

- [ ] 4.1 Build a proposal review queue for candidate problems and business patterns.
- [ ] 4.2 Add accept, reject and deepen actions with reasons.
- [ ] 4.3 On acceptance, create the tracked Problem without inventing missing fields.
- [ ] 4.4 Preserve every accepted citation and source status.

## 5. Validation handoff

- [ ] 5.1 Route accepted candidates into the existing paid-today and problem-analysis loop.
- [ ] 5.2 Show the next validation question, not a final business verdict.
- [ ] 5.3 Verify all existing tests and add discovery-boundary tests.
