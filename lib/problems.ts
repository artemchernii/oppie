// oppie.lab — problem model, scoring dimensions and seed data.
//
// Framework-free: safe to import from client or server, and compiled by `pnpm test`
// so the storage rules can be exercised in plain Node.
//
// Three axes, deliberately separate (see PAIN_FUNNEL.md):
//   gate    — how far the evidence goes
//   action  — what we are doing about it
//   verdict — the decision

export type Gate = "G1-signal" | "G2-paid" | "G3-repeated" | "G4-buyer" | "G5-tested";
export type Action = "idle" | "researching" | "interviewing" | "hand-running" | "building";
export type Verdict = "open" | "parked" | "killed";
export type Confidence = "direct" | "reported" | "inferred";
/**
 * Whether the link itself still resolves. Job postings are deleted once filled, so a
 * dead source is normal — but it has to be visible, or the record quietly becomes a
 * claim with nothing behind it.
 */
export type LinkStatus = "checked" | "dead" | "unverified";
export type EvidenceType = "job" | "price" | "procurement" | "community" | "report" | "personal";

/** null means NOT CHECKED. It is never the same as 0, which means checked and zero. */
export type Score = 0 | 1 | 2 | 3 | null;

export const gates: Gate[] = ["G1-signal", "G2-paid", "G3-repeated", "G4-buyer", "G5-tested"];
export const actions: Action[] = ["idle", "researching", "interviewing", "hand-running", "building"];
export const verdicts: Verdict[] = ["open", "parked", "killed"];
export const confidences: Confidence[] = ["direct", "reported", "inferred"];
export const evidenceTypes: EvidenceType[] = ["job", "price", "procurement", "community", "report", "personal"];

/** Plain-English names, because the user should not have to hold a legend in their head. */
export const gateCopy: Record<Gate, { short: string; label: string; ask: string }> = {
  "G1-signal": { short: "G1", label: "Signal", ask: "Do we have one real example, with a source?" },
  "G2-paid": { short: "G2", label: "Someone pays", ask: "Is money or a salary already going at this work?" },
  "G3-repeated": { short: "G3", label: "Repeats", ask: "Do three separate firms describe the same thing?" },
  "G4-buyer": { short: "G4", label: "One buyer", ask: "Is there one named role who can say yes without a committee?" },
  "G5-tested": { short: "G5", label: "Hand-run", ask: "Did we do the work by hand for one buyer and see the result?" }
};

export const verdictCopy: Record<Verdict, string> = {
  open: "Open",
  parked: "Parked",
  killed: "Killed"
};

export type SignalKey = "pain" | "pay" | "moat" | "speed" | "cost";

export type Signal = {
  key: SignalKey;
  question: string;
  value: Score;
  /** The reason. A score without a note here is a guess, and the UI says so. */
  note: string;
};

export type SignalDef = {
  key: SignalKey;
  label: string;
  question: string;
  scale: [string, string, string, string];
};

/**
 * Five questions, each answered 0–3. This is the "can I actually build this" tally.
 *
 * It is a JUDGEMENT SUM, not a probability. A real probability would need base rates
 * from many past attempts, which do not exist yet. The UI labels it that way.
 */
export const signalDefs: SignalDef[] = [
  {
    key: "pain",
    label: "Must they fix it?",
    question: "If they do nothing, what happens?",
    scale: ["Nice to have", "Annoying", "Costly or risky", "Deadline or penalty"]
  },
  {
    key: "pay",
    label: "Are they already paying?",
    question: "Is money or a salary going at this today?",
    scale: ["Nobody pays", "A tool exists, unbought", "A partial tool or contractor", "A salary or a contract"]
  },
  {
    key: "moat",
    label: "Could someone copy it?",
    question: "What stops a competitor doing the same next month?",
    scale: ["Copied in weeks", "Execution lead only", "One real advantage", "Two or more, compounding"]
  },
  {
    key: "speed",
    label: "How fast could you get paid?",
    question: "Time from today to the first invoice.",
    scale: ["Over 6 months", "3–6 months", "4–12 weeks", "Under 4 weeks"]
  },
  {
    key: "cost",
    label: "What does a real test cost?",
    question: "Money to get a signal that would change your mind.",
    scale: ["Over €2,000", "€500–2,000", "€50–500", "Under €50"]
  }
];

export const SIGNAL_MAX = 15;

