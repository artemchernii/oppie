// oppie.lab — opportunity model and seed data.
//
// Shape follows MVP_SPEC.md. Framework-free: safe to import from client or server.
//
// Two status fields, deliberately orthogonal:
//   stage          — where this sits in the research pipeline
//   evidenceStatus — how strong the evidence is, and therefore what the pill says

export type Stage = "discovery" | "investigate" | "validate" | "build" | "pause" | "kill";
export type EvidenceStatus = "early" | "mixed" | "crowded";
export type SourceType = "YC" | "Reddit" | "Company" | "Pricing" | "Review" | "Job" | "Regulation" | "Acquisition" | "Other";
export type Confidence = "strong" | "moderate" | "weak";

export type Source = {
  id: string;
  type: SourceType;
  label: string;
  url: string;
  note: string;
  /** Optional on purpose. Unrated renders as "Not rated yet" — never a fabricated confidence. */
  confidence?: Confidence;
};

export type Opportunity = {
  id: string;
  title: string;
  category: string;
  thesis: string;
  stage: Stage;
  evidenceStatus: EvidenceStatus;
  /** Short editorial nuance shown beside the status pill, e.g. "Needs a wedge". */
  statusNote: string;
  evidenceSummary: string;
  unknowns: string;
  buildEstimate: string;
  pricingHypothesis: string;
  killReason: string;
  nextTest: string;
  tags: string[];
  sources: Source[];
  createdAt: string;
  updatedAt: string;
};

/** Seeds are authored, not machine-timestamped. Fixed so git diffs and tests are stable. */
export const SEED_TIMESTAMP = "2026-09-24T09:00:00.000Z";

export const stages: Stage[] = ["discovery", "investigate", "validate", "build", "pause", "kill"];
export const evidenceStatuses: EvidenceStatus[] = ["early", "mixed", "crowded"];
export const sourceTypes: SourceType[] = ["YC", "Reddit", "Company", "Pricing", "Review", "Job", "Regulation", "Acquisition", "Other"];
export const confidences: Confidence[] = ["strong", "moderate", "weak"];

/** Plain-language conclusions, derived from evidenceStatus. Per RULES.md #5: no fake precision. */
export const evidenceStatusCopy: Record<EvidenceStatus, { label: string; conclusion: string }> = {
  early: { label: "Early", conclusion: "Interesting signal, not enough evidence" },
  mixed: { label: "Mixed", conclusion: "Real evidence plus material unknowns" },
  crowded: { label: "Crowded", conclusion: "Demand may be real, generic version attacked" }
};

export const emptyOpportunity = (id: string): Opportunity => ({
  id,
  title: "",
  category: "",
  thesis: "",
  stage: "discovery",
  evidenceStatus: "early",
  statusNote: "",
  evidenceSummary: "",
  unknowns: "",
  buildEstimate: "",
  pricingHypothesis: "",
  killReason: "",
  nextTest: "",
  tags: [],
  sources: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString()
});

