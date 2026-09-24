export type EvidenceStatus = "early" | "mixed" | "crowded";
export type SourceType = "YC" | "Reddit" | "Company";

export type Opportunity = {
  id: string;
  number: string;
  title: string;
  category: string;
  thesis: string;
  status: EvidenceStatus;
  statusLabel: string;
  evidence: string;
  unknown: string;
  build: string;
  price: string;
  killReason: string;
  nextTest: string;
  sources: { type: SourceType; label: string; url: string }[];
  tags: string[];
};

export const opportunities: Opportunity[] = [
  {
    id: "construction-compliance", number: "01", title: "Construction compliance", category: "Vertical ops", status: "crowded", statusLabel: "Crowded signal", thesis: "A managed layer that turns messy subcontractor documents into job-ready compliance packets.", evidence: "Real operational pain and budget line; YC shows active construction/compliance demand.", unknown: "Who owns the problem, how often it blocks work, and whether margins survive local variation.", build: "€12–20k", price: "€500–2k / mo", killReason: "Generic document intelligence is already well-covered; a narrow wedge is mandatory.", nextTest: "Interview 5 construction coordinators about the last compliance packet that delayed a job.", tags: ["construction", "managed service"], sources: [{ type: "YC", label: "YC construction directory", url: "https://www.ycombinator.com/companies/industry/construction" }, { type: "Reddit", label: "r/Construction", url: "https://www.reddit.com/r/Construction/search/?q=compliance&restrict_sr=1" }, { type: "Company", label: "Alloovium", url: "https://www.alloovium.com/" }]
  },
  {
    id: "ar-collections", number: "02", title: "AR / collections", category: "Finance ops", status: "crowded", statusLabel: "Crowded signal", thesis: "A service-led collections operator for small B2B teams that cannot chase overdue invoices themselves.", evidence: "Pain is measurable and tied to cash; service delivery can start before a full product exists.", unknown: "Trust, payment authority, legal boundaries, and whether small accounts are valuable enough.", build: "€8–15k", price: "5–12% recovered", killReason: "AI-native AR operators already exist; differentiation cannot just be ‘we send reminders’. ", nextTest: "Ask 5 founders for an anonymized aging report and the last invoice they personally chased.", tags: ["cash flow", "service first"], sources: [{ type: "YC", label: "YC AR companies", url: "https://www.ycombinator.com/companies/industry/finance" }, { type: "Reddit", label: "r/smallbusiness", url: "https://www.reddit.com/r/smallbusiness/search/?q=late%20payments&restrict_sr=1" }, { type: "Company", label: "Rex", url: "https://www.rex.co/" }]
  },
  {
    id: "home-service-ops", number: "03", title: "Home-service ops", category: "Local services", status: "crowded", statusLabel: "Crowded signal", thesis: "A lightweight back-office assistant for one overlooked trade, starting with intake, follow-up, and estimates.", evidence: "Clear willingness to pay for calls, dispatch, lead conversion, and field admin.", unknown: "The exact trade wedge, incumbent workflow, and whether switching costs are too high.", build: "€10–18k", price: "€300–1k / mo", killReason: "Generic home-service AI is saturated; broad positioning is a dead end.", nextTest: "Shadow one owner for a day and document the three admin tasks repeated every week.", tags: ["trade-specific", "workflow"], sources: [{ type: "YC", label: "YC home services", url: "https://www.ycombinator.com/companies/industry/home-services" }, { type: "Reddit", label: "r/Plumbing", url: "https://www.reddit.com/r/Plumbing/search/?q=business&restrict_sr=1" }, { type: "Company", label: "Broccoli", url: "https://www.broccoli.ai/" }]
  },
  {
    id: "ai-implementation", number: "04", title: "AI implementation", category: "B2B services", status: "mixed", statusLabel: "Open question", thesis: "A focused implementation studio that ships one repeatable AI workflow for one type of business.", evidence: "Demand is visible, but ‘AI consulting’ is too vague; the repeatable workflow is the actual product.", unknown: "Repeatability, distribution, and whether delivery can escape founder-hours economics.", build: "€3–8k", price: "€2–8k setup", killReason: "Becomes agency work without a constrained ICP and reusable asset.", nextTest: "Offer one fixed-scope workflow to 3 businesses and measure time-to-value, not enthusiasm.", tags: ["wedge", "services"], sources: [{ type: "YC", label: "YC AI companies", url: "https://www.ycombinator.com/companies/industry/ai" }, { type: "Reddit", label: "r/Entrepreneur", url: "https://www.reddit.com/r/Entrepreneur/search/?q=AI%20automation&restrict_sr=1" }, { type: "Company", label: "YC RFS", url: "https://www.ycombinator.com/rfs" }]
  },
  {
    id: "nis2-compliance", number: "05", title: "NIS2 / compliance", category: "Security & risk", status: "mixed", statusLabel: "Needs a wedge", thesis: "Translate a new security obligation into a short, managed readiness sprint for one regulated niche.", evidence: "Regulatory deadline creates urgency; buyers already spend on audits and compliance support.", unknown: "Country-specific liability, buying trigger, and how much is already handled by consultants/MSPs.", build: "€8–16k", price: "€2–10k / sprint", killReason: "‘NIS2 for everyone’ is crowded and the liability surface is uncomfortable.", nextTest: "Map one country’s enforcement path and interview 3 MSPs serving the target niche.", tags: ["regulation", "managed service"], sources: [{ type: "YC", label: "YC security", url: "https://www.ycombinator.com/companies/industry/security" }, { type: "Reddit", label: "r/cybersecurity", url: "https://www.reddit.com/r/cybersecurity/search/?q=NIS2&restrict_sr=1" }, { type: "Company", label: "ENISA", url: "https://www.enisa.europa.eu/topics/nis2-directive" }]
  },
  {
    id: "proven-model", number: "06", title: "Proven business → new market", category: "Research mode", status: "early", statusLabel: "Best research mode", thesis: "Find a proven US/UK workflow business, then localize its distribution, language, or operational layer for a neglected market.", evidence: "Avoids inventing demand from scratch; the question becomes transferability, not generic ideation.", unknown: "Local market size, legal/operational adaptation, and whether the original team already has expansion plans.", build: "€5–15k", price: "Depends on wedge", killReason: "A copy without distribution or local insight is not a business; the research advantage must be real.", nextTest: "Pick one YC-backed company and write a 1-page transferability memo for Portugal/Spain.", tags: ["research", "localization"], sources: [{ type: "YC", label: "YC company directory", url: "https://www.ycombinator.com/companies" }, { type: "Reddit", label: "r/startups", url: "https://www.reddit.com/r/startups/search/?q=local%20market&restrict_sr=1" }, { type: "Company", label: "YC Requests for Startups", url: "https://www.ycombinator.com/rfs" }]
  }
];
