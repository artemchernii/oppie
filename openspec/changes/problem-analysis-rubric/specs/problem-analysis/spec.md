## ADDED Requirements

### Requirement: A score is computed from stated inputs, and shows them

The system SHALL score a problem from the dimensions of the rubric, using weights that are stated in
the system rather than hidden, and SHALL expose the contribution of every dimension. Every score
SHALL be shown with the inputs that produced it and SHALL be labelled as this system's judgement. A
score SHALL NOT be presented as a measurement, a probability, a forecast, or a verdict on whether the
business will work.

#### Scenario: An analysis completes
- **WHEN** a problem is analysed
- **THEN** the result contains exactly one verdict per dimension of the rubric
- **AND** it contains a score derived only from those verdicts and their stated weights

#### Scenario: A score is displayed
- **WHEN** a score appears on a surface
- **THEN** every dimension's contribution to it is reachable from that surface, together with the
  dimension's verdict and the citation behind the verdict
- **AND** the score is labelled as this system's judgement rather than as a property of the problem

#### Scenario: The scale is stated
- **WHEN** a score is shown
- **THEN** its scale and range are stated on the surface, and the same scale is used everywhere a
  score appears

#### Scenario: The weights change
- **WHEN** a dimension or a weight changes
- **THEN** the rubric version that produced each existing score stays recorded with it
- **AND** existing scores are not silently recomputed

#### Scenario: A score is shown without its inputs
- **WHEN** a surface displays a score with no reachable breakdown of how it was reached
- **THEN** that is a defect of this requirement, not a simplification to accept

### Requirement: An unknown dimension is shown, never summed as zero

A dimension whose verdict is `unknown` SHALL NOT contribute a value to a score. Every score SHALL
state how many dimensions it was computed over. An answer of zero SHALL contribute zero and SHALL
remain distinguishable from a dimension that was never answered. If no dimension has an answer, no
score SHALL be produced. A checked answer SHALL NEVER be reported as `unknown`.

#### Scenario: A checked answer is never discarded
- **WHEN** a question a person answered — including the lowest answer available — is read by the
  dimension or part that reads it
- **THEN** that dimension or part carries a verdict, and beyond `unknown`
- **AND** it carries the reason the person gave with it

#### Scenario: Some dimensions are unknown
- **WHEN** a score is computed over a problem with unknown dimensions
- **THEN** the score states how many dimensions it was computed over and how many were unknown
- **AND** the unknown dimensions are not treated as zero, as a half, or as a neutral midpoint

#### Scenario: An answer is genuinely zero
- **WHEN** a dimension is answered as zero
- **THEN** it contributes zero to the score
- **AND** the surface distinguishes that from a dimension that was never answered

#### Scenario: Nothing is answered
- **WHEN** no dimension has an answer
- **THEN** no score is produced and the surface says so, rather than showing zero

#### Scenario: The blocking dimension is named
- **WHEN** an analysis completes
- **THEN** the system names the dimension that most obstructs the record, as a named dimension with
  its citation, and not only as a number

### Requirement: Every verdict carries what decided it

Every verdict SHALL be one of `yes`, `no` or `unknown`, and SHALL carry the record field, source URL
or quoted passage that produced it. A verdict with nothing behind it SHALL be `unknown`.

#### Scenario: A dimension has no evidence
- **WHEN** neither the record nor any collected source bears on a dimension
- **THEN** that dimension's verdict is `unknown` with no citation
- **AND** it is reported as unknown, never as `no`

#### Scenario: A source answers a dimension
- **WHEN** a collected source answers a dimension
- **THEN** the verdict carries that source's URL and the passage or figure it was read from

#### Scenario: A figure is involved
- **WHEN** a verdict rests on a number
- **THEN** the number is stored and shown verbatim with its source, and is not rounded, converted,
  annualised or restated in the system's own words

#### Scenario: A citation is a search snippet
- **WHEN** the only basis for a verdict is a search result's snippet rather than the page
- **THEN** the verdict records that the page was not opened, and the citation says so

### Requirement: Inference is labelled as inference

Every verdict SHALL record whether it follows from something stated in a source or from the
system's reading of one, using the categories in `docs/RULES.md` § 1. A verdict the system reached
by interpretation SHALL NOT be presented as observed.

#### Scenario: The system interprets
- **WHEN** a verdict follows from the system's reading rather than from a statement in the source
- **THEN** it is labelled `inferred`

#### Scenario: A source states it directly
- **WHEN** the source states the thing being claimed
- **THEN** the verdict may be labelled `observed`
- **AND** it is not labelled `observed` if the link behind it has never been opened

#### Scenario: The categories are displayed
- **WHEN** a verdict is shown
- **THEN** its category is shown next to it, and an unlabelled verdict is not treated as observed

### Requirement: The rubric's dimensions and weights are inspectable

The dimensions SHALL be exactly these seven, and each SHALL name the rule it derives from:

| Dimension | Rule |
|---|---|
| Wedge specificity | `docs/RULES.md` § 3 |
| Paid today | `docs/RULES.md` § 11 |
| Repetition | `docs/PAIN_FUNNEL.md` § G3 |
| Buyer | `docs/PAIN_FUNNEL.md` § G4 |
| Competition | `docs/RULES.md` § 2 |
| Kill-reason quality | `docs/RULES.md` § 4 |
| Citation integrity | the existing product rule that nothing is `direct` on an unopened link |

