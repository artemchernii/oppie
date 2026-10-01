import type { Metadata } from "next";

export const metadata: Metadata = { title: "Sign in — oppie.lab" };

/** Each failure of the handshake gets its own sentence, because they need different fixes. */
const MESSAGES: Record<string, string> = {
  "missing-code": "GitHub sent you back without a code. Try again.",
  exchange: "GitHub signed you in, but the session could not be exchanged. Try again.",
  oauth: "Supabase refused to start the sign-in. Check that the GitHub provider is enabled.",
  "not-configured":
    "This deploy is missing SUPABASE_URL or SUPABASE_PUBLISHABLE_KEY, so sign-in cannot start."
};

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const message = searchParams.error ? MESSAGES[searchParams.error] : undefined;

  return (
    <div className="content" style={{ maxWidth: 380, margin: "14vh auto 0" }}>
      <div className="eyebrow">oppie.lab</div>
      <h1 style={{ fontSize: 21, margin: "6px 0 4px" }}>Sign in</h1>
      <p className="faint" style={{ margin: "0 0 22px" }}>
        One GitHub account, and only one. Everything else is turned away at the database rather
        than by this page.
      </p>

      {message ? (
        <div className="callout warn" style={{ marginBottom: 18 }}>
          {message}
        </div>
      ) : null}

      <a className="btn btn-primary" href="/auth/signin">
        Continue with GitHub
      </a>
    </div>
  );
}
