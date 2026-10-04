// oppie.lab — the Ideas board: one record per theme the research covered.
//
// Pure, so it runs in plain Node for tests. The records below are written by the agent from the
// discovery runs and change only through a reviewed PR. What is live comes from the database:
// complaint counts, sellers, the quote excerpts, and the owner's decision. See
// docs/superpowers/specs/2026-10-04-ideas-board-design.md.
//
// Every `answer` and `verdict` is an agent note, never the owner's decision. Prices are quoted
// text with the seller named — never parsed, converted, summed or averaged (AGENTS.md § 6).

export type IdeaVerdict = "crowded" | "real-budget" | "served" | "unproven" | "too-broad";

/** The one-word badge and what it means, so the badge never needs a legend elsewhere. */
export const VERDICTS: Record<IdeaVerdict, { label: string; meaning: string }> = {
  crowded: { label: "Crowded", meaning: "Real pain, but cheap tools already fix it." },
  "real-budget": { label: "Real budget", meaning: "Firms already spend real money on this." },
  served: { label: "Already served", meaning: "Priced services exist and look mature." },
  unproven: { label: "Not proven", meaning: "Demand is real; nobody was found paying for the gap." },
  "too-broad": { label: "Too broad", meaning: "The search mixed different problems; narrow it first." }
};

export type IdeaPrice = { seller: string; quote: string };

export type Idea = {
  id: string;
  title: string;
  /** One line: is it worth the owner's time, and why. Agent note. */
  answer: string;
  verdict: IdeaVerdict;
  runIds: string[];
  /** Pain sources whose stored excerpt is shown verbatim on the detail page. */
  quoteSourceIds: string[];
  priceLow?: IdeaPrice;
  priceHigh?: IdeaPrice;
  /** The questions money depends on. */
  unknowns: string[];
  /** Set when some runs were not in English, whose pain is stored as `context`. */
  nonEnglishRuns?: boolean;
  /** Which of the owner's strengths this idea uses (see the owner's stated edge). */
  edge?: string;
  /** Market-size facts from outside the runs, each with the page it came from. */
  facts?: Array<{ text: string; url: string }>;
};

