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

/** What the app does, in the order it happens. Words only — no numbers to go stale. */
const STEPS = [
  { label: "Collect", text: "Real complaints, sellers and prices, fetched for a direction you type." },
  { label: "Check", text: "Every quote must appear word for word in a stored source, or it is dropped." },
  { label: "Decide", text: "Nothing is accepted until you give a reason. The inbox waits for you." }
];

export default function LoginPage({ searchParams }: { searchParams: { error?: string } }) {
  const message = searchParams.error ? MESSAGES[searchParams.error] : undefined;

  return (
    <main className="login-page">
      <section className="login-story" aria-label="What oppie.lab does">
        <div className="login-brand">
          <span className="login-mark" aria-hidden="true">
            <svg viewBox="0 0 32 32" focusable="false">
              <circle className="logo-ring" cx="16" cy="16" r="8.5" />
              <circle className="logo-signal" cx="16" cy="16" r="3" />
            </svg>
          </span>
          oppie.lab
        </div>

        <h1 className="login-title">
          Find a problem <em>worth building.</em>
        </h1>
        <p className="login-lede">
          Evidence first: who complains, who already sells a fix, and whether money is moving.
        </p>

        <ol className="login-steps">
          {STEPS.map((step, index) => (
            <li key={step.label}>
              <span className="login-step-number">{String(index + 1).padStart(2, "0")}</span>
              <div>
                <strong>{step.label}</strong>
                <span>{step.text}</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="login-panel" aria-labelledby="login-heading">
        <div className="login-card">
          <span className="login-overline">Private workspace</span>
          <h2 id="login-heading">Sign in</h2>
          <p>
            One GitHub account, and only one. Everyone else is turned away at the database, not by
            this page.
          </p>

          {message ? (
            <div className="login-error" role="alert">
              {message}
            </div>
          ) : null}

          <a className="login-button" href="/auth/signin">
            <svg viewBox="0 0 16 16" aria-hidden="true" focusable="false">
              <path
                fill="currentColor"
                d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
              />
            </svg>
            Continue with GitHub
            <span className="login-arrow" aria-hidden="true">→</span>
          </a>

          <small className="login-footnote">
            You will be sent to GitHub and straight back here.
          </small>
        </div>
      </section>
    </main>
  );
}
