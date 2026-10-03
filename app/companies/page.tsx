import Link from "next/link";
import { moneyBasisCopy, seedCompanies, type Company } from "../../lib/problems";
import { ConfidenceChip, LinkChip } from "../ui";

export const metadata = { title: "oppie.lab — who pays, and how much" };

const GROUPS: { kind: Company["kind"]; title: string; blurb: string }[] = [
  {
    kind: "employer",
    title: "Companies paying a salary for this work",
    blurb:
      "A job posting is a budget line stated in public — the salary is the price already being paid. Postings get deleted once the role is filled, so each row says whether its link still opens."
  },
  {
    kind: "vendor",
    title: "Companies already selling software for it",
    blurb: "Someone charging money proves a price is already accepted in this market."
  },
  {
    kind: "bespoke",
    title: "Someone paid to do it by hand",
    blurb: "Custom work means the demand is real and nobody has productised the step."
  }
];

/** A count rendered as a length. Nothing here is a score — the bar is the number of rows. */
function Bar({ value, max }: { value: number; max: number }) {
  const width = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <span
      aria-hidden
      style={{
        display: "inline-block",
        width: `${width}%`,
        minWidth: value === 0 ? 0 : 6,
        height: 8,
        borderRadius: 2,
        background: "var(--accent, #4b7bec)",
        verticalAlign: "middle"
      }}
    />
  );
}

const countBy = <T,>(list: T[], key: (item: T) => string): { key: string; count: number }[] => {
  const totals = new Map<string, number>();
  list.forEach((item) => {
    const k = key(item);
    totals.set(k, (totals.get(k) ?? 0) + 1);
  });
  return Array.from(totals.entries())
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count || a.key.localeCompare(b.key));
};

const withAmount = (company: Company) => company.amount.trim().length > 0;