export const IDEAS: Idea[] = [
  {
    id: "asian-sellers-eu-rep",
    title: "EU and UK representative for Asian online sellers",
    answer: "The law forces this spend: since December 2024 a seller outside the EU cannot sell on Amazon Europe without an EU responsible person. Prices are low (€150–€1,190 a year), so it is a volume business.",
    verdict: "crowded",
    runIds: ["run-b882e599-76fa-4444-94a0-65c1007dff1f", "run-60b4dc2d-a476-4274-82aa-3cc65de819cd"],
    quoteSourceIds: [],
    priceLow: { seller: "Westwood Sourcing", quote: "EUR 150 per year all-in." },
    priceHigh: { seller: "EU Authorised Representative services", quote: "EUR 1,190 for an unlimited number of products." },
    unknowns: [
      "The responsible person carries legal liability for the products. Can a small firm insure that risk?",
      "Korean and Vietnamese sellers: who represents them today, and in which language?"
    ],
    edge: "EU passport, so you can legally be the EU person. You like Asia.",
    facts: [
      { text: "Chinese sellers are 50.03% of Amazon's global active sellers (September 2025).", url: "https://www.marketplacepulse.com/articles/china-reaches-global-majority-on-amazon" },
      { text: "About 25% of sellers on Amazon's European marketplaces are based in China.", url: "https://ecommercenews.eu/25-european-amazon-marketplace-sellers-based-china/" }
    ]
  },
  {
    id: "diaspora-bookkeeping",
    title: "Bookkeeping in Ukrainian and Russian for diaspora businesses",
    answer: "Small firms already pay $200–$600 a month for bookkeeping, and a Russian-speaking service in Florida charges from $750. Tens of thousands of Ukrainian-owned firms in Poland and the UK need it in their language.",
    verdict: "real-budget",
    runIds: ["run-728cf9ab-47d6-48a4-a500-4d4040484c23", "run-93d77a03-7f76-4b34-9a72-6be0ac6948d0"],
    quoteSourceIds: ["src-1b66f52f-3b17-4580-a291-2d4a021ada5e", "src-35e2da22-0572-4193-a761-4578dcc8e22b"],
    priceLow: { seller: "Accounting services (US guide)", quote: "Basic bookkeeping runs $200 - $600/month, while full-service outsourced accounting can reach $2,500 - $6,000/month." },
    priceHigh: { seller: "Russian-speaking bookkeeping, accounting & tax services (Florida)", quote: "Plans from $750/mo." },
    unknowns: [
      "You are not an accountant: hire one and sell, or partner with a firm that lacks the language?",
      "Do Ukrainian owners in Poland and the UK already use Ukrainian-speaking accountants, and what do they pay?"
    ],
    edge: "Ukrainian and Russian, you like finance, and you like working with people.",
    facts: [
      { text: "29,044 companies in Poland had Ukrainian owners in July 2025; 13,014 opened after February 2022.", url: "https://www.euronews.com/business/2025/07/30/entrepreneur-like-a-ukrainian-100000-ukrainian-companies-have-opened" },
      { text: "About 26,600 UK company records list some 25,500 Ukrainians as owners.", url: "https://visitukraine.today/blog/7609/ukrainian-business-in-the-uk-how-many-companies-are-owned-by-ukrainians-and-in-which-sectors-do-they-operate" }
    ]
  },
  {
    id: "booking-sites-uk-us",
    title: "Website and booking setup for local businesses in the UK and US",
    answer: "Salons and local services do lose hours to phone bookings, but booking tools are free to $39 a month. You would sell the setup, not software, so it needs one niche and a way to reach it.",
    verdict: "crowded",
    runIds: ["run-750cc097-af58-435c-b524-069e4014e564", "run-ec4bccb6-ec9b-46fb-a2fc-53cbe7b90233"],
    quoteSourceIds: ["src-94807ef9-7c4c-42bc-a0db-9e2e29624ea3", "src-d59ccdeb-cc60-4b59-bafa-cd58d624c3f9"],
    priceLow: { seller: "Setmore", quote: "Setmore’s pricing starts at $0." },
    priceHigh: { seller: "Wix Bookings", quote: "starting at $39" },
    unknowns: [
      "What does a done-for-you setup sell for in the UK or US, and who sells it?",
      "Which niche (salons, cleaners, tutors) is easiest to reach from abroad?"
    ],
    edge: "You build websites yourself and do not mind marketing."
  },
  {
    id: "contract-renewals",
    title: "Contract renewals for small businesses",
    answer: "The most repeated pain we found: firms miss renewals and pay for another year. But tools exist at every price, from a few dollars a month up.",
    verdict: "crowded",
    runIds: ["run-e80fe5fe-66ad-47de-b4bc-10dfc3fa5d54", "run-c5244027-15cf-49f2-93b0-769e1faad897", "run-8911021c-7147-4979-bfea-614516103f9d"],
    quoteSourceIds: ["src-2a5fc4e7-d01c-4f55-99e2-3e6817489b6d", "src-fa0be8cc-821a-4853-9852-75f34f753813"],
    priceLow: { seller: "Renewal management software", quote: "starting at around $10 to $30 per user per month" },
    priceHigh: { seller: "Renewly", quote: "Enterprise CLM costs $15K+/year." },
    unknowns: ["Would a small firm pay a person to track renewals instead of a cheap tool?", "How many small firms have more than about 25 contracts, where a spreadsheet stops working?"]
  },
  {
    id: "invoice-chasing",
    title: "Chasing late invoices for small agencies",
    answer: "Every agency hates chasing payment, but tools start at £50 a month and outsourced chasing already exists.",
    verdict: "crowded",
    runIds: ["run-afb6a53d-da1f-480c-9758-8610e1303144", "run-cbfbe9a0-8563-4fe2-8e32-6fd60decf42e", "run-fda28a6f-842f-4e99-b80f-188afe1fadde"],
    quoteSourceIds: ["src-be346ea0-2a2c-4677-bc57-7008c2e63ddc", "src-91c35ea5-fc56-4b86-baad-ed73b09e2227"],
    priceLow: { seller: "Trove", quote: "£50 a month" },
    priceHigh: { seller: "Outsourced accounts receivable", quote: "Part-time support runs $800-1,500 monthly and per-invoice models run $2-8 per invoice" },
    unknowns: ["Would an agency pay a person noticeably more than a £50 tool?", "Which agencies have enough late invoices for that to be worth it?"]
  },
  {
    id: "credit-control-europe",
    title: "Outsourced credit control outside the UK",
    answer: "Exists in all four countries checked. The Netherlands is mature with per-call prices; Germany and Spain hide their prices.",
    verdict: "served",
    runIds: ["run-4789254a-3d88-4290-bc6a-a4f4dd7582d8", "run-f0ccf340-71df-42fd-a3ad-7d95889ec5d5", "run-abdde527-64d8-42c3-a287-8c061ee37f5b", "run-cf35e60b-3499-4b20-ad0a-ec5dd2fd976d"],
    quoteSourceIds: [],
    priceLow: { seller: "dockdock (NL)", quote: "€0,30-€2,50 per factuur of 2-8% percentage." },
    priceHigh: { seller: "Tricoma (DE)", quote: "ab 59 € / Monat (zzgl. USt.)" },
    unknowns: ["Would a clear fixed monthly price win customers where providers hide prices (Germany, Spain)?"],
    nonEnglishRuns: true
  },
  {
    id: "supplier-certificates",
    title: "Tracking supplier insurance certificates",
    answer: "A real chore, but mostly a US market, with free plans for up to 25–50 vendors and paid tools above that.",
    verdict: "crowded",
    runIds: ["run-9cca924b-f9c1-44b2-a870-dd317b20a037", "run-343a5a19-caca-45d1-9784-2b1d85827dd6"],
    quoteSourceIds: ["src-cba9ca13-be15-4a57-bfa4-e6de8312bdda", "src-608754d9-ebb1-470b-b731-c7e6acb9ce99"],
    priceLow: { seller: "bcs / TrustLayer", quote: "free plans (up to 25 and 50 vendors)" },
    priceHigh: { seller: "Supplio", quote: "Starter £599 a year, Growth £1,199, Scale £2,399, plus a custom Enterprise plan." },
    unknowns: ["Is there a European version of this need that the US tools miss?"]
  },
  {
    id: "aml-kyc-fintech",
    title: "AML and KYC checks for small fintechs",
    answer: "The biggest budget we found: firms pay up to $80,000 a year for outsourced compliance help instead of a $120,000 hire. It needs real AML expertise.",
    verdict: "real-budget",
    runIds: ["run-c1030ed5-56b6-4322-93a4-59ae9ba5ac97", "run-98b94bc2-567f-4f87-8711-6a7267b60768"],
    quoteSourceIds: ["src-70897e28-5cbe-4a6a-8023-c34838b7b310", "src-5295d75d-4731-41df-b912-db1c74b908de"],
    priceLow: { seller: "ComplyCube", quote: "Transparent low-cost pricing from $0.10 per check" },
    priceHigh: { seller: "Outsourced support", quote: "$0 to $80,000 with outsourced support (or $120,000+ for a dedicated hire)." },
    unknowns: ["Can you get the AML expertise, or partner with someone who has it?", "Which small fintechs buy outsourced analysts today, and from whom?"]
  },
  {
    id: "nis2-supplier-evidence",
    title: "NIS2 security proof for small suppliers",
    answer: "Big customers really do demand security proof from suppliers, but help is sold from free up to a few thousand euros, and nobody was found paying for it.",
    verdict: "unproven",
    runIds: [
      "run-fb451999-7348-4d9f-9013-6e9a78249191", "run-d27d8530-03d9-46cc-8c58-324b610929f4", "run-9dba35cd-e7ee-436f-a8bf-38ecae2ff667",
      "run-2e73a714-a577-4219-80b2-1349a896f5c9", "run-74df1a65-6378-4b2e-b50c-fef8672bea56", "run-2abcb6eb-33e8-4537-a065-b0c6341f0b66",
      "run-1d0a781d-3d94-4fa2-bf4c-c406b614fc24", "run-9fba19e6-ea3f-4917-a01d-7330bb857165", "run-592e17c7-48c4-4ade-99ac-cd46cbd48fae"
    ],
    quoteSourceIds: ["src-fa3ef680-2223-491e-a068-2f39a3840263", "src-d1e32c86-d259-4b2a-a2b7-d7e7e9a7981e"],
    priceLow: { seller: "nisd2.eu", quote: "Free to use, MIT + CC BY 4.0." },
    priceHigh: { seller: "GreenOnion (AT)", quote: "Festpreis 1.900 bis 3.900 EUR" },
    unknowns: ["Has any small supplier actually paid someone to answer a NIS2 questionnaire?"],
    nonEnglishRuns: true
  },
  {
    id: "sme-compliance-spreadsheets",
    title: "Compliance kept in spreadsheets by European SMEs",
    answer: "Lots of spreadsheet pain, but it spans HR, safety, finance and data rules. Too many different problems to sell one thing.",
    verdict: "too-broad",
    runIds: ["run-0b513475-07ff-4fed-a08e-47c04eeb0c20"],
    quoteSourceIds: ["src-10001fca-893c-48e2-a186-a0ebfc350077", "src-dd27bcd5-4227-4923-96e6-8f773ba4d582"],
    priceHigh: { seller: "Compliance management software", quote: "Software-only platforms typically start between 7,500 EUR and 15,000 EUR per year for a single framework" },
    unknowns: ["Which one of these compliance chores is worst, and for which kind of firm?"]
  },
  {
    id: "finance-for-small-firms",
    title: "Finance help for small firms",
    answer: "Fractional finance and reporting tools are everywhere, from $20 a month to thousands. A mature market.",
    verdict: "served",
    runIds: ["run-36985c5d-8932-4a5a-b9aa-add464e001ad", "run-bd002e2f-a2c3-491e-a3f9-aec933e8eb9f"],
    quoteSourceIds: ["src-65105717-455f-455e-ae9f-62d108937876"],
    priceLow: { seller: "Reporting tools", quote: "as affordable as $20 per month—or even less." },
    priceHigh: { seller: "Fractional finance", quote: "$866 to $3,464 a month" },
    unknowns: ["Is there a narrow finance chore that the fractional firms do badly?"]
  },
  {
    id: "e-invoicing-mandates",
    title: "Mandatory e-invoicing in Belgium and Germany",
    answer: "Belgium's 2026 e-invoicing rule confuses small firms, but many providers are free or cheap. One small gap: checking received invoices locally (2 sources).",
    verdict: "unproven",
    runIds: ["run-81dc61d0-4e94-4395-a333-a50fd3bcfa8f"],
    quoteSourceIds: [],
    unknowns: ["Would anyone pay to check received e-invoices before booking them?", "Germany barely showed up: is its mandate creating the same confusion?"],
    nonEnglishRuns: true
  },
  {
    id: "eu-online-seller-rules",
    title: "EU product and VAT rules for small online sellers",
    answer: "Product-safety representatives and VAT filing are already sold at clear, low prices. Not a gap.",
    verdict: "served",
    runIds: ["run-aaa4a898-bb8e-45c4-bc91-1d5228381368", "run-fd700f08-96b0-486e-afee-a870c3331e37"],
    quoteSourceIds: [],
    priceLow: { seller: "eugpsr.eu", quote: "EU Responsible Person from €199/year" },
    priceHigh: { seller: "EAS Project", quote: "Our Extended GPSR Support Package is an optional extra available for €199/month." },
    unknowns: ["Sellers with thousands of listings struggled to manage compliance data (1 source). Is that a real niche?"]
  },
  {
    id: "portugal-solo-founder-services",
    title: "Services for solo founders in Portugal",
    answer: "The search was too vague: results were generic sales and overwhelm. Needs a sharper direction before it says anything.",
    verdict: "too-broad",
    runIds: ["run-225d4904-9a3e-4242-8ab1-441c26a7d809"],
    quoteSourceIds: ["src-4b27595a-35da-4092-841a-1f6969a4bb22"],
    unknowns: ["Which single chore do solo founders in Portugal hate most?"]
  }
];

