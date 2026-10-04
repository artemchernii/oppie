"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { IDEA_STATUS_LABEL, ideaDecisionError, type IdeaDecision, type IdeaStatus } from "../lib/ideas";

const CHOICES: Array<{ status: IdeaStatus; label: string; hint: string }> = [
  { status: "pursue", label: "Pursue", hint: "Worth digging into next." },
  { status: "park", label: "Park", hint: "Not now; maybe later." },
  { status: "drop", label: "Drop", hint: "Not worth your time." }
];

/** Three buttons; each asks for one sentence before anything is saved. Nothing is decided on load. */
export default function IdeaDecisionPanel({ ideaId, current, unavailable }: { ideaId: string; current?: Partial<IdeaDecision> & { status: IdeaStatus }; unavailable: boolean }) {
  const router = useRouter();
  const [choice, setChoice] = useState<IdeaStatus | null>(null);
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState("");

  const save = async () => {
    const invalid = ideaDecisionError({ status: choice, reason });
    if (invalid) return setError(invalid);
    setSaving(true);
    setError("");
    const response = await fetch(`/api/ideas/${encodeURIComponent(ideaId)}/decision`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: choice, reason })
    });
    const payload = await response.json().catch(() => ({})) as { error?: string };
    setSaving(false);
    if (!response.ok) return setError(payload.error ?? "Could not save the decision");
    setSaved(`Saved: ${IDEA_STATUS_LABEL[choice as IdeaStatus]}.`);
    setChoice(null);
    setReason("");
    router.refresh();
  };

  return (
    <section className="idea-decision" aria-labelledby="decide-heading">
      <h2 id="decide-heading">Your decision</h2>
      {current ? (
        <p className="idea-current">Now: <b>{IDEA_STATUS_LABEL[current.status]}</b>{current.reason ? <> — “{current.reason}”</> : null}</p>
      ) : <p className="idea-current faint">Not decided yet.</p>}
      {unavailable ? (
        <p className="callout warn">Decisions cannot be saved until the <code>idea_decisions</code> table is added to the database.</p>
      ) : (
        <>
          <div className="idea-choices" role="group" aria-label="Decision">
            {CHOICES.map((item) => (
              <button
                key={item.status}
                type="button"
                className={`idea-choice choice-${item.status} ${choice === item.status ? "is-selected" : ""}`}
                aria-pressed={choice === item.status}
                onClick={() => { setChoice(item.status); setError(""); setSaved(""); }}
              >
                <b>{item.label}</b>
                <span>{item.hint}</span>
              </button>
            ))}
          </div>
          {choice ? (
            <div className="idea-reason">
              <label htmlFor="idea-reason">Why? One sentence.</label>
              <input id="idea-reason" className="input" value={reason} autoFocus
                onChange={(event) => { setReason(event.target.value); setError(""); }}
                onKeyDown={(event) => { if (event.key === "Enter") void save(); }}
                placeholder="Cheap tools already fix it." />
              <button type="button" className="login-button idea-save" onClick={() => void save()} disabled={saving}>
                {saving ? "Saving…" : `Save: ${CHOICES.filter((item) => item.status === choice)[0].label}`}
              </button>
            </div>
          ) : null}
          {error ? <p className="idea-error" role="alert">{error}</p> : null}
          {saved ? <p className="idea-saved" role="status">{saved}</p> : null}
        </>
      )}
    </section>
  );
}
