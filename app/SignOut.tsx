"use client";

// oppie.lab — locking the app again.
//
// Clearing the cookie is the whole of signing out: there is no session list on the server to
// delete from, and the token cannot be resurrected without the secret that signed it.

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function SignOut() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const lock = async () => {
    setBusy(true);
    await fetch("/api/session", { method: "DELETE" }).catch(() => null);
    router.refresh();
  };

  return (
    <button className="btn btn-sm" type="button" onClick={lock} disabled={busy}>
      {busy ? "…" : "Lock"}
    </button>
  );
}