export const ideaById = (id: string): Idea | undefined => IDEAS.filter((idea) => idea.id === id)[0];

// ---- sellers, read from the stored "Already sold by" line ----

export type IdeaSeller = { name: string; offer: string; quote?: string };

/**
 * The pain split stores businesses as one line (lib/painSplit.ts, proposalsFromSplit):
 * `Already sold by: Name — offer (“quote”); Name — offer`. Quotes may contain semicolons, so the
 * line is split only on `; ` outside curly quotes.
 */
export function sellersFromBusinessPattern(line: string | null | undefined): IdeaSeller[] {
  const prefix = "Already sold by:";
  if (!line || line.indexOf(prefix) !== 0) return [];
  const body = line.slice(prefix.length);
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (let i = 0; i < body.length; i += 1) {
    const ch = body.charAt(i);
    if (ch === "“") depth += 1;
    if (ch === "”") depth = Math.max(0, depth - 1);
    if (ch === ";" && depth === 0) { parts.push(current); current = ""; continue; }
    current += ch;
  }
  parts.push(current);
  return parts.map((part) => part.trim()).filter(Boolean).map((part) => {
    const dash = part.indexOf(" — ");
    const name = (dash >= 0 ? part.slice(0, dash) : part).trim();
    let offer = dash >= 0 ? part.slice(dash + 3).trim() : "";
    let quote: string | undefined;
    const open = offer.indexOf("(“");
    if (open >= 0 && offer.slice(-2) === "”)") {
      quote = offer.slice(open + 2, -2);
      offer = offer.slice(0, open).trim();
    }
    return quote === undefined ? { name, offer } : { name, offer, quote };
  }).filter((seller) => seller.name.length > 0);
}

