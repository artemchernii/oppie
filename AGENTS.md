# oppie.lab — working agreement

Applies to every contributor, human or agent. `docs/RULES.md` governs the *research*; this file
governs the *repository*. Product scope lives in `docs/MVP_SPEC.md`.

## 1. master is protected — nothing lands directly

**Never commit to `master` and never push to it.** Every change, however small, goes:

```bash
git switch -c feat/short-description    # from an up-to-date master
# ... work ...
git push -u origin HEAD
gh pr create --fill
```

Then squash-merge once CI is green.

- `master` requires a pull request and a passing CI run. Nobody bypasses this, admins included.
  `git push origin master` is rejected by the server, not just by convention.
- If you find yourself on `master` with changes, move them: `git switch -c <branch>` carries
  uncommitted work across with you.
- A local `.githooks/pre-push` refuses `master` pushes as a fast trap. It is a convenience, not
  the gate — `--no-verify` skips it, the server does not. Do not reach for `--no-verify` against
  `master`; if you think you need it, ask first.

### How it is enforced

A **repository ruleset** named `protect default branch` targets the default branch, with
`bypass_actors` empty so it binds admins too:

| Rule | Effect |
|---|---|
| `pull_request` | a PR is required, 0 approvals, and **squash is the only allowed merge method** |
| `required_status_checks` | `build` and `commits` must pass; the branch must be up to date |
| `required_linear_history` | no merge commits reach `master` |
| `non_fast_forward` | no force pushes |
| `deletion` | `master` cannot be deleted |

Settings live at <https://github.com/artemchernii/oppie/rules>. Repo settings also disable merge
commits and rebase merges, enable auto-merge, and delete the branch on merge.

**One nuance worth knowing.** GitHub evaluates the pull-request rule against the commits being
pushed, so pushing the exact head commit of an *open PR that targets `master`* is accepted. That
means an open PR's branch can be fast-forwarded onto `master`, skipping the squash step. It
gate-keeps *new* work correctly — an orphan commit and a force push are both refused with
`GH013: Changes must be made through a pull request` — but do not read an open PR as permission to
push. Land work with `gh pr merge --squash`.

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

- No hidden aggregation, and no number dressed up as a measurement or a probability. A score is
  permitted: the rubric's dimensions and weights are stated and visible, every contribution is
  traceable to a citation, and the number says how many dimensions it was computed over with blanks
  never summed as zero. It is labelled a judgement, never a forecast. See `docs/RULES.md` § 5. The
  readiness tally in `docs/PAIN_FUNNEL.md` § The readiness tally is one such score: five questions
  at **equal** weight, every answer stored with its reason, blanks counted and shown.
- Evidence, unknowns, assumptions, and kill reasons stay visibly separate.
- A problem does not advance past the paid-today test on enthusiasm. Complaints, upvotes, and
  "would you use this" are not evidence that money is already moving.
- Empty fields render "Not added yet". Never hide them, never invent a value — an unrated
  source has no confidence rather than a guessed `moderate`. A checked zero is not an empty
  field, and an empty field never renders as a zero.
- No automatic conclusions. The research pipeline may **collect** sources and may **suggest**
  answers, but a suggestion reaches a record only when a person accepts it — and acceptance writes
  the reason and the source into the record beside the number. Nothing is applied on load, on
  ingest, or on a schedule. A suggestion carrying no reason is rejected at the storage boundary.
- Untriaged sources count in no total. The inbox is a queue, not evidence.
- The six seeded candidates in `lib/data.ts` stay intact; they are the reference data for the
  method, not a shortlist.
- Remote storage and sign-in are no longer exceptions — both are decided (`DECISIONS.md` #1) and
  shipped. That decision is narrow: records and files may live in Supabase, and exactly one person
  is allowed in. Accounts, teams, sharing and billing remain open, and each needs its own entry
  before it is built.

## 7. Reviews and merging

- Squash merge only, enforced by the ruleset (`allowed_merge_methods: [squash]`). Land a PR with
  `gh pr merge --squash`.
- **The PR title must be a valid Conventional Commit** — it becomes the commit on `master`,
  because the squash commit title is set to the PR title.
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

## 9. Explaining things: two registers, plain one first

This project's method is dense on purpose — gates, three axes, a rubric, a no-composite rule with
four conditions. That density is the point, and it is also why writing about it goes wrong.

**Every explanation carries two registers, and the plain one comes first.** Somebody should be able
to follow the plain one having read nothing else here.

- **Plain.** Short sentences. No jargon without a gloss in the same breath. One concrete example,
  with real numbers from this project. The answer first, the reasoning after. Written for a person
  who is tired and has already read a lot today.
- **Precise.** Straight after it. Exact names, file paths, counts, trade-offs, what was verified and
  what was assumed.

The rule exists because both readers are the same person. The owner wrote this method and still wants
the plain version at the end of a long day, and an agent reading the precise version needs the plain
one to check that the claim means something.

**Forbidden:** precise prose with no plain version. Jargon used as though it were shared.
An explanation that only works if the reader already agrees. Making the reader feel behind for asking.

**Not licensed:** simplifying the substance. Simplify the telling, never the numbers. If a value, a
verdict or a count changes, say the number, plain and precise both.

## 10. Agent handoff format

Every agent response ends with this five-line handoff, even when the task is small:

📝 Summary — what this turn is about
✅ Done — what was completed
📍 Now — the current repository state
🚀 Next — the next action the agent will take
🙋 You — the explicit next action for the owner; if none is required, say so plainly

The repository is the source of truth for longer status. Keep `STATUS.md` current and put durable
implementation plans in `openspec/` or `docs/`, not only in chat. When there is an obvious next
implementation task, include a suggested-next prompt so the owner can continue in a fresh chat. Keep
it to one short line naming the task (for example `Continue oppie.lab: OpenSpec 5.3.`); the agent
reads `STATUS.md`, `docs/CLAUDE_HANDOFF.md` and this file itself, so the prompt does not restate
rules, guardrails or the footer format. These preferences are also recorded in the root
`codex.settings.json`. When the owner must perform a manual or external action, the `🙋 You` section
gives numbered, step-by-step instructions before that one-line prompt.
