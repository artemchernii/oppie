import Link from "next/link";
import { VERDICTS } from "../lib/ideas";
import type { IdeaDetail as Detail } from "../lib/ideaRemote";
import IdeaDecisionPanel from "./IdeaDecisionPanel";
import { countText, PriceLine, StatusBadge, VerdictBadge } from "./Ideas";

export default function IdeaDetail({ detail }: { detail: Detail }) {
  const { idea } = detail;
  return (
    <main className="wrap wrap-narrow idea-detail">
      <div className="breadcrumb"><Link href="/">Ideas</Link><span className="crumb-sep">/</span><span>{idea.title}</span></div>
      <h1 className="idea-detail-title">{idea.title}</h1>
      <div className="idea-badges">
        <VerdictBadge verdict={idea.verdict} />
        <StatusBadge decision={detail.decision} />
      </div>

      {detail.error ? <div className="callout danger ideas-error" role="alert">Some of this could not be read: {detail.error}</div> : null}

      <section className="idea-box idea-answer-box" aria-labelledby="box-answer">
        <span className="idea-box-label" id="box-answer">1 · The answer in one line</span>
        <p className="idea-answer-big">{idea.answer}</p>
        <p className="faint idea-box-note">{VERDICTS[idea.verdict].label}: {VERDICTS[idea.verdict].meaning} <span className="agent-note">Agent note, not your decision</span></p>
        {idea.edge ? <p className="idea-edge"><b>Your edge</b> {idea.edge}</p> : null}
        {idea.facts?.length ? (
          <ul className="idea-facts" aria-label="How big the market is">
            {idea.facts.map((fact) => <li key={fact.url}>{fact.text} <a href={fact.url} target="_blank" rel="noreferrer">Source</a></li>)}
          </ul>
        ) : null}
      </section>

      <div className="idea-numbers idea-numbers-wide">
        <div><b>{countText(detail.complaints)}</b><span>complaints</span></div>
        <div><b>{countText(detail.sellers)}</b><span>sellers</span></div>
        <div><b>{detail.searches}</b><span>{detail.searches === 1 ? "search" : "searches"}</span></div>
      </div>

      <div className="idea-boxes">
        <section className="idea-box" aria-labelledby="box-sellers">
          <span className="idea-box-label" id="box-sellers">2 · Who already sells it</span>
          <PriceLine label="Low end" price={idea.priceLow} linked />
          <PriceLine label="High end" price={idea.priceHigh} linked />
          {detail.sellerList.length === 0 ? <p className="faint">No seller found in these searches.</p> : (
            <details className="idea-sellers">
              <summary>Show all {detail.sellerList.length} sellers found</summary>
              <ul>
                {detail.sellerList.map((seller) => (
                  <li key={seller.name}>
                    <b>{seller.name}</b>
                    <span>{seller.offer}</span>
                    {seller.quote ? <em>“{seller.quote}”</em> : null}
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>

        <section className="idea-box" aria-labelledby="box-quotes">
          <span className="idea-box-label" id="box-quotes">3 · Proof people complain</span>
          {detail.quotes.length === 0 ? (
            <p className="faint">
              No quote picked.{idea.nonEnglishRuns ? " Some searches were not in English, and the engine files non-English complaints as context, so the complaint count reads low." : ""}
            </p>
          ) : detail.quotes.map((quote) => (
            <blockquote key={quote.id} className="idea-quote">
              <p>“{quote.excerpt}”</p>
              <a href={quote.url} target="_blank" rel="noreferrer">{quote.title || quote.url}</a>
            </blockquote>
          ))}
        </section>

        <section className="idea-box" aria-labelledby="box-unknowns">
          <span className="idea-box-label" id="box-unknowns">4 · Still unknown</span>
          <ul className="idea-unknowns">
            {idea.unknowns.map((unknown) => <li key={unknown}>{unknown}</li>)}
          </ul>
        </section>
      </div>

      <IdeaDecisionPanel ideaId={idea.id} current={detail.decision} unavailable={detail.decisionsMissing} />
    </main>
  );
}
