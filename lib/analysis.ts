// oppie.lab — the analysis rubric: seven questions, one number, no hidden inputs.
//
// Pure on purpose. No React, no network, no clock, no database. `pnpm test` runs it in plain Node,
// and anyone can run the same function over a record and check the number by hand.
//
// WHAT IT DOES
//   Reads a Problem, answers seven questions about it, each `yes`, `no` or `unknown`, each carrying
//   the record field or the source that decided it. Then turns those answers into one number 0-10.
//
// WHAT IT IS ALLOWED TO BE, per `docs/RULES.md` § 5. All four must hold, and they are the reason
// this file is shaped the way it is:
//
//   1. the dimensions and their weights are stated in one place — `dimensionDefs`, `WEIGHTS`, here —
//      and are shown next to the number
//   2. every dimension's contribution, and the citation behind it, is reachable from the number
//      — `Analysis.dimensions`, each with its `citation`
//   3. the score says how many dimensions it was computed over, and an `unknown` never counts as
//      zero — `Analysis.answered` and `Analysis.max`
//   4. it is this system's judgement. It is not a measurement, a probability, or a forecast, and no
//      surface may present it as one.
//
// TWO RULES THAT ARE EASY TO GET WRONG
//
//   * `unknown` is not `no`. A dimension nobody checked is not a dimension that failed. An unknown
//     is left out of the sum and shrinks `max`, so "+3 over 5 answers" and "+3 over 7 answers" stay
//     visibly different claims.
//   * `no` is counted, not ignored. `yes` and `no` cancel, so a record with three good answers and
//     two known holes scores below one with three good answers and nothing else known. A yes-only
//     sum cannot tell those two apart.
//
// WHERE `no` COMES FROM
//
//   Absence of evidence is `unknown`, never `no`: a missing field means nobody looked
//   (`docs/PAIN_FUNNEL.md` — `0` is checked and the answer is no, blank is not checked). So a `no`
//   only ever comes from something a person actually checked — a signal answered `0`, a kill reason
//   that names no real reason, or a link claimed as `direct` that was never opened.
//
// The comments are deliberately plain. The normative version of the behaviour is
// `openspec/changes/problem-analysis-rubric/specs/problem-analysis/spec.md`.

import type { Evidence, Problem, SignalKey } from "./problems";

/** Bump this when a dimension or a weight changes. A stored score names the version that made it. */
export const RUBRIC_VERSION = 1;

/** The rating scale, shared with `problem_ratings.rating` so the two numbers can be compared. */
export const RATING_MIN = 0;
export const RATING_MAX = 10;

/**
 * How far a person's rating may sit from the machine's score before a reason is required.
 *
 * Three points on a 0-10 scale. This is a guess, not a derivation. It is one constant so it can be
 * moved after a dozen ratings, and it is deliberately generous: the cost of asking for a reason is
 * what decides whether ratings ever get made at all.
 */
export const DIVERGENCE_THRESHOLD = 3;

export type Verdict = "yes" | "no" | "unknown";

export type DimensionKey =
  | "wedge"
  | "paid"
  | "repeats"
  | "buyer"
  | "competition"
  | "kill"
  | "citations";

/**
 * What decided a verdict.
 *
 * `field` names the record's own field. `url` and `passage` name a source, and `opened` says whether
 * anyone actually read the page — a search snippet is not a page. A verdict with neither a field nor
 * a url should not exist; that shape is what `unknown` is for.
 */
export type Citation = {
  field?: string;
  evidenceId?: string;
  url?: string;
  passage?: string;
  opened?: boolean;
};

/** One answer inside a dimension that has more than one part. */
export type Part = {
  key: string;
  label: string;
  verdict: Verdict;
  citation?: Citation;
};

export type Dimension = {
  key: DimensionKey;
  label: string;
  /** The rule this dimension comes from. Shown next to the verdict. */
  rule: string;
  verdict: Verdict;
  citation?: Citation;
  /** Present when the rule requires the parts to be answered separately. */
  parts?: Part[];
};

/**
 * The seven dimensions, in gate order, so the first unmet one is the one blocking the record.
 *
 * Every dimension names the rule it derives from. Adding, removing or redefining one is a change to
 * `openspec/changes/problem-analysis-rubric/specs/problem-analysis/spec.md`, a bump of
 * `RUBRIC_VERSION`, and nothing else in this file.
 */