function MoneyTable({ rows, empty }: { rows: Company[]; empty: string }) {
  if (rows.length === 0) return <p className="not-added">{empty}</p>;
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Company</th>
            <th>Where</th>
            <th>The figure, as published</th>
            <th>Basis</th>
            <th>Where it comes from</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((company) => (
            <tr key={company.id}>
              <td>
                <strong>{company.name}</strong>
                {company.url && (
                  <>
                    {" "}
                    <a href={company.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                      open ↗
                    </a>
                  </>
                )}
                <div className="chip-row" style={{ marginTop: 6 }}>
                  <ConfidenceChip value={company.confidence} />
                  <LinkChip status={company.linkStatus} />
                </div>
              </td>
              <td>
                {company.location}
                {company.country && <div className="faint" style={{ fontSize: 11.5 }}>{company.country}</div>}
              </td>
              <td>
                <span className="num">{company.amount}</span>
              </td>
              <td>
                {moneyBasisCopy[company.basis] ? <span className="faint">{moneyBasisCopy[company.basis]}</span> : <span className="not-added">not stated</span>}
              </td>
              <td className="faint" style={{ fontSize: 12 }}>{company.amountNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function CompaniesPage() {
  const companies = seedCompanies;
  const priced = companies.filter(withAmount);
  const salaries = priced.filter((company) => company.kind === "employer");
  const prices = priced.filter((company) => company.kind !== "employer");
  const opened = companies.filter((company) => company.linkStatus === "checked");
  const countries = countBy(companies, (company) => company.country || "not established");
  const widest = countries[0]?.count ?? 0;

  return (
    <main className="wrap">
      <header className="page-head">
        <div className="eyebrow">Evidence, not opinion</div>
        <h1>Who pays, and how much</h1>
        <p>
          Real companies, where they are, and the figures attached to this work. Every row says how
          sure we are and whether its link still opens. Nothing here is averaged into a score.
        </p>
      </header>

      <div className="summary">
        <div className="summary-item">
          <b>{companies.length}</b>
          <span>companies</span>
        </div>
        <div className="summary-item">
          <b>{priced.length}</b>
          <span>with a figure</span>
        </div>
        <div className="summary-item">
          <b>{companies.filter((company) => company.kind === "employer").length}</b>
          <span>paying a salary</span>
        </div>
        <div className="summary-item">
          <b>{companies.filter((company) => company.kind === "vendor").length}</b>
          <span>selling software</span>
        </div>
        <div className="summary-item">
          <b>{opened.length}</b>
          <span>links actually opened</span>
        </div>
      </div>

      <section>
        <h2 className="block-title">Where they are</h2>
        <p className="block-sub">
          Counts of companies, one row per country. Two letters, so a country cannot arrive twice under
          two spellings. {companies.length - priced.length} of {companies.length} have no figure yet,
          which is why this is a map of who exists rather than of who pays.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Country</th>
                <th>Companies</th>
                <th style={{ width: "45%" }}> </th>
                <th>Employers</th>
                <th>Vendors</th>
                <th>With a figure</th>
              </tr>
            </thead>
            <tbody>
              {countries.map(({ key, count }) => {
                const inCountry = companies.filter((company) => (company.country || "not established") === key);
                return (
                  <tr key={key}>
                    <td>
                      {key === "not established" ? <span className="not-added">not established</span> : <span className="mono">{key}</span>}
                    </td>
                    <td>
                      <span className="num">{count}</span>
                    </td>
                    <td>
                      <Bar value={count} max={widest} />
                    </td>
                    <td>{inCountry.filter((company) => company.kind === "employer").length}</td>
                    <td>{inCountry.filter((company) => company.kind === "vendor").length}</td>
                    <td>{inCountry.filter(withAmount).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 className="block-title">What employers pay</h2>
        <p className="block-sub">
          A salary is the price already being paid for the work, and it is quoted in the currency the
          posting used. It is never added to the table below.
        </p>
        <MoneyTable rows={salaries} empty="No advertised salaries yet." />
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 className="block-title">What vendors charge</h2>
        <p className="block-sub">
          A published price means this segment already accepts one. Per year, per user per month and
          per project are different questions, so the basis is on every row and they are never totalled.
        </p>
        <MoneyTable rows={prices} empty="No published prices yet." />
      </section>

      <section style={{ marginTop: 40 }}>
        <h2 className="block-title">By kind</h2>
        <div className="stack">
          {GROUPS.map((group) => {
            const rows = companies.filter((company) => company.kind === group.kind);
            if (rows.length === 0) return null;
            return (
              <div key={group.kind}>
                <h3 className="block-sub" style={{ marginBottom: 4 }}>
                  <strong style={{ fontWeight: 500 }}>{group.title}</strong> · {rows.length}
                </h3>
                <p className="faint" style={{ fontSize: 12.5, marginBottom: 8 }}>{group.blurb}</p>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Company</th>
                        <th>Where</th>
                        <th>The work</th>
                        <th>Figure</th>
                        <th>How sure</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((company) => (
                        <tr key={company.id}>
                          <td>
                            <strong>{company.name}</strong>
                          </td>
                          <td>
                            {company.location}
                            {company.country && <div className="faint" style={{ fontSize: 11.5 }}>{company.country}</div>}
                          </td>
                          <td>
                            {company.role}
                            {company.url && (
                              <>
                                {" "}
                                <a href={company.url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
                                  open ↗
                                </a>
                              </>
                            )}
                          </td>
                          <td>
                            {company.amount ? <span className="num">{company.amount}</span> : <span className="not-added">Not added yet</span>}
                            {company.amount && moneyBasisCopy[company.basis] && <small>{moneyBasisCopy[company.basis]}</small>}
                          </td>
                          <td>
                            <div className="chip-row">
                              <ConfidenceChip value={company.confidence} />
                              <LinkChip status={company.linkStatus} />
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="footer">
        <span>
          <strong style={{ fontWeight: 500 }}>direct</strong> means it was read on the page itself ·{" "}
          <strong style={{ fontWeight: 500 }}>reported</strong> means someone else said it — a salary guide, a
          search result, an agency · <strong style={{ fontWeight: 500 }}>inferred</strong> means our reading. Anything
          marked “not opened” is a lead, not proof.
          <br />
          <span className="faint">
            The figures are quoted exactly as published and never parsed: three currencies, and salaries
            beside licence prices. Adding them, averaging them, or drawing them on one axis would produce a
            number that measures nothing — so the two tables above stay apart on purpose.
          </span>
        </span>
        <div className="footer-right">
          <Link className="link-button" href="/">
            Back to problems
          </Link>
        </div>
      </div>
    </main>
  );
}