Adding, removing or redefining a dimension SHALL require a change to this spec.

#### Scenario: An analysis runs
- **WHEN** a problem is analysed
- **THEN** all seven dimensions are present in the result, including those with no evidence

#### Scenario: Wedge specificity is judged
- **WHEN** the wedge dimension is evaluated
- **THEN** it reports its four parts — specific customer, specific workflow, specific geography or
  vertical, specific outcome — as four separate answers
- **AND** it does not combine them into a specificity percentage or a count out of four

#### Scenario: Kill-reason quality is judged
- **WHEN** the kill-reason dimension is evaluated
- **THEN** a verdict of `no` requires the recorded reason to be a deferral rather than a reason —
  something equivalent to "needs more research"
- **AND** an empty reason is `unknown`, because nobody having written one is not the same as having
  written a bad one

#### Scenario: A real reason written in unexpected words
- **WHEN** a reason names a real obstacle — a procurement committee, or payers who churn — without
  using the vocabulary `docs/RULES.md` § 4 lists
- **THEN** it is `yes`
- **AND** the reason is shown beside the verdict, so a person judges its quality rather than a
  word list doing it, because a word list cannot tell a well-argued reason from a badly-argued one
  either — only whether the reader guessed the word

#### Scenario: Competition is judged
- **WHEN** the competition dimension is evaluated
- **THEN** it reports separately how many relevant companies are known, what they charge, and whether
  the wedge is hard to copy
- **AND** a checked `moat` below 2 is a `no` rather than an `unknown`, because a checked answer is
  never discarded and a wedge copied in weeks is not defended
- **AND** it does not conclude that competition makes the problem good or bad

### Requirement: A person's rating is stored beside the score that prompted it

The system SHALL store a person's own rating of a problem alongside the score the system proposed for
it, together with the version of the rubric that produced that score. Where the rating diverges from
the system's score by more than a stated threshold, the rating SHALL carry the person's reason before
it is stored.

#### Scenario: A person rates a problem
- **WHEN** a person submits a rating
- **THEN** the rating, the system's score and the rubric version are stored together

#### Scenario: The rating agrees with the score
- **WHEN** the rating is within the threshold of the system's score
- **THEN** no reason is required and the rating is stored immediately

#### Scenario: The rating diverges
- **WHEN** the rating diverges from the system's score by more than the threshold
- **THEN** a reason is required before the rating is stored, and is stored with it
- **AND** the divergence is what makes this rating worth keeping

#### Scenario: The rubric is revised
- **WHEN** the rubric's dimensions or weights change
- **THEN** existing ratings keep the rubric version they were made against and are not discarded,
  because a rating against an old rubric is still a statement about the problem

#### Scenario: The agreement is summarised
- **WHEN** the person's ratings are summarised against the system's scores
- **THEN** the summary reports the distribution of the differences between them
- **AND** it does not report an accuracy, a hit rate, or a percentage of correct predictions that the
  system has achieved

### Requirement: Ordering by judgement is labelled as such

The default order of problems SHALL remain the cited ordering in `docs/PAIN_FUNNEL.md` § Part 2 —
Ordering. Sorting by the system's score SHALL be available, and SHALL be labelled as sorting by the
system's judgement rather than by cited facts.

#### Scenario: The list is sorted by default
- **WHEN** problems are ordered without anyone having chosen an order
- **THEN** the order is furthest gate passed, then the cited answer on pain severity, then the largest
  already-paid amount

#### Scenario: The list is sorted by score
- **WHEN** problems are ordered by the system's score
- **THEN** the surface says the order is this system's judgement, not a cited fact
- **AND** records with more dimensions answered sort above records with fewer, before the score is
  compared at all, because the score is a proportion over what was checked and a barely-checked
  record would otherwise top the list

### Requirement: The score never decides by itself

Running an analysis SHALL NOT change any stored record. A verdict, a score or a rating SHALL reach a
record only when a person accepts it, and acceptance SHALL write the value, its reason and its source
together in one action.

#### Scenario: An analysis runs
- **WHEN** an analysis completes
- **THEN** the problem record is unchanged, field for field

#### Scenario: A person accepts
- **WHEN** a person accepts a verdict, a score or a rating
- **THEN** the accepted value, its reason and its source are written together

#### Scenario: Acceptance carries no reason
- **WHEN** an acceptance arrives with an empty reason or an empty source, where a reason is required
- **THEN** it is rejected and nothing is written

#### Scenario: Nobody acts
- **WHEN** no person accepts anything
- **THEN** nothing is applied on load, on ingest, or on a schedule, and nothing is applied in bulk

### Requirement: A record with no analysis stays visible

The board SHALL keep analysed and unanalysed records visibly apart, and SHALL NOT let the absence of a
score sort a record out of reach.

#### Scenario: Some records have not been analysed
- **WHEN** the board is displayed
- **THEN** records with no answered dimension appear in a distinct lane that ignores the ordering
- **AND** they are reachable without a search

#### Scenario: The board is sorted by score
- **WHEN** problems are ordered by score
- **THEN** a record with no score is not ranked as though it had scored zero
- **AND** the count of records with no score is stated on the surface, next to the ordering control