export const dimensionDefs: { key: DimensionKey; label: string; rule: string }[] = [
  { key: "wedge", label: "Wedge", rule: "docs/RULES.md § 3" },
  { key: "paid", label: "Paid today", rule: "docs/RULES.md § 11, docs/PAIN_FUNNEL.md § G2" },
  { key: "repeats", label: "Repeats", rule: "docs/PAIN_FUNNEL.md § G3" },
  { key: "buyer", label: "Buyer owns it", rule: "docs/PAIN_FUNNEL.md § G4" },
  { key: "competition", label: "Competition", rule: "docs/RULES.md § 2" },
  { key: "kill", label: "Kill reason", rule: "docs/RULES.md § 4" },
  { key: "citations", label: "Citation integrity", rule: "the product rule: nothing is direct on an unopened link" }
];

/**
 * Every dimension counts the same. Not a placeholder for a cleverer weighting — equal weights are
 * the only ones nobody had to invent, which is how the readiness tally earns its equal weights too.
 * A weight other than 1 has to be earned from the divergence log, and it arrives as a new
 * `RUBRIC_VERSION` rather than as an edit to this one.
 */
export const WEIGHTS: Record<DimensionKey, number> = {
  wedge: 1,
  paid: 1,
  repeats: 1,
  buyer: 1,
  competition: 1,
  kill: 1,
  citations: 1
};

export type Analysis = {
  rubricVersion: number;
  dimensions: Dimension[];
  /** The signed sum: `yes` adds a weight, `no` subtracts one, `unknown` contributes nothing. */
  raw: number;
  /** The largest `raw` could be over the dimensions actually answered. */
  max: number;
  /** How many dimensions were answered. Always shown; never divide a total by 7 and call it done. */
  answered: number;
  /** 0-10, or null when nothing was answered. Same scale as a person's rating, on purpose. */
  score: number | null;
  unknown: DimensionKey[];
  /** The earliest dimension in gate order that is not `yes`. The thing blocking the record. */
  blocking: DimensionKey | null;
};

// ---------------------------------------------------------------- reading the record

const text = (value: string | undefined | null): string => (typeof value === "string" ? value.trim() : "");

const filled = (value: string | undefined | null): boolean => text(value).length > 0;

const signalOf = (problem: Problem, key: SignalKey) => problem.signals.find((signal) => signal.key === key);

const withUrl = (problem: Problem): Evidence[] => problem.evidence.filter((item) => filled(item.url));

const evidenceOfType = (problem: Problem, types: Evidence["type"][]): Evidence | undefined =>
  problem.evidence.find((item) => types.indexOf(item.type) !== -1 && filled(item.url));

/** A citation for an evidence row. `opened` is false for a link nobody has confirmed opens. */
const citeEvidence = (item: Evidence, passage?: string): Citation => ({
  evidenceId: item.id,
  url: text(item.url),
  passage: text(passage ?? item.observation),
  opened: item.linkStatus === "checked"
});

const citeField = (field: string, passage?: string): Citation => ({
  field,
  passage: text(passage)
});

const part = (key: string, label: string, verdict: Verdict, citation?: Citation): Part => ({ key, label, verdict, citation });

/**
 * A dimension with parts is a conjunction, not an average: all parts `yes` means `yes`, any part
 * `no` means `no`, and otherwise it is `unknown`. That is what `docs/RULES.md` § 3 means by
 * "specific customer + specific workflow + specific geography + specific outcome" — all four, and
 * deliberately not a count out of four.
 */
const verdictFromParts = (parts: Part[]): Verdict => {
  if (parts.some((item) => item.verdict === "no")) return "no";
  if (parts.every((item) => item.verdict === "yes")) return "yes";
  return "unknown";
};

// ---------------------------------------------------------------- the seven dimensions

/**
 * Wedge specificity — `docs/RULES.md` § 3: a specific customer, workflow, place and consequence.
 *
 * Four parts, each reported separately, and none of them combined into a specificity percentage.
 * A part is `yes` when its field has text and `unknown` otherwise: a blank means nobody wrote it
 * down, which is not the same as writing down something general.
 *
 * Known gap, deliberate: `docs/RULES.md` § 3 also asks for a specific *outcome*. `Problem` has no
 * outcome field, and the nearest thing is `consequence` — what goes wrong today. Adding a field is a
 * change to the record shape, not something to guess at here.
 */
