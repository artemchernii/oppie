"use client";

// oppie.lab — the screen shown when there is no valid session.
//
// A form, because a password is the entire mechanism: one field, one button, no reset link and
// no "remember me". The two failures are reported differently on purpose — a wrong password is
// a typo, and an unconfigured deploy is a missing setting. Telling them apart is the difference
// between hunting for a mistake you did not make and fixing the one you did.

import { useState } from "react";
import { useRouter } from "next/navigation";

type State = "idle" | "sending" | "wrong" | "unconfigured";

export default function LockScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [state, setState] = useState<State>("idle");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState("sending");

    const response = await fetch("/api/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password })
    }).catch(() => null);

    if (!response || !response.ok) {
      const body = response ? await response.json().catch(() => null) : null;
      setState(body?.reason === "unconfigured" ? "unconfigured" : "wrong");
      return;
    }

    setPassword("");
    setState("idle");
    // Refresh rather than navigate: the session is a cookie the server has to be asked to read.
    router.refresh();
  };

  return (
    <div className="content" style={{ maxWidth: 360, margin: "14vh auto 0" }}>
      <div className="eyebrow">oppie.lab</div>
      <h1 style={{ fontSize: 21, margin: "6px 0 4px" }}>Locked</h1>
      <p className="faint" style={{ margin: "0 0 22px" }}>
        One password, and it is the only way in.
      </p>

      <form onSubmit={submit}>
        <div className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            value={password}
            autoFocus
            autoComplete="current-password"
            onChange={(event) => setPassword(event.target.value)}
          />
        </div>

        {state === "wrong" ? (
          <div className="callout danger" style={{ marginTop: 12 }}>
            That is not the password.
          </div>
        ) : null}

        {state === "unconfigured" ? (
          <div className="callout warn" style={{ marginTop: 12 }}>
            This deploy has no <code>APP_PASSWORD</code> or <code>APP_SECRET</code> set, so nobody
            gets in — the right password will not work either. That is the gate failing closed
            rather than letting everyone through, and it is fixed in the Vercel project settings.
          </div>
        ) : null}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={state === "sending"}>
            {state === "sending" ? "Checking…" : "Unlock"}
          </button>
        </div>
      </form>
    </div>
  );
}