export const seedOpportunities: Opportunity[] = [
  {
    id: "construction-compliance",
    title: "Construction compliance",
    category: "Vertical ops",
    thesis: "A managed layer that turns messy subcontractor documents into job-ready compliance packets.",
    stage: "investigate",
    evidenceStatus: "crowded",
    statusNote: "Needs a wedge",
    evidenceSummary: "Real operational pain and budget line; YC shows active construction/compliance demand.",
    unknowns: "Who owns the problem, how often it blocks work, and whether margins survive local variation.",
    buildEstimate: "€12–20k",
    pricingHypothesis: "€500–2k / mo",
    killReason: "Generic document intelligence is already well-covered; a narrow wedge is mandatory.",
    nextTest: "Interview 5 construction coordinators about the last compliance packet that delayed a job.",
    tags: ["construction", "managed service"],
    sources: [
      { id: "construction-compliance-s1", type: "YC", label: "YC construction directory", url: "https://www.ycombinator.com/companies/industry/construction", note: "" },
      { id: "construction-compliance-s2", type: "Reddit", label: "r/Construction", url: "https://www.reddit.com/r/Construction/search/?q=compliance&restrict_sr=1", note: "" },
      { id: "construction-compliance-s3", type: "Company", label: "Alloovium", url: "https://www.alloovium.com/", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "ar-collections",
    title: "AR / collections",
    category: "Finance ops",
    thesis: "A service-led collections operator for small B2B teams that cannot chase overdue invoices themselves.",
    stage: "investigate",
    evidenceStatus: "crowded",
    statusNote: "Crowded signal",
    evidenceSummary: "Pain is measurable and tied to cash; service delivery can start before a full product exists.",
    unknowns: "Trust, payment authority, legal boundaries, and whether small accounts are valuable enough.",
    buildEstimate: "€8–15k",
    pricingHypothesis: "5–12% recovered",
    killReason: "AI-native AR operators already exist; differentiation cannot just be 'we send reminders'.",
    nextTest: "Ask 5 founders for an anonymized aging report and the last invoice they personally chased.",
    tags: ["cash flow", "service first"],
    sources: [
      { id: "ar-collections-s1", type: "YC", label: "YC AR companies", url: "https://www.ycombinator.com/companies/industry/finance", note: "" },
      { id: "ar-collections-s2", type: "Reddit", label: "r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/search/?q=late%20payments&restrict_sr=1", note: "" },
      { id: "ar-collections-s3", type: "Company", label: "Rex", url: "https://www.rex.co/", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "home-service-ops",
    title: "Home-service ops",
    category: "Local services",
    thesis: "A lightweight back-office assistant for one overlooked trade, starting with intake, follow-up, and estimates.",
    stage: "discovery",
    evidenceStatus: "crowded",
    statusNote: "Crowded signal",
    evidenceSummary: "Clear willingness to pay for calls, dispatch, lead conversion, and field admin.",
    unknowns: "The exact trade wedge, incumbent workflow, and whether switching costs are too high.",
    buildEstimate: "€10–18k",
    pricingHypothesis: "€300–1k / mo",
    killReason: "Generic home-service AI is saturated; broad positioning is a dead end.",
    nextTest: "Shadow one owner for a day and document the three admin tasks repeated every week.",
    tags: ["trade-specific", "workflow"],
    sources: [
      { id: "home-service-ops-s1", type: "YC", label: "YC home services", url: "https://www.ycombinator.com/companies/industry/home-services", note: "" },
      { id: "home-service-ops-s2", type: "Reddit", label: "r/Plumbing", url: "https://www.reddit.com/r/Plumbing/search/?q=business&restrict_sr=1", note: "" },
      { id: "home-service-ops-s3", type: "Company", label: "Broccoli", url: "https://www.broccoli.ai/", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "ai-implementation",
    title: "AI implementation",
    category: "B2B services",
    thesis: "A focused implementation studio that ships one repeatable AI workflow for one type of business.",
    stage: "investigate",
    evidenceStatus: "mixed",
    statusNote: "Open question",
    evidenceSummary: "Demand is visible, but 'AI consulting' is too vague; the repeatable workflow is the actual product.",
    unknowns: "Repeatability, distribution, and whether delivery can escape founder-hours economics.",
    buildEstimate: "€3–8k",
    pricingHypothesis: "€2–8k setup",
    killReason: "Becomes agency work without a constrained ICP and reusable asset.",
    nextTest: "Offer one fixed-scope workflow to 3 businesses and measure time-to-value, not enthusiasm.",
    tags: ["wedge", "services"],
    sources: [
      { id: "ai-implementation-s1", type: "YC", label: "YC AI companies", url: "https://www.ycombinator.com/companies/industry/ai", note: "" },
      { id: "ai-implementation-s2", type: "Reddit", label: "r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/search/?q=AI%20automation&restrict_sr=1", note: "" },
      { id: "ai-implementation-s3", type: "Company", label: "YC RFS", url: "https://www.ycombinator.com/rfs", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "nis2-compliance",
    title: "NIS2 / compliance",
    category: "Security & risk",
    thesis: "Translate a new security obligation into a short, managed readiness sprint for one regulated niche.",
    stage: "investigate",
    evidenceStatus: "mixed",
    statusNote: "Needs a wedge",
    evidenceSummary: "Regulatory deadline creates urgency; buyers already spend on audits and compliance support.",
    unknowns: "Country-specific liability, buying trigger, and how much is already handled by consultants/MSPs.",
    buildEstimate: "€8–16k",
    pricingHypothesis: "€2–10k / sprint",
    killReason: "'NIS2 for everyone' is crowded and the liability surface is uncomfortable.",
    nextTest: "Map one country's enforcement path and interview 3 MSPs serving the target niche.",
    tags: ["regulation", "managed service"],
    sources: [
      { id: "nis2-compliance-s1", type: "YC", label: "YC security", url: "https://www.ycombinator.com/companies/industry/security", note: "" },
      { id: "nis2-compliance-s2", type: "Reddit", label: "r/cybersecurity", url: "https://www.reddit.com/r/cybersecurity/search/?q=NIS2&restrict_sr=1", note: "" },
      { id: "nis2-compliance-s3", type: "Company", label: "ENISA", url: "https://www.enisa.europa.eu/topics/nis2-directive", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  },
  {
    id: "proven-model",
    title: "Proven business → new market",
    category: "Research mode",
    thesis: "Find a proven US/UK workflow business, then localize its distribution, language, or operational layer for a neglected market.",
    stage: "investigate",
    evidenceStatus: "early",
    statusNote: "Best research mode",
    evidenceSummary: "Avoids inventing demand from scratch; the question becomes transferability, not generic ideation.",
    unknowns: "Local market size, legal/operational adaptation, and whether the original team already has expansion plans.",
    buildEstimate: "€5–15k",
    pricingHypothesis: "Depends on wedge",
    killReason: "A copy without distribution or local insight is not a business; the research advantage must be real.",
    nextTest: "Pick one YC-backed company and write a 1-page transferability memo for Portugal/Spain.",
    tags: ["research", "localization"],
    sources: [
      { id: "proven-model-s1", type: "YC", label: "YC company directory", url: "https://www.ycombinator.com/companies", note: "" },
      { id: "proven-model-s2", type: "Reddit", label: "r/startups", url: "https://www.reddit.com/r/startups/search/?q=local%20market&restrict_sr=1", note: "" },
      { id: "proven-model-s3", type: "Company", label: "YC Requests for Startups", url: "https://www.ycombinator.com/rfs", note: "" }
    ],
    createdAt: SEED_TIMESTAMP,
    updatedAt: SEED_TIMESTAMP
  }
];