function evaluateWedge(problem: Problem): Dimension {
  const parts: Part[] = [
    part("customer", "A specific customer, not a category", filled(problem.affectedRole) ? "yes" : "unknown", filled(problem.affectedRole) ? citeField("affectedRole") : undefined),
    part("workflow", "A specific workflow, not an aspiration", filled(problem.what) ? "yes" : "unknown", filled(problem.what) ? citeField("what") : undefined),
    part("place", "A specific market or vertical", filled(problem.market) || filled(problem.domain) ? "yes" : "unknown", filled(problem.market) || filled(problem.domain) ? citeField(filled(problem.market) ? "market" : "domain") : undefined),
    part("consequence", "A specific consequence, not a general complaint", filled(problem.consequence) ? "yes" : "unknown", filled(problem.consequence) ? citeField("consequence") : undefined)
  ];
  const verdict = verdictFromParts(parts);
  return {
    key: "wedge",
    label: "Wedge",
    rule: "docs/RULES.md § 3",
    verdict,
    citation: parts.find((item) => item.verdict !== "yes")?.citation ?? parts[0].citation,
    parts
  };
}

/**
 * Paid today — `docs/RULES.md` § 11 and `docs/PAIN_FUNNEL.md` § G2. The gate that filters hardest.
 *
 * A job posting whose description *is* the workflow, a published price, a procurement document, or a
 * contractor invoice all count. Complaints, upvotes and "would you use this" do not, which is why
 * community evidence is deliberately not accepted here.
 *
 * Order matters and is deliberate: a signal answered `0` is a person who checked and found nobody
 * paying, so it wins over a piece of evidence that might be about a different firm. Anything else
 * with a matching source is a `yes`. Nothing at all is `unknown` — never `no`.
 */
/** Evidence of these types answers "Paid today" on its own. Shared so Inbox can warn before acceptance. */
export const PAID_TODAY_EVIDENCE_TYPES: Evidence["type"][] = ["job", "procurement", "price"];

function evaluatePaid(problem: Problem): Dimension {
  const pay = signalOf(problem, "pay");
  const base = { key: "paid" as DimensionKey, label: "Paid today", rule: "docs/RULES.md § 11, docs/PAIN_FUNNEL.md § G2" };

  if (pay && pay.value === 0) {
    return { ...base, verdict: "no", citation: citeField("signals.pay", pay.note || "checked: nobody pays") };
  }

  const money = evidenceOfType(problem, PAID_TODAY_EVIDENCE_TYPES);
  if (money) return { ...base, verdict: "yes", citation: citeEvidence(money) };

  if (pay && pay.value !== null && pay.value >= 1) {
    return { ...base, verdict: "yes", citation: citeField("signals.pay", pay.note) };
  }

  return { ...base, verdict: "unknown" };
}

/**
 * Repeats — `docs/PAIN_FUNNEL.md` § G3: the same workflow at three or more independent firms or roles.
 *
 * Counts distinct source URLs, which is a proxy: three pages from three firms is what we want, three
 * pages from one firm is not, and nothing in the record can tell those apart yet. Under three
 * sources the answer is `unknown`, never `no` — nine quiet weeks do not prove a problem is rare.
 */
function evaluateRepeats(problem: Problem): Dimension {
  const base = { key: "repeats" as DimensionKey, label: "Repeats", rule: "docs/PAIN_FUNNEL.md § G3" };
  const sources = withUrl(problem);
  const distinct: string[] = [];
  sources.forEach((item) => {
    const url = text(item.url);
    if (distinct.indexOf(url) === -1) distinct.push(url);
  });
  if (distinct.length >= 3) {
    return { ...base, verdict: "yes", citation: citeEvidence(sources[0], `${distinct.length} distinct sources`) };
  }
  return { ...base, verdict: "unknown" };
}

/**
 * Buyer owns it — `docs/PAIN_FUNNEL.md` § G4.
 *
 * Both `buyer` and `whyTheyPay` have to be filled: a named role with no stated budget is half the
 * gate. G4 also wants a cold route to that person, and there is no field for one, so this cannot
 * report `yes` on that basis. Stated plainly rather than papered over.
 */
function evaluateBuyer(problem: Problem): Dimension {
  const base = { key: "buyer" as DimensionKey, label: "Buyer owns it", rule: "docs/PAIN_FUNNEL.md § G4" };
  if (filled(problem.buyer) && filled(problem.whyTheyPay)) {
    return { ...base, verdict: "yes", citation: citeField("buyer", problem.buyer) };
  }
  return { ...base, verdict: "unknown" };
}

