import Link from "next/link";
import { seedCompanies, type Company } from "../../lib/problems";
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

export default function CompaniesPage() {
  return (
    <main className="wrap">
      <header className="page-head">
        <div className="eyebrow">Evidence, not opinion</div>
        <h1>Who pays, and how much</h1>
        <p>
          Real companies and the real numbers attached to this work. Every row says how sure we are
          and whether the link still opens. Nothing here is averaged into a score.
        </p>
      </header>

      <div className="stack">
        {GROUPS.map((group) => {
          const rows = seedCompanies.filter((company) => company.kind === group.kind);
          if (rows.length === 0) return null;
          return (
            <section key={group.kind}>
              <h2 className="block-title">{group.title}</h2>
              <p className="block-sub">{group.blurb}</p>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Company</th>
                      <th>Where</th>
                      <th>The work</th>
                      <th>Number</th>
                      <th>How sure</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((company) => (
                      <tr key={company.id}>
                        <td>
                          <strong>{company.name}</strong>
                        </td>
                        <td>{company.where}</td>
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
                          <span className="num">{company.number || "—"}</span>
                          <small>{company.numberLabel}</small>
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
            </section>
          );
        })}
      </div>

      <div className="footer">
        <span>
          <strong style={{ fontWeight: 500 }}>direct</strong> means it was read on the page itself ·{" "}
          <strong style={{ fontWeight: 500 }}>reported</strong> means someone else said it — a salary guide, a
          search result, an agency · <strong style={{ fontWeight: 500 }}>inferred</strong> means our reading. Anything
          marked “not opened” is a lead, not proof.
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
