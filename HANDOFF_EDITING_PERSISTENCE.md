# oppie.lab — implementation handoff

## Task

Implement the next MVP slice: make opportunity records editable and persist them locally between page reloads.

Read these files first:

- `MVP_SPEC.md`
- `RULES.md`
- `RESEARCH_CONTEXT.md`
- `lib/data.ts`
- `app/page.tsx`
- `app/globals.css`

## Scope

### 1. Editable opportunity detail

Add an edit mode to the existing opportunity detail drawer. The user must be able to edit:

- title
- category
- thesis
- evidence summary
- unknowns
- build estimate
- pricing hypothesis
- kill reason
- next test
- stage/status

Keep the existing compact read mode as the default.

### 2. Local persistence

Use browser `localStorage` or another small client-only persistence layer. Seed from the existing six opportunities on first load. After that:

- edits survive a page reload
- new opportunities can be added
- deleting an opportunity is not required yet
- a reset-to-seed action is optional, but useful if it is simple

Do not add a backend, database server, auth, accounts, or sync.

### 3. Add opportunity

Make the existing “Add opportunity” button open a blank form with sensible defaults. A new opportunity must appear on the board after saving.

## Product rules

- Do not add an overall score or ranking.
- Keep evidence, unknowns, assumptions, and kill reasons visibly separate.
- Do not hide empty fields; show a clear “Not added yet” state.
- Do not add AI generation or automatic research claims.
- Do not change the current visual language unless necessary for usability.
- Keep the UI readable at a glance. Avoid large forms by default.
- Preserve the six existing seeded candidates.

## Suggested implementation

- Move the current static array into a client-safe seed module if needed.
- Create a small `useLocalStorage` or equivalent hook.
- Keep the data shape aligned with the model in `MVP_SPEC.md`.
- Use controlled form fields and a single save action.
- Keep the drawer as the main editing surface; do not create a new route.
- Add a small saved/updated confirmation state.

## Acceptance checklist

- [ ] `pnpm build` passes.
- [ ] The board still renders all six seeded opportunities on a fresh browser profile.
- [ ] Clicking an opportunity opens read mode.
- [ ] Edit mode can change each required field.
- [ ] Saving updates the card and detail view.
- [ ] Refreshing the page keeps saved changes.
- [ ] Add opportunity creates a new editable card.
- [ ] Empty values remain understandable.
- [ ] Table view, filters, search, and source links still work.
- [ ] No auth, backend, billing, AI generation, or unrelated refactor was added.

## Return format

When finished, report:

1. Files changed.
2. What works.
3. What was deliberately not built.
4. Build/test result.
5. Any decision that needs review.
