import Link from "next/link";
import { boardSummary, IDEA_STATUS_LABEL, sortBoard, VERDICTS, type IdeaCard, type IdeaPrice } from "../lib/ideas";
import type { IdeaBoard } from "../lib/ideaRemote";

/** A count that could not be read says so; it never shows as 0. */
export const countText = (value: number | null) => (value === null ? "Not added yet" : String(value));

export function VerdictBadge({ verdict }: { verdict: IdeaCard["idea"]["verdict"] }) {
  return <span className={`idea-badge verdict-${verdict}`} title={VERDICTS[verdict].meaning}>{VERDICTS[verdict].label}</span>;
}

export function StatusBadge({ decision }: { decision: IdeaCard["decision"] }) {
  if (!decision) return <span className="idea-badge status-none">Not decided</span>;
  return <span className={`idea-badge status-${decision.status}`}>{IDEA_STATUS_LABEL[decision.status]}</span>;
}

export function PriceLine({ label, price }: { label: string; price?: IdeaPrice }) {
  return (
    <div className="idea-price">
      <span className="idea-price-label">{label}</span>
      {price ? <span className="idea-price-text"><b>{price.seller}</b> “{price.quote}”</span> : <span className="idea-price-text faint">Not added yet</span>}
    </div>
  );
}

function Card({ card }: { card: IdeaCard }) {
  const { idea } = card;
  return (
    <Link href={`/ideas/${idea.id}`} className={`idea-card ${card.decision ? "is-decided" : ""}`} data-testid="idea-card">
      <h2 className="idea-card-title">{idea.title}</h2>
      <div className="idea-badges">
        <VerdictBadge verdict={idea.verdict} />
        <StatusBadge decision={card.decision} />
      </div>
      <div className="idea-numbers">
        <div><b>{countText(card.complaints)}</b><span>complaints</span></div>
        <div><b>{countText(card.sellers)}</b><span>sellers</span></div>
        <div><b>{idea.runIds.length}</b><span>{idea.runIds.length === 1 ? "search" : "searches"}</span></div>
      </div>
      <PriceLine label="Low end" price={idea.priceLow} />
      <PriceLine label="High end" price={idea.priceHigh} />
      <p className="idea-answer">{idea.answer} <span className="agent-note">Agent note</span></p>
      <span className="idea-open" aria-hidden="true">Open →</span>
    </Link>
  );
}

export default function Ideas({ board }: { board: IdeaBoard }) {
  const cards = sortBoard(board.cards);
  const summary = boardSummary(cards);
  return (
    <main className="wrap ideas-page">
      <header className="ideas-head">
        <div className="eyebrow">Ideas from your research</div>
        <h1>Which idea is worth your time?</h1>
        <p className="ideas-summary" data-testid="ideas-summary">
          <b>{summary.total}</b> ideas · <b>{summary.decided}</b> decided · <b>{summary.waiting}</b> waiting for you.
          {summary.waiting > 0 ? <> Start with the ones marked <span className="idea-badge verdict-real-budget">Real budget</span>.</> : null}
        </p>
        <ul className="ideas-legend">
          <li><b>Complaints</b> sources where people describe the pain</li>
          <li><b>Sellers</b> businesses already selling a fix</li>
          <li><b>Low / high end</b> real prices, quoted word for word</li>
        </ul>
      </header>

      {board.error ? <div className="callout danger ideas-error" role="alert">Some numbers could not be read: {board.error}</div> : null}
      {board.decisionsMissing ? (
        <div className="callout warn ideas-error">Your decisions cannot be shown or saved yet: the <code>idea_decisions</code> table is not in the database.</div>
      ) : null}

      <div className="idea-grid">
        {cards.map((card) => <Card key={card.idea.id} card={card} />)}
      </div>

      <p className="ideas-footnote faint">
        Badges and one-line answers are agent notes from the research, not your decisions. Counts are live from the database.
        Sorted: ideas you have not decided first, then by complaints — a count, not a score.
      </p>
    </main>
  );
}