/**
 * Competition — `docs/RULES.md` § 2. Three parts, answered separately and never merged.
 *
 * `moat` is the only part here that can come back `no`, and it does so from a signal a person
 * answered. **Below 2 is a `no`** — the tally's own scale puts `0` at "copied in weeks" and `3` at
 * "two advantages, compounding", so `1` is a wedge that is not defended. A checked `1` used to come
 * back as `unknown`, which discarded somebody's answer: the one thing this project forbids is a
 * checked value behaving like a blank.
 */
function evaluateCompetition(problem: Problem): Dimension {
  const moat = signalOf(problem, "moat");
  const price = evidenceOfType(problem, ["price"]);
  const companies = problem.companyIds.filter((id) => text(id).length > 0);

  const moatValue = moat && moat.value !== null ? moat.value : null;
  const moatVerdict: Verdict = moatValue === null ? "unknown" : moatValue >= 2 ? "yes" : "no";
  const moatCitation =
    moatValue === null
      ? undefined
      : citeField("signals.moat", moat && moat.note ? moat.note : moatValue >= 2 ? "checked: hard to copy" : "checked: not hard to copy");

  const parts: Part[] = [
    part("companies", "Relevant companies are known", companies.length > 0 ? "yes" : "unknown", companies.length > 0 ? citeField("companyIds", `${companies.length} linked`) : undefined),
    part("prices", "What they charge is known", price ? "yes" : "unknown", price ? citeEvidence(price) : undefined),
    part("moat", "Hard to copy", moatVerdict, moatCitation)
  ];

  const verdict = verdictFromParts(parts);
  return {
    key: "competition",
    label: "Competition",
    rule: "docs/RULES.md § 2",
    verdict,
    citation: parts.find((item) => item.verdict !== "yes")?.citation ?? parts[0].citation,
    parts
  };
}

/**
 * Kill reason — `docs/RULES.md` § 4: it has to name the strongest reason not to build this today.
 *
 * "Needs more research" is not a reason and comes back `no`. An empty kill reason is `unknown`:
 * nobody has written one yet, which is different from having written a bad one.
 *
 * A substantive reason is `yes` whatever words it uses, including ones this file never thought of
 * — see the comment on `evaluateKill` for why the vocabulary list was removed.
 */
/**
 * Kill reason — `docs/RULES.md` § 4: it has to name the strongest reason not to build this today.
 *
 * The rule lists the kinds of reason that count, but a keyword allowlist is the wrong way to check
 * it. Measured against the seeded records on 2026-10-03, the allowlist called two of the three
 * written reasons a `no`: "Fund administrators buy through procurement … needs a committee" and
 * "Retail buyer. Individuals pay least and churn fastest." Both are real reasons that happen not to
 * use the words on the list. A false `no` costs a point and mis-ranks the record, and a vocabulary
 * check cannot tell a good reason from a bad one anyway — only whether I guessed the word.
 *
 * So the check looks for the failure the rule actually names, in its own words: a *deferral* instead
 * of a reason. "Needs more research" is not enough, and that is the whole of the check. `no` for a
 * deferral, `yes` for anything else somebody wrote, `unknown` when the field is empty — because
 * nobody having written one is not the same as having written a bad one.
 *
 * This is deliberately weaker than a vocabulary list, and the trade is on purpose: a reason is shown
 * beside its verdict for a person to judge. What it must never do is punish a record for a reason
 * that is better than the words I happened to think of.
 */
const KILL_DEFERRALS = ["more research", "needs research", "to be determined", "tbd", "unclear", "not sure", "no idea", "look into", "need to check"];

function evaluateKill(problem: Problem): Dimension {
  const base = { key: "kill" as DimensionKey, label: "Kill reason", rule: "docs/RULES.md § 4" };
  const reason = text(problem.killReason);
  if (!reason) return { ...base, verdict: "unknown" };
  const lowered = reason.toLowerCase();
  const deferral = KILL_DEFERRALS.some((phrase) => lowered.indexOf(phrase) !== -1);
  return { ...base, verdict: deferral ? "no" : "yes", citation: citeField("killReason", reason) };
}

/**
 * Citation integrity — the rule the repo already tests on its seeds: nothing is labelled `direct`
 * unless the link was opened.
 *
 * Evidence with no source at all is not judged here; a personal observation is a legitimate row. With
 * no evidence there is nothing to check, so the answer is `unknown` rather than a free `yes`.
 */
