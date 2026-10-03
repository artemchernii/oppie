import Link from "next/link";
import { moneyBasisCopy, type Company, type Problem } from "../lib/problems";
import { ConfidenceChip, LinkChip } from "./ui";

export default function CompanyDetail({ company, problems }: { company: Company | null; problems: Problem[] }) {
  if (!company) {
    return (
      <main className="wrap company-detail-page">
        <div className="breadcrumb"><Link href="/companies">Companies & numbers</Link><span className="crumb-sep">/</span><span>not found</span></div>
        <h1>Company not found</h1>
        <p className="muted">This record is not in the current research set.</p>
      </main>
    );
  }

  const related = problems.filter((problem) => problem.companyIds.includes(company.id));
  const hasPrice = Boolean(company.amount.trim());
  const kindLabel = company.kind === "employer" ? "Employer" : company.kind === "vendor" ? "Vendor" : "Bespoke provider";

  return (
    <main className="wrap company-detail-page">
      <div className="breadcrumb">
        <Link href="/companies">Companies & numbers</Link>
        <span className="crumb-sep">/</span>
        <span className="mono">{company.id}</span>
      </div>

      <header className="company-detail-hero">
        <div>
          <div className="eyebrow">Company record · {kindLabel}</div>
          <h1>{company.name}</h1>
          <p>{company.role || "Not added yet"}</p>
          <div className="chip-row company-detail-tags">
            <span className="chip chip-plain">{company.location || "location not added yet"}</span>
            {company.country && <span className="chip chip-plain">{company.country}</span>}
            <ConfidenceChip value={company.confidence} />
            <LinkChip status={company.linkStatus} />
          </div>
        </div>
        <Link className="company-back-link" href="/companies">Back to companies ↗</Link>
      </header>

      <div className="company-detail-grid">
        <div>
          <section className="company-price-card">
            <span className="company-detail-label">Published figure</span>
            {hasPrice ? <strong>{company.amount}</strong> : <strong className="is-unknown">Not added yet</strong>}
            <span>{hasPrice ? (moneyBasisCopy[company.basis] || "Basis not stated") : "No amount was captured in the source."}</span>
            {company.amountNote && <p>{company.amountNote}</p>}
          </section>

          <section className="company-detail-section">
            <span className="company-detail-label">What this company does</span>
            <h2 className={company.role ? "" : "is-unknown"}>{company.role || "Not added yet"}</h2>
          </section>

          <section className="company-detail-section">
            <span className="company-detail-label">Why it matters</span>
            <p>
              This is one observed way the market handles the work. It is evidence that a buyer, employer,
              or provider exists—not proof that the same model will work for a new entrant.
            </p>
          </section>

          <section className="company-detail-section">
            <div className="company-section-heading">
              <div><span className="company-detail-label">Related problems</span><h2>Where this company is useful</h2></div>
              <span className="company-section-count">{related.length} linked</span>
            </div>
            {related.length === 0 ? <p className="is-unknown">No tracked problem is linked yet.</p> : (
              <div className="company-related-list">
                {related.map((problem) => (
                  <Link className="company-related-row" href={`/problems/${problem.id}`} key={problem.id}>
                    <span><b>{problem.id}</b>{problem.title}</span><span>open ↗</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </div>

        <aside className="company-detail-aside">
          <div className="company-aside-card">
            <span className="company-detail-label">Source status</span>
            <div className={`company-status ${company.linkStatus === "checked" ? "good" : company.linkStatus === "dead" ? "bad" : "neutral"}`}>
              <span className="status-dot" />
              {company.linkStatus === "checked" ? "Source opened" : company.linkStatus === "dead" ? "Source is dead" : "Source not opened"}
            </div>
            <p>{company.url ? "The record keeps the original source status beside the figure." : "No source URL has been added yet."}</p>
            {company.url && <a href={company.url} target="_blank" rel="noreferrer">Open source ↗</a>}
          </div>

          <div className="company-aside-card">
            <span className="company-detail-label">Known details</span>
            <dl>
              <div><dt>Kind</dt><dd>{kindLabel}</dd></div>
              <div><dt>Location</dt><dd>{company.location || "Not added yet"}</dd></div>
              <div><dt>Country</dt><dd>{company.country || "Not established"}</dd></div>
              <div><dt>Currency</dt><dd>{company.currency || "Not stated"}</dd></div>
            </dl>
          </div>

          <div className="company-aside-card company-unknown-card">
            <span className="company-detail-label">Still unknown</span>
            <ul>
              <li>Whether the published figure is a current quote.</li>
              <li>Who approves the purchase or hiring decision.</li>
              <li>What part of the workflow is not covered.</li>
            </ul>
          </div>
        </aside>
      </div>
    </main>
  );
}