export const blankSignals = (): Signal[] => signalDefs.map((def) => ({ key: def.key, question: def.question, value: null, note: "" }));

export type Company = {
  id: string;
  name: string;
  kind: "employer" | "vendor" | "bespoke";
  where: string;
  role: string;
  /** The money, verbatim. Empty string renders as "Not added yet". */
  number: string;
  numberLabel: string;
  url: string;
  confidence: Confidence;
  linkStatus: LinkStatus;
};

export type Evidence = {
  id: string;
  type: EvidenceType;
  observation: string;
  url: string;
  date: string;
  confidence: Confidence;
  linkStatus?: LinkStatus;
};

export type Problem = {
  id: string;
  title: string;
  gate: Gate;
  action: Action;
  verdict: Verdict;
  domain: string;
  /** Geography this record is being tested in. */
  market: string;
  what: string;
  affectedRole: string;
  buyer: string;
  workaround: string;
  frequency: string;
  consequence: string;
  whyTheyPay: string;
  paidToday: string;
  competition: string;
  path: "service" | "product" | "undecided";
  signals: Signal[];
  nextQuestion: string;
  unknowns: string;
  killReason: string;
  evidence: Evidence[];
  companyIds: string[];
  createdAt: string;
  updatedAt: string;
};

export const SEED_TIMESTAMP = "2026-10-01T09:00:00.000Z";

