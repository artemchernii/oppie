// oppie.lab — shared presentational pieces.
//
// Pure, hook-free, and safe to import from either a server or a client component.
// Nothing here computes a conclusion: every component renders a value that was
// already decided, and shows its reason or its gaps alongside.

import { gateCopy, readiness, signalDefs, verdictCopy, type Confidence, type Gate, type LinkStatus, type Problem, type Verdict } from "../lib/problems";

export const CONFIDENCE_NOTE: Record<Confidence, string> = {
  direct: "Read on the page itself",
  reported: "Stated by someone else, not read at source",
  inferred: "Our reading, not stated anywhere"
};

export const LINK_NOTE: Record<LinkStatus, string> = {
  checked: "link opens",
  dead: "link gone",
  unverified: "not opened"
};

export const LINK_CLASS: Record<LinkStatus, string> = {
  checked: "chip chip-ok",
  dead: "chip chip-danger",
  unverified: "chip chip-plain"
};

export function Value({ text }: { text: string }) {
  const trimmed = text.trim();
  if (!trimmed) return <span className="not-added">Not added yet</span>;
  return <>{trimmed}</>;
}

export function GateChip({ gate }: { gate: Gate }) {
  const copy = gateCopy[gate];
  return (
    <span className={gate === "G2-paid" ? "chip chip-g2" : "chip"}>
      {copy.short} {copy.label}
    </span>
  );
}

export function VerdictChip({ verdict }: { verdict: Verdict }) {
  const cls = verdict === "killed" ? "chip chip-danger" : verdict === "parked" ? "chip chip-warn" : "chip chip-plain";
  return <span className={cls}>{verdictCopy[verdict]}</span>;
}

export function ConfidenceChip({ value }: { value: Confidence }) {
  const cls = value === "direct" ? "chip chip-ok" : value === "reported" ? "chip chip-warn" : "chip chip-plain";
  return (
    <span className={cls} title={CONFIDENCE_NOTE[value]}>
      {value}
    </span>
  );
}

export function LinkChip({ status }: { status: LinkStatus }) {
  return (
    <span className={LINK_CLASS[status]} title={LINK_NOTE[status]}>
      {LINK_NOTE[status]}
    </span>
  );
}

/** A record nobody has looked at yet. Shown as such, never as a score of zero. */
export function isBacklog(problem: Problem): boolean {
  return problem.evidence.length === 0 && problem.signals.every((signal) => signal.value === null);
}

export function ReadinessNumber({ problem }: { problem: Problem }) {
  const r = readiness(problem);
  if (isBacklog(problem)) return <span className="chip chip-plain">not researched</span>;
  return (
    <span className={`ready-num ${r.unchecked === 0 ? "" : "gappy"}`}>
      {r.total}/{r.max}
      {r.unchecked > 0 && <em>{r.unchecked} not checked</em>}
    </span>
  );
}

/** The full breakdown, with the reason for each answer and the gaps counted. */
export function ReadinessPanel({ problem }: { problem: Problem }) {
  const r = readiness(problem);
  return (
    <div>
      <div className="ready-block">
        <span className={`big ${r.unchecked === 0 ? "" : "gappy"}`} style={r.unchecked === 0 ? undefined : { color: "var(--warn)" }}>
          {r.total}/{r.max}
        </span>
        <div style={{ flex: 1 }}>
          <div className="faint" style={{ fontSize: 12 }}>
            {r.unchecked === 0 ? "every question answered" : `${r.unchecked} of ${r.max / 3} not checked`}
            {r.uncited > 0 ? ` · ${r.uncited} answered without a reason` : ""}
          </div>
          <div className={`meter ${r.unchecked === 0 ? "" : "gappy"}`}>
            <i style={{ width: `${Math.round((r.total / r.max) * 100)}%` }} />
          </div>
        </div>
      </div>
      <p className="faint" style={{ fontSize: 12, marginTop: 12, marginBottom: 0, lineHeight: 1.55 }}>
        Five questions at equal weight, 0–3 each. A judgement, not a probability. Blank means not
        checked, and is never counted as zero.
      </p>
      <div style={{ marginTop: 16 }}>
        {problem.signals.map((signal) => {
          const def = signalDefs.find((item) => item.key === signal.key);
          return (
            <div className="signal" key={signal.key}>
              <div className="signal-top">
                <b>{def?.label ?? signal.key}</b>
                <span className={signal.value === null ? "chip chip-plain" : "chip"}>
                  {signal.value === null ? "not checked" : `${signal.value}/3`}
                </span>
              </div>
              <p className={signal.note.trim() ? undefined : "not-added"} style={signal.note.trim() ? undefined : { fontStyle: "italic" }}>
                {signal.note.trim() || "No reason given — this answer is a guess."}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
