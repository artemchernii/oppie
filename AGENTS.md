# oppie.lab — working agreement

Applies to every contributor, human or agent. `RULES.md` governs the *research*; this file
governs the *repository*. Product scope lives in `MVP_SPEC.md`.

## 1. master is protected — nothing lands directly

**Never commit to `master` and never push to it.** Every change, however small, goes:

```bash
git switch -c feat/short-description    # from an up-to-date master
# ... work ...
git push -u origin HEAD
gh pr create --fill
```

Then squash-merge once CI is green.

- `master` requires a pull request and a passing CI run, and admin enforcement is on.
  `git push origin master` is rejected by the server, not just by convention.
- If you find yourself on `master` with changes, move them: `git switch -c <branch>` carries
  uncommitted work across with you.
- Force pushes and deletions on `master` are blocked. Linear history is required, so no merge
  commits reach `master`.
- A local `.githooks/pre-push` refuses `master` pushes as a fast trap. It is a convenience, not
  the gate — `--no-verify` skips it, the server does not.

## 2. Branch names

`<type>/<short-description>` using the same types as commits, lower-case and hyphenated:

```text
feat/    fix/    chore/    docs/    ci/    refactor/    perf/    test/
```

Examples: `feat/edit-sources`, `fix/hydration-flash`, `ci/commit-lint`.

One branch, one purpose. Do not bundle an unrelated refactor into a feature branch — open a
second PR instead.

## 3. Commit messages: Conventional Commits

```text
<type>(<scope>): <description>

<optional body: why, not what>

<optional footers>
```

- Types: `build`, `chore`, `ci`, `docs`, `feat`, `fix`, `perf`, `refactor`, `revert`, `style`, `test`.
- Scope is optional but welcome when it is obvious: `fix(store):`, `docs(rules):`.
- Imperative mood, lower case, no trailing full stop, header under 100 characters.
- Body explains *why*. The diff already says *what*.
- Breaking changes: add `!` after the type or scope, and a `BREAKING CHANGE:` footer saying why.

```text
feat(drawer): add source confidence editing

Confidence was the only field that could not be corrected after capture, which
pushed readers back to the raw source link to re-check every claim.

Closes #4
```

Enforced in two places, both by `scripts/check-commits.js`:

| Where | Checks |
|---|---|
| `.githooks/commit-msg` | the message you are about to write |
| CI `commits` job | every commit in the PR, plus the PR title |

Because PRs are squash-merged, **the PR title is the commit that lands on `master`** — it is
validated the same way. Use `gh pr create --title "feat: ..."` when `--fill` would reuse a
bad branch name.

## 4. Before opening a PR

```bash
pnpm test     # persistence rules — 16 assertions, no framework
pnpm build    # production build, includes typechecking
```

Both must pass locally; CI runs the same two commands. A PR that breaks either one is not ready.

If you changed `lib/persistence.ts`, `lib/data.ts`, or anything about how records are stored,
add assertions to `scripts/persistence.test.js` in the same PR. Storage bugs are silent and
destroy the user's work, which is exactly why they are the one thing with test coverage.

## 5. Do not commit generated output

`node_modules/`, `.next/`, `.pnpm-store/`, `.tmp-test/`, `*.tsbuildinfo`. All are gitignored —
if one of them shows up in `git status`, fix the ignore rather than adding it deliberately.

## 6. Product invariants

These are not style preferences; a PR that breaks one should be rejected.

- No overall score, ranking, or invented numeric conclusion. Ever.
- Evidence, unknowns, assumptions, and kill reasons stay visibly separate.
- Empty fields render "Not added yet". Never hide them, never invent a value — an unrated
  source has no confidence rather than a guessed `moderate`.
- No AI-generated conclusions or automatic research claims.
- The six seeded candidates in `lib/data.ts` stay intact; they are the reference data for the
  method, not a shortlist.
- Local-only: no backend, auth, accounts, billing, or sync without an explicit decision.

## 7. Reviews and merging

- Squash merge only, and **the PR title must be a valid Conventional Commit**.
- Do not merge with a red or pending check.
- Delete the branch after merge.
- If a decision in a PR needs a human call — a data-model change, a new field, anything that
  alters visible numbers — state it explicitly in the PR body under a "Decisions" heading
  instead of burying it in the diff.

## 8. One-off setup

```bash
pnpm install     # runs `prepare`, which sets core.hooksPath to .githooks
```

If hooks appear to do nothing, check `git config core.hooksPath` — it should print `.githooks`.