export const emptyProblem = (id: string): Problem => ({
  id,
  title: "",
  gate: "G1-signal",
  action: "idle",
  verdict: "open",
  domain: "",
  market: "",
  what: "",
  affectedRole: "",
  buyer: "",
  workaround: "",
  frequency: "",
  consequence: "",
  whyTheyPay: "",
  paidToday: "",
  competition: "",
  path: "undecided",
  signals: blankSignals(),
  nextQuestion: "",
  unknowns: "",
  killReason: "",
  evidence: [],
  companyIds: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

/** Readiness = sum of the checked signals. Blanks are counted, never treated as zero. */
export function readiness(problem: Problem): { total: number; max: number; checked: number; unchecked: number; uncited: number } {
  const values = problem.signals.map((signal) => signal.value);
  const checked = values.filter((value): value is 0 | 1 | 2 | 3 => value !== null);
  return {
    total: checked.reduce<number>((sum, value) => sum + value, 0),
    max: SIGNAL_MAX,
    checked: checked.length,
    unchecked: values.length - checked.length,
    uncited: problem.signals.filter((signal) => signal.value !== null && !signal.note.trim()).length
  };
}

/**
 * Ordering per PAIN_FUNNEL.md: furthest gate first, then completeness, then the tally.
 *
 * Completeness comes before the tally on purpose. A total with blanks is not comparable
 * to a total without: 12/15 with a question unanswered is a weaker claim than 10/15 with
 * every question answered, and sorting by the number alone would hide that.
 */
export function rankProblems(problems: Problem[]): Problem[] {
  const gateIndex = (gate: Gate) => gates.indexOf(gate);
  return [...problems].sort((a, b) => {
    const byGate = gateIndex(b.gate) - gateIndex(a.gate);
    if (byGate !== 0) return byGate;
    const ra = readiness(a);
    const rb = readiness(b);
    if (ra.unchecked !== rb.unchecked) return ra.unchecked - rb.unchecked;
    return rb.total - ra.total;
  });
}

/** Every gate this record has already cleared, for the funnel badge. */
export function passedGates(problem: Problem): Gate[] {
  return gates.slice(0, gates.indexOf(problem.gate) + 1);
}

export const seedCompanies: Company[] = [
  {
    id: "c-duco",
    name: "Duco",
    kind: "vendor",
    where: "London / global",
    role: "Cloud reconciliation for financial markets — no-code, AI-assisted exception handling, specifically positioned at structured and unstructured data",
    number: "$80,000/yr",
    numberLabel: "third-party report for a capacity package of 100k daily records / 50 process inputs, with reported $40k per additional 100k records — a sizing reference, not a quote",
    url: "https://idp-software.com/vendors/duco/",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-reconart",
    name: "ReconArt",
    kind: "vendor",
    where: "US / global",
    role: "Reconciliation and financial close — securities, positions, trades and custody, with private-cloud and on-premises options",
    number: "$300/user/month",
    numberLabel: "published by Capterra and Software Advice as a starting price; Essentials tier is 25M transactions/year. Enterprise is fixed-licence with no transaction pricing",
    url: "https://www.reconart.com/plans/",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-advisor-stack",
    name: "The advisor platform stack (Orion, Tamarac, Black Diamond)",
    kind: "vendor",
    where: "US (sells to RIAs)",
    role: "Portfolio management and performance reporting — the software category that also performs custodian reconciliation",
    number: "$8,000–$25,000/yr",
    numberLabel: "reported range for this category; the same source puts CRM at $2,400–18,000 and financial planning at $2,400–9,600, and says portfolio accounting is the most expensive category advisors buy",
    url: "https://www.techvera.com/resources/blog/what-it-costs-to-run-compliant-ria-technology-stack-in-2026",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-jjsearch",
    name: "JJ Search Ltd (agency, for a City firm)",
    kind: "employer",
    where: "City of London, UK",
    role: "Reconciliations Analyst, Custody Services, CASS 6 & 7 — daily and periodic cash and asset reconciliations, including Unit Trust reconciliations",
    number: "£35,000–£50,000/yr",
    numberLabel: "advertised salary, on the posting",
    url: "https://www.totaljobs.com/job/jj-search-ltd-job107248594",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-lgt",
    name: "LGT Wealth Management UK",
    kind: "employer",
    where: "London, UK",
    role: "Reconciliations & Custody Control Analyst — daily and periodic cash and asset reconciliations",
    number: "£80,000–£100,000/yr",
    numberLabel: "advertised salary, on the posting",
    url: "https://gb.trabajo.org/job-3364-d6f10d7b6557f6788bdd8641149b4c3c",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-optio",
    name: "Optio Incentives",
    kind: "employer",
    where: "London, UK",
    role: "Senior Reconciliation Analyst — the firm says it is *establishing* a dedicated Reconciliation & Operations function, which is someone deciding to spend money on this now",
    number: "£80,000–£100,000/yr",
    numberLabel: "advertised salary, on the posting",
    url: "https://gb.trabajo.org/job-3364-5e2016724caaf455c1d02404a1d58039",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-rbc",
    name: "RBC Global Asset Management UK",
    kind: "employer",
    where: "London, UK",
    role: "Reconciliations Analyst — cash balances, transactions, positions (stock and listed derivatives) and intra-system reconciliations",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://www.sercanto.co.uk/detail/a/reconciliations-analyst_london_442139932",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-janus",
    name: "Janus Henderson",
    kind: "employer",
    where: "Budapest, HU",
    role: "Reconciliation Analyst — custody (IBOR), performance (PBOR), ABOR vs IBOR, client market value",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://jobs.janushenderson.com/job/Budapest-Reconciliation-Analyst-1133/1392859800/",
    confidence: "reported",
    linkStatus: "checked"
  },
  {
    id: "c-exalt",
    name: "eXalt-Fi",
    kind: "employer",
    where: "Lisbon, PT",
    role: "Funds Reconciliation Specialist",
    number: "€30–45k/yr",
    numberLabel: "typical Lisbon band, not stated on the posting",
    url: "https://pt.linkedin.com/jobs/view/4444368636",
    confidence: "inferred",
    linkStatus: "unverified"
  },
  {
    id: "c-nordea",
    name: "Nordea Investment Banking",
    kind: "employer",
    where: "Portugal",
    role: "Operational Analyst, Backoffice Reconciliation",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://www.canarywharfian.co.uk/jobs/nordea-investment-banking/operational-analyst-in-reconciliation-nam-portugal/3476c9ca-97ae-48e1-a285-0d2f7f013e7b",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-mediolanum",
    name: "Mediolanum International",
    kind: "employer",
    where: "Dublin, IE",
    role: "Senior Portfolio Operations Analyst — reconciliation and transaction exceptions across asset classes",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://workfinder.ie/senior-portfolio_dublin-c275009/2026-09-mediolanum-international-ireland_i4189872755",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-simcorp",
    name: "SimCorp",
    kind: "employer",
    where: "Europe",
    role: "Senior Operations Analyst (Reconciliations) — middle office and investment accounting",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://simcorp.wd3.myworkdayjobs.com/en-US/SimCorp_Jobs/job/Senior-Operations-Analyst--Reconciliations-_R-211490",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-dodgecox",
    name: "Dodge & Cox",
    kind: "employer",
    where: "San Francisco, US",
    role: "Reconciliation Analyst / Investment Operations Process Analyst — custodian reconciliation **and** building Python, SQL and AI-enabled automation for the same workflows. This is a firm paying six figures for the person who removes the manual step",
    number: "$125,000–$170,000/yr",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://builtin.com/job/reconciliation-analyst-investment-operations-process-analyst/11290458",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-ares",
    name: "Ares Management",
    kind: "employer",
    where: "New York, US",
    role: "Senior Associate, Investment Operations — Reconciliations. “Proactively research, resolve and prevent all cash and par breaks with custodian banks and third-party administrators”",
    number: "$130,000–$150,000/yr",
    numberLabel: "advertised salary range, on the posting",
    url: "https://hiring.camp/job/dg2p1X",
    confidence: "reported",
    linkStatus: "unverified"
  },
  {
    id: "c-blackboard",
    name: "European private bank (via Blackboardjob)",
    kind: "employer",
    where: "Lisbon, PT",
    role: "Senior Fund Reconciliation Analyst — trade settlement matching, cash and stock breaks against external custodians",
    number: "€30–45k/yr",
    numberLabel: "typical Lisbon band, not stated on the posting",
    url: "https://pt.blackboardjob.com/detail/a/senior-fund-reconciliation-analyst-advanced-asset-servicing_lisboa_21301896",
    confidence: "inferred",
    linkStatus: "dead"
  },
  {
    id: "c-citi",
    name: "Citi",
    kind: "employer",
    where: "Bogotá, CO",
    role: "Custody Portfolio Reconciliation Analyst — client and fiduciary balances across local and international custodians",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://jobs.citi.com/job/bogota/custody-portfolio-reconciliation-analyst/287/98742239840",
    confidence: "reported",
    linkStatus: "dead"
  },
  {
    id: "c-clearstream",
    name: "Deutsche Börse / Clearstream",
    kind: "employer",
    where: "Cork, IE",
    role: "Analyst, Securities Reconciliations — positions held against external custodians",
    number: "",
    numberLabel: "budget restated as a role, salary not published",
    url: "https://careers.deutsche-boerse.com/offer/analyst-securities-reconciliations/0fc7b8c9-f5f4-4ec2-a906-7410eb534435",
    confidence: "reported",
    linkStatus: "dead"
  },
  {
    id: "c-panoramix",
    name: "Panoramix",
    kind: "vendor",
    where: "US (sells to RIAs)",
    role: "Portfolio management, performance reporting and billing",
    number: "$5,000–$7,000/yr",
    numberLabel: "published firm licence: $7,000/yr at $175M AUM is visible on the page; the lower tiers come from the same price list",
    url: "https://www.panoramixfinancial.com/account/pricing/",
    confidence: "direct",
    linkStatus: "checked"
  },
  {
    id: "c-panoramix-import",
    name: "Panoramix (import service)",
    kind: "vendor",
    where: "US (sells to RIAs)",
    role: "Historical and transactional data import",
    number: "up to tens of thousands",
    numberLabel: "charged by effort — the step the licence does NOT cover",
    url: "https://www.panoramixfinancial.com/account/pricing/",
    confidence: "direct",
    linkStatus: "checked"
  },
  {
    id: "c-orion",
    name: "Orion Advisor Tech",
    kind: "vendor",
    where: "US (sells to RIAs)",
    role: "Portfolio accounting — claims #1 market share, direct custodian reconciliation overnight",
    number: "",
    numberLabel: "price not published; competitors cite 0.05–0.15% of AUM per year",
    url: "https://orion.com/advisor-tech/portfolio-accounting",
    confidence: "inferred",
    linkStatus: "unverified"
  },
  {
    id: "c-bespoke-dev",
    name: "Freelance developer (r/fintech)",
    kind: "bespoke",
    where: "Unknown",
    role: "Built custodian-statement ingestion, normalisation and FX for a solo RIA",
    number: "one bespoke build",
    numberLabel: "says it is a one-off for one client, not a product",
    url: "https://www.reddit.com/r/fintech/comments/1w1y3ms/developing_internal_portfolio_tooling_for_a_solo/",
    confidence: "reported",
    linkStatus: "unverified"
  }
];

const RECON_SIGNALS = (): Signal[] => [
  {
    key: "pain",
    question: signalDefs[0].question,
    value: 3,
    note: "A daily legal obligation, not a preference: FCA CASS 7.15.12 R requires an internal client money reconciliation every business day, and CASS 6.6.11 R requires internal custody reconciliation. Failure carries regulatory penalty."
  },
  {
    key: "pay",
    question: signalDefs[1].question,
    value: 3,
    note: "Paid four ways now: advertised salaries of £35–50k and £80–100k in London and $125–170k in San Francisco, software licences (Panoramix $5–7k, advisor platforms $8–25k, Duco $80k), bespoke custom builds, and public procurement contracts for exactly this work."
  },
  {
    key: "moat",
    question: signalDefs[2].question,
    value: 1,
    note: "No moat. Execution and trust only — a competent rival could copy it."
  },
  {
    key: "speed",
    question: signalDefs[3].question,
    value: 2,
    note: "A paid manual run could be invoiced inside 4–12 weeks."
  },
  {
    key: "cost",
    question: signalDefs[4].question,
    value: 3,
    note: "Interviews and one hand-run job cost under €50."
  }
];

export const seedProblems: Problem[] = [
  {
    id: "P-001",
    title: "Broker files from several sources do not fit together",
    gate: "G3-repeated",
    action: "researching",
    verdict: "open",
    domain: "Portfolio operations",
    market: "London · Dublin · Amsterdam (not Portugal alone)",
    what: "Holdings and transactions arrive from several brokers in different file shapes, so a person normalises them by hand before any report can be produced.",
    affectedRole: "Fund administrator / asset-servicing ops team",
    buyer: "Head of Fund Operations",
    workaround: "CSV cleanup, spreadsheets, manual imports",
    frequency: "Every reporting cycle, monthly to quarterly",
    consequence: "Staff hours, delayed reports, and errors that reach the client",
    whyTheyPay: "The licence is paid for already. The import step is the part that still costs staff time.",
    paidToday: "Yes — a salaried reconciliation role, plus a software licence at $5–7k/yr, plus a separate charge for data import",
    competition: "Served at both ends and not in the middle. Enterprise reconciliation is priced at $80k/yr (Duco) or $300/user/month (ReconArt). Advisor platforms are $8–25k/yr and reconcile directly with US custodians (Schwab, Fidelity, Pershing). Europe’s fragmented broker and custodian files fit neither.",
    path: "product",
    signals: RECON_SIGNALS(),
    nextQuestion: "Does anyone sell statement ingestion on its own, and what does one import cost in staff hours?",
    unknowns: "Whether a European firm would buy from a new entrant rather than hiring or commissioning a build.",
    killReason: "Fund administrators buy through procurement. If every reachable buyer needs a committee, the small test is impossible.",
    evidence: [
      {
        id: "P-001-e1",
        type: "price",
        observation: "Panoramix publishes $5,000–$7,000/yr by AUM, and bills historical/transactional data import separately, by effort, at up to tens of thousands.",
        url: "https://www.panoramixfinancial.com/account/pricing/",
        date: "2026-10-01",
        confidence: "direct",
        linkStatus: "checked"
      },
      {
        id: "P-001-e2",
        type: "price",
        observation: "A freelance developer built custodian-statement ingestion, normalisation and FX for a solo RIA — and says it is a one-off for one client, not a product.",
        url: "https://www.reddit.com/r/fintech/comments/1w1y3ms/developing_internal_portfolio_tooling_for_a_solo/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-001-e3",
        type: "community",
        observation: "Advisors choose multiple custodians deliberately — \"we've always had at least two in order to pin the one against the other in pricing\".",
        url: "https://www.reddit.com/r/CFP/comments/1ind3wn/ria_multicustodian/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-001-e4",
        type: "procurement",
        observation: "A public pension fund RFP buys “portfolio verification and shadow accounting services for independent, automated reconciliations with the Custodian bank and external managers’ records”. A named buyer, writing down exactly this workflow as something it contracts for.",
        url: "https://www.sib.wa.gov/docs/searches/2505.pdf",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-001-e5",
        type: "procurement",
        observation: "A second custody RFP specifies the mechanics: “Custodian provides outside Investment Manager with a file of custodial data to which the reconciliation at the account level of cash, holdings, income, receivables/payables and market value is performed”. The file handover is a contract requirement.",
        url: "https://www.sbcers.org/wp-content/uploads/01_2023-SBCERS-Custody-RFP-CONSOLIDATED-Final-Updated.pdf",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-001-e6",
        type: "report",
        observation: "F2 Strategy, surveying 29 firms representing $6tn: about 67% of firms run more than one custodian, 71% of advisors name lack of integration between tools as a top technology problem, and custodian satisfaction fell to 3.4 out of 5 in 2025 from 3.6 in 2023.",
        url: "https://www.wealthsolutionsreport.com/custody-is-getting-a-second-act-most-rias-are-stuck-in-the-first/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-001-e7",
        type: "price",
        observation: "Enterprise reconciliation is already a priced category at the top: a third-party report puts Duco at $80,000/yr for a 100k-daily-record capacity package, with $40,000 increments per additional 100k records. ReconArt’s published starting price is $300/user/month.",
        url: "https://idp-software.com/vendors/duco/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      }
    ],
    companyIds: ["c-duco", "c-reconart", "c-advisor-stack", "c-panoramix", "c-panoramix-import", "c-orion", "c-bespoke-dev"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-006",
    title: "Trades, settlements and collateral do not reconcile across back-office systems",
    gate: "G2-paid",
    action: "researching",
    verdict: "open",
    domain: "Treasury operations",
    market: "London · Dublin · Budapest",
    what: "Treasury teams match trades, settlements, collateral, fees and regulatory reports across several back-office systems, and investigate whatever does not match.",
    affectedRole: "Treasury / middle-office operations team",
    buyer: "Head of Middle Office",
    workaround: "Staff-intensive daily procedures and exception queues",
    frequency: "Daily",
    consequence: "Fails to settle, breaks, and regulatory reports that cannot be signed off",
    whyTheyPay: "They already pay for exactly this — the job description is the workflow.",
    paidToday: "Yes — multiple live postings in Lisbon, Dublin, London and Budapest. Lisbon band €30–45k/yr; London collateral £45–60k/yr.",
    competition: "Served at the top by Duco ($80k/yr) and ReconArt ($300/user/month), both priced well above a mid-size firm. Below that: spreadsheets and email. The gap is the middle.",
    path: "service",
    signals: RECON_SIGNALS(),
    nextQuestion: "Does a team this size buy tooling, or only hire people?",
    unknowns: "Reachability. The best-evidenced record is also the least reachable — enterprise procurement.",
    killReason: "Enterprise procurement. If a small paid test is impossible, this cannot be tested at the current scale.",
    evidence: [
      {
        id: "P-006-e1",
        type: "job",
        observation: "Senior Fund Reconciliation Analyst, Lisbon: matching complex trade settlements, analysing cash/stock breaks, aligning holdings with external custodians.",
        url: "https://pt.blackboardjob.com/detail/a/senior-fund-reconciliation-analyst-advanced-asset-servicing_lisboa_21301896",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "dead"
      },
      {
        id: "P-006-e2",
        type: "job",
        observation: "Citi Custody Portfolio Reconciliation Analyst — \"safeguarding the accuracy and integrity of client and fiduciary securities and cash balances across local and international custodians\".",
        url: "https://jobs.citi.com/job/bogota/custody-portfolio-reconciliation-analyst/287/98742239840",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "dead"
      },
      {
        id: "P-006-e3",
        type: "report",
        observation: "London salary guides: trade support £40–55k (average £49k); collateral management £45–60k (average £56.8k).",
        url: "https://www.robertwalters.co.uk/content/dam/robert-walters-redesign/country/united-kingdom/files/salary-survey/UK-Robert-Walters-Salary-Survey.pdf",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-006-e4",
        type: "report",
        observation: "FCA CASS 7.15.12 R requires a firm to carry out an internal client money reconciliation every business day, and CASS 6.6.11 R requires internal custody reconciliation. Not a preference — a daily legal obligation with a penalty attached.",
        url: "https://handbook.fca.org.uk/handbook/cass7/cass7s22",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-006-e5",
        type: "job",
        observation: "Dodge & Cox advertises $125,000–$170,000 for a reconciliation analyst who also builds Python, SQL and AI-enabled automation for the same workflows — a firm paying six figures for the person who removes the manual step.",
        url: "https://builtin.com/job/reconciliation-analyst-investment-operations-process-analyst/11290458",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-006-e6",
        type: "job",
        observation: "Ares Management advertises $130,000–$150,000 for a senior associate to “proactively research, resolve and prevent all cash and par breaks with custodian banks and third-party administrators”.",
        url: "https://hiring.camp/job/dg2p1X",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      }
    ],
    companyIds: ["c-jjsearch", "c-lgt", "c-optio", "c-rbc", "c-ares", "c-janus", "c-exalt", "c-nordea", "c-mediolanum", "c-simcorp", "c-dodgecox", "c-blackboard", "c-citi", "c-clearstream"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-003",
    title: "Broker statements, bank records and internal books disagree",
    gate: "G2-paid",
    action: "idle",
    verdict: "open",
    domain: "Reconciliation",
    market: "London · Dublin",
    what: "Three sets of records disagree, so a person exports each system, compares them, and emails to find out why.",
    affectedRole: "Accounting / finance operations team",
    buyer: "Finance Operations Manager",
    workaround: "Export each system, compare manually, email for clarification",
    frequency: "Monthly close",
    consequence: "Close slips, and the same exceptions return every month",
    whyTheyPay: "The same workflow is a salaried role elsewhere in the sector.",
    paidToday: "Yes — same workflow as the paid reconciliation roles above.",
    competition: "Not checked.",
    path: "service",
    signals: RECON_SIGNALS(),
    nextQuestion: "Which exceptions repeat every month, and who is paid to resolve them?",
    unknowns: "Whether the repeated exceptions are the same ones, or a random set each time.",
    killReason: "",
    evidence: [
      {
        id: "P-003-e1",
        type: "community",
        observation: "Accounting teams describe mismatches between processor, bank and internal data, with manual exception handling.",
        url: "https://www.reddit.com/r/Accounting/comments/1t3wx6j/anyone_dealing_with_reconciliation_across/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      }
    ],
    companyIds: ["c-exalt", "c-panoramix", "c-duco", "c-reconart"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-002",
    title: "A multi-broker investor cannot see allocation, performance and FX in one place",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Investing",
    market: "—",
    what: "Someone holding accounts at several brokers cannot total them up accurately, especially across currencies.",
    affectedRole: "Self-directed investor (RETAIL — pays least, churns fastest)",
    buyer: "",
    workaround: "Excel, several tracker apps, manual updates",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Not checked",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "Rewrite with a company buyer, or park it.",
    unknowns: "Everything. The buyer is retail, which is out of target.",
    killReason: "Retail buyer. Individuals pay least and churn fastest.",
    evidence: [
      {
        id: "P-002-e1",
        type: "community",
        observation: "European investors describe multi-broker fragmentation, inconsistent exports and FX confusion, with spreadsheet workarounds.",
        url: "https://www.reddit.com/r/eupersonalfinance/comments/1sx3z2l/tracking_your_portfolio_in_the_eu_is_messier_than/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      }
    ],
    companyIds: [],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-004",
    title: "Portfolio tools handle shares but break down on bonds, funds and private assets",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Investing",
    market: "—",
    what: "Common tools cope with listed equities, then require manual entry for anything less standard.",
    affectedRole: "Advisor OR investor (TWO buyers named — must pick one)",
    buyer: "",
    workaround: "Manual transactions, custom spreadsheets",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Not checked",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "Pick the advisor as the buyer and drop the investor, or park it.",
    unknowns: "Which asset class creates the most unrecoverable work.",
    killReason: "",
    evidence: [],
    companyIds: [],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-005",
    title: "Currencies and methods make performance hard to explain to a client",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Reporting",
    market: "—",
    what: "FX conversion and method choices mean the number differs depending on how you compute it, which is hard to defend in a client meeting.",
    affectedRole: "Advisor / family-office operator",
    buyer: "",
    workaround: "Manual FX conversions and custom formulas",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Not checked",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "Is this billed to a client, and is anyone paid specifically for it?",
    unknowns: "Whether this is monthly work or an occasional annoyance.",
    killReason: "",
    evidence: [],
    companyIds: [],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-007",
    title: "A client report needs PDFs, spreadsheets and screenshots in one pack",
    gate: "G1-signal",
    action: "researching",
    verdict: "open",
    domain: "Reporting",
    market: "London · Dublin",
    what: "Evidence and numbers for a client report sit in folders, inboxes and custodial portals, so somebody rebuilds the same pack by hand every cycle.",
    affectedRole: "Advisor / portfolio reporting team",
    buyer: "Head of Client Reporting",
    workaround: "Shared folders, checklists, manual document assembly",
    frequency: "Quarterly, sometimes monthly",
    consequence: "Report production eats days of advisor time that cannot be billed",
    whyTheyPay: "Reporting hours are reported as the largest non-client-facing time cost in an advisory firm, so the labour is already paid for.",
    paidToday: "Partly — reporting software is bought in this market at $5–7k/yr, but no source yet shows a firm paying specifically for the assembly step.",
    competition: "Reporting platforms exist (Orion, Black Diamond). The assembly step is not the part they sell.",
    path: "service",
    signals: [
      {
        key: "pain",
        question: signalDefs[0].question,
        value: 2,
        note: "Reported: 160–240 hours per advisor per year on portfolio reporting. Costly, but no penalty or deadline attached."
      },
      {
        key: "pay",
        question: signalDefs[1].question,
        value: 1,
        note: "Tools are bought in this market at $5–7k/yr, but nothing found yet shows a firm paying for the assembly step itself."
      },
      {
        key: "moat",
        question: signalDefs[2].question,
        value: 0,
        note: "Nothing. A folder structure and a set of templates are copied in a week."
      },
      {
        key: "speed",
        question: signalDefs[3].question,
        value: 2,
        note: "One quarterly pack produced by hand could be invoiced inside 4–12 weeks."
      },
      {
        key: "cost",
        question: signalDefs[4].question,
        value: 3,
        note: "Interviews and one hand-built pack cost under €50."
      }
    ],
    nextQuestion: "What report is produced, for whom, how often — and who builds it today?",
    unknowns: "Whether the buyer is the advisor or an operations lead, and whether they would pay for assembly alone.",
    killReason: "Weak moat. If the work is template assembly, a client could reasonably keep doing it themselves.",
    evidence: [
      {
        id: "P-007-e1",
        type: "report",
        observation: "Reported secondhand from Cerulli, via a vendor blog, so treat as advertising until checked: 160–240 hours per advisor per year on portfolio reporting, the largest non-client-facing time cost.",
        url: "https://ustechautomations.com/resources/blog/financial-services-portfolio-reporting-pain-solution-2026",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      },
      {
        id: "P-007-e2",
        type: "community",
        observation: "Advisors describe held-away and outside accounts as a manual tracking problem, mixing aggregators with hand updates.",
        url: "https://www.reddit.com/r/CFP/comments/1kyj70u/whats_your_approach_to_tracking_heldaway_assets/",
        date: "2026-10-01",
        confidence: "reported",
        linkStatus: "unverified"
      }
    ],
    companyIds: ["c-orion", "c-panoramix"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-008",
    title: "Reconciliation only works because one person remembers the rules",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Reconciliation",
    market: "—",
    what: "The mapping rules and exceptions live in one experienced head, so correctness depends on them being present.",
    affectedRole: "Small finance team",
    buyer: "",
    workaround: "Tribal knowledge, spreadsheets, handover notes",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Not checked",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "What happens when that person is away — does anything actually get bought?",
    unknowns: "Whether anyone will pay to remove a risk they have not been burned by yet.",
    killReason: "",
    evidence: [],
    companyIds: [],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-009",
    title: "Small firms need repeatable data review without enterprise software",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Portfolio operations",
    market: "—",
    what: "Small advisory and accounting firms want a repeatable way to check imported data, but the real tools are priced and sold for bigger firms.",
    affectedRole: "Small advisor / accountant",
    buyer: "",
    workaround: "Existing spreadsheet plus manual review",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Partly — licences exist at $5–7k/yr, but the import step is charged as enterprise custom work.",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "What price and client volume separates \"the spreadsheet is fine\" from \"we need help\"?",
    unknowns: "The willingness-to-pay threshold.",
    killReason: "",
    evidence: [],
    companyIds: ["c-panoramix"],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "P-010",
    title: "Audit and regulatory evidence is spread across systems",
    gate: "G1-signal",
    action: "idle",
    verdict: "open",
    domain: "Compliance",
    market: "—",
    what: "Proving completeness and ownership of an obligation means hunting through folders and chasing people by email.",
    affectedRole: "Compliance / operations lead",
    buyer: "",
    workaround: "Excel matrix, folders, email reminders",
    frequency: "",
    consequence: "",
    whyTheyPay: "",
    paidToday: "Not checked",
    competition: "Not checked.",
    path: "undecided",
    signals: blankSignals(),
    nextQuestion: "Which specific obligation causes recurring pain without us giving legal advice?",
    unknowns: "Whether this can be sold without straying into regulated advice.",
    killReason: "",
    evidence: [],
    companyIds: [],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  }
];