/** One entry per seller name (case-insensitive), first quote seen kept. */
export function distinctSellers(lines: Array<string | null | undefined>): IdeaSeller[] {
  const byName: Record<string, IdeaSeller> = {};
  const order: string[] = [];
  lines.forEach((line) => sellersFromBusinessPattern(line).forEach((seller) => {
    const key = seller.name.toLowerCase();
    if (!byName[key]) { byName[key] = seller; order.push(key); }
    else if (!byName[key].quote && seller.quote) byName[key] = { ...byName[key], quote: seller.quote };
  }));
  return order.map((key) => byName[key]);
}

// ---- the owner's decision ----

export type IdeaStatus = "pursue" | "park" | "drop";
export const IDEA_STATUS_LABEL: Record<IdeaStatus, string> = { pursue: "Pursuing", park: "Parked by you", drop: "Dropped by you" };
export type IdeaDecision = { ideaId: string; status: IdeaStatus; reason: string; decidedAt: string };

export function ideaDecisionError(input: { status: unknown; reason: unknown }): string | null {
  if (input.status !== "pursue" && input.status !== "park" && input.status !== "drop") return "Choose Pursue, Park or Drop";
  if (typeof input.reason !== "string" || input.reason.trim() === "") return "Write one sentence: the reason for this decision";
  return null;
}