function evaluateCitations(problem: Problem): Dimension {
  const base = { key: "citations" as DimensionKey, label: "Citation integrity", rule: "nothing is `direct` on an unopened link" };
  const sourced = withUrl(problem);
  if (sourced.length === 0) return { ...base, verdict: "unknown" };
  const offenders = sourced.filter((item) => item.confidence === "direct" && item.linkStatus !== "checked");
  if (offenders.length > 0) {
    return { ...base, verdict: "no", citation: citeEvidence(offenders[0], "claimed direct, link never opened") };
  }
  return { ...base, verdict: "yes", citation: citeEvidence(sourced[0], `${sourced.length} sourced rows, all claims match their link status`) };
}

const evaluators: { [key in DimensionKey]: (problem: Problem) => Dimension } = {
  wedge: evaluateWedge,
  paid: evaluatePaid,
  repeats: evaluateRepeats,
  buyer: evaluateBuyer,
  competition: evaluateCompetition,
  kill: evaluateKill,
  citations: evaluateCitations
};

// ---------------------------------------------------------------- the number

/**
 * Turns verdicts into the score. Separate from `analyse` so a caller holding verdicts — a test, or a
 * surface showing a what-if — can compute the same number without a Problem.
 *
 * `max === 0` means nothing was answered, and the score is `null` rather than `0`. Zero is a real
 * reading ("checked, and everything is no"); no reading at all is not.
 */
export function summarise(dimensions: Dimension[]): Analysis {
  const answeredDimensions = dimensions.filter((dimension) => dimension.verdict !== "unknown");
  const raw = answeredDimensions.reduce(
    (sum, dimension) => sum + (dimension.verdict === "yes" ? WEIGHTS[dimension.key] : -WEIGHTS[dimension.key]),
    0
  );
  const max = answeredDimensions.reduce((sum, dimension) => sum + WEIGHTS[dimension.key], 0);
  const firstUnmet = dimensions.find((dimension) => dimension.verdict !== "yes");

  // `score` is the proportion of met dimensions **over the dimensions actually answered**, and the
  // base is reported beside it. It deliberately does not fold completeness in: doing that would make
  // an `unknown` contribute a discounted value, which is treating it as a midpoint between yes and
  // no, and an unknown is neither. Completeness is its own quantity, shown and sorted on — see
  // `compareByScore`.
  return {
    rubricVersion: RUBRIC_VERSION,
    dimensions,
    raw,
    max,
    answered: answeredDimensions.length,
    score: max === 0 ? null : Math.round(((raw + max) / (2 * max)) * 10),
    unknown: dimensions.filter((dimension) => dimension.verdict === "unknown").map((dimension) => dimension.key),
    blocking: firstUnmet ? firstUnmet.key : null
  };
}

/** The seven questions, answered, and one number 0-10 with its inputs intact. */
export function analyse(problem: Problem): Analysis {
  return summarise(dimensionDefs.map((def) => evaluators[def.key](problem)));
}

/**
 * Whether a person's rating has to come with a reason.
 *
 * Only when the machine has an opinion to disagree with. If nothing was answered there is no score,
 * and asking someone to explain a disagreement with a blank is nonsense.
 */
export function requiresReason(rating: number, score: number | null): boolean {
  if (score === null) return false;
  return Math.abs(rating - score) > DIVERGENCE_THRESHOLD;
}

/**
 * The order a board should use when sorting by the machine's judgement.
 *
 * **Completeness first, then the score.** Not a tie-break — first. The same rule
 * `docs/PAIN_FUNNEL.md` § Part 2 already uses for the cited ordering, where fewest unanswered
 * questions sorts above the tally.
 *
 * It has to be first because the score is a proportion, so an almost untouched record scores 10 when
 * the two dimensions anybody has looked at both hold up. Measured over the seeded records on
 * 2026-10-03: P-002, two of seven checked, scored 10/10 — the same as P-001 with six of seven checked
 * and one known hole. Sorted by score alone the least-examined record wins, which is backwards. The
 * base is always shown beside the number as well, but a number and a caveat can be read apart, and
 * an order cannot.
 */
export function compareByScore(a: Analysis, b: Analysis): number {
  if (b.answered !== a.answered) return b.answered - a.answered;
  return (b.score === null ? -1 : b.score) - (a.score === null ? -1 : a.score);
}
