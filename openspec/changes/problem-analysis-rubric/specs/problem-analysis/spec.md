## ADDED Requirements

### Requirement: One verdict per dimension, never a composite

The system SHALL evaluate a problem against each dimension of the rubric separately and SHALL
return exactly one verdict per dimension. It SHALL NOT produce, store or display any value
computed from two or more dimensions, including but not limited to a score, a percentage, a grade,
a star rating, a rank position derived from verdicts, or a readiness total.

#### Scenario: An analysis completes
- **WHEN** a problem is analysed
- **THEN** the result contains exactly one entry per dimension of the rubric
- **AND** no entry is computed from any other entry

#### Scenario: A composite is requested
- **WHEN** a caller asks for an overall score, grade, percentage or single summary verdict
- **THEN** the request is refused rather than approximated or rounded
- **AND** the refusal names `docs/RULES.md` § 5 as the reason

#### Scenario: The analysis is rendered
- **WHEN** an analysis is displayed
- **THEN** every dimension appears with its own verdict
- **AND** no total, average, percentage, count of met dimensions, or star rating appears anywhere on
  the surface, including in a tooltip, a page title, or a colour that encodes a threshold

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

### Requirement: The rubric is the method, not a new one

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
- **THEN** a verdict of `yes` requires the recorded reason to name crowding, trust, regulation,
  distribution, switching cost, willingness to pay, or economics
- **AND** a reason equivalent to "needs more research" is `no`

#### Scenario: Competition is judged
- **WHEN** the competition dimension is evaluated
- **THEN** it reports separately how many relevant companies exist, what they charge, and whether a
  wedge is named at all
- **AND** it does not conclude that competition makes the problem good or bad

### Requirement: Unknown is reported, never absorbed

The system SHALL report which dimensions are `unknown` and how many, and SHALL keep that count
visibly separate from any other number. It SHALL NOT treat an unknown as `no` or as `0`.

#### Scenario: Several dimensions are unknown
- **WHEN** a problem has unknown dimensions
- **THEN** the analysis names each one and reports the count
- **AND** the count of unknown dimensions is never added to, subtracted from or averaged with any
  other value

#### Scenario: The blocking dimension is named
- **WHEN** an analysis completes
- **THEN** the system names the dimension that most obstructs the record per
  `docs/PAIN_FUNNEL.md` § Ordering, as a named dimension rather than as a number

### Requirement: Analysis suggests; a person decides

Running an analysis SHALL NOT change any stored record. A verdict SHALL reach a record only when a
person accepts it, and acceptance SHALL write the verdict, its reason and its source together in one
action.

#### Scenario: An analysis runs
- **WHEN** an analysis completes
- **THEN** the problem record is unchanged, field for field

#### Scenario: A verdict is accepted
- **WHEN** a person accepts a verdict
- **THEN** the verdict, its reason and its source are written together

#### Scenario: Acceptance carries no reason
- **WHEN** an acceptance arrives with an empty reason or an empty source
- **THEN** it is rejected and nothing is written

#### Scenario: Nobody acts
- **WHEN** no person accepts anything
- **THEN** nothing is applied on load, on ingest, or on a schedule, and no analysis is ever applied
  in bulk

### Requirement: Ordering does not consume the analysis

The order in which problems are listed SHALL remain the cited ordering in `docs/PAIN_FUNNEL.md`
§ Ordering. Verdicts SHALL NOT be used as weights, tie-breakers or inputs to it.

#### Scenario: The list is sorted
- **WHEN** problems are ordered for display
- **THEN** the order is determined by furthest gate passed, then the cited answer on pain severity,
  then the largest already-paid amount
- **AND** no verdict from the rubric participates in the comparison