/** Decisions are appended, never edited; the newest row per idea is the current status. */
export function currentDecisions(rows: IdeaDecision[]): Map<string, IdeaDecision> {
  const current = new Map<string, IdeaDecision>();
  rows.forEach((row) => {
    const seen = current.get(row.ideaId);
    if (!seen || row.decidedAt > seen.decidedAt) current.set(row.ideaId, row);
  });
  return current;
}

export function ideaDecisionFromRow(row: Record<string, unknown>): IdeaDecision | null {
  const status = row.status;
  if (status !== "pursue" && status !== "park" && status !== "drop") return null;
  return { ideaId: String(row.idea_id ?? ""), status, reason: String(row.reason ?? ""), decidedAt: String(row.decided_at ?? "") };
}

// ---- the board ----

export type IdeaCard = {
  idea: Idea;
  /** Pain sources in the idea's runs that were not discarded. Null when it could not be read. */
  complaints: number | null;
  sellers: number | null;
  decision?: Pick<IdeaDecision, "status"> & Partial<IdeaDecision>;
};

/** Undecided first, then by complaint count. A count, not a score. */
export function sortBoard<T extends { complaints: number | null; decision?: unknown }>(cards: T[]): T[] {
  return cards.slice().sort((a, b) => {
    const decided = Number(!!a.decision) - Number(!!b.decision);
    if (decided !== 0) return decided;
    return (b.complaints ?? -1) - (a.complaints ?? -1);
  });
}

export function boardSummary(cards: Array<{ decision?: unknown }>) {
  const decided = cards.filter((card) => !!card.decision).length;
  return { total: cards.length, decided, waiting: cards.length - decided };
}
