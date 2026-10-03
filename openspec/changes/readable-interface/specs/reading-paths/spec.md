## ADDED Requirements

### Requirement: Three reading paths, in order

A person SHALL be able to move from a list of problems, to why one of them is good or bad, to who else is
already there — in that order, each step one link from the previous one, without a search and without
being told where to look.

#### Scenario: Choosing what to look at
- **WHEN** a person opens the list of problems
- **THEN** every row says enough to choose one without opening it
- **AND** opening a row leads to that record's own reading

#### Scenario: From a problem to the market
- **WHEN** a problem names companies
- **THEN** those companies are reachable from the problem page
- **AND** the way back is as short as the way there

#### Scenario: From a company to the problems
- **WHEN** a company is attached to problems
- **THEN** those problems are reachable from the company
- **AND** a company attached to nothing says so rather than showing an empty space

#### Scenario: A fact with no way back
- **WHEN** a screen shows a fact that came from a record
- **THEN** that record is one link away
- **AND** a fact that is reachable only by knowing its URL is a defect of this requirement

### Requirement: The judgement appears on the row, not behind a click

Every problem in a list SHALL show its score, how many dimensions that score was computed over, and the
dimension blocking the record, without the record being opened.

#### Scenario: A row is rendered
- **WHEN** a problem appears in a list
- **THEN** the row carries its score, its base, and the blocking dimension
- **AND** a row with no score says so, and does not render as a zero

#### Scenario: A score is shown anywhere
- **WHEN** a score appears on any surface
- **THEN** the number of dimensions it was computed over appears with it
- **AND** the two are never separated into different screens or a tooltip

#### Scenario: The blocking dimension is named
- **WHEN** a record is blocked on a dimension
- **THEN** the row names it in words, not only as a colour or a symbol

### Requirement: The order is stated, and can be changed

The list SHALL say which order it is in and what that order means, and SHALL offer the other order.

#### Scenario: The default order
- **WHEN** the list is opened
- **THEN** it is in the cited order, and says so
- **AND** the reader is told what that order is determined by

#### Scenario: Ordering by the system's judgement
- **WHEN** the list is ordered by the score
- **THEN** the surface says the order is this system's judgement rather than a cited fact

### Requirement: Colour carries a meaning, and is never the only carrier

Every colour used for a state SHALL correspond to a state written down in one place. A state SHALL also be
readable from text or shape, so it survives a monochrome screen and a reader who cannot separate two hues.

#### Scenario: A state is shown
- **WHEN** a state is rendered in colour
- **THEN** the same state is readable without colour
- **AND** the colour is one of the documented states

#### Scenario: An undocumented colour
- **WHEN** a colour has no state behind it
- **THEN** it is decoration and is removed

#### Scenario: Two states that mean opposite things
- **WHEN** two states would be confused for each other, including by a reader who cannot tell the hues
  apart
- **THEN** they also differ in text, in shape, or in position

### Requirement: A number on screen is a count or a quoted figure

Every statistic SHALL be a count of records, or a figure quoted verbatim from its source. The money rules
in `company-records` apply unchanged and are not restated here.

#### Scenario: A summary is drawn
- **WHEN** a surface summarises records
- **THEN** every number on it is a count of records, or that many dimensions answered, and says which

#### Scenario: A chart is drawn
- **WHEN** a bar, a length or a filled area is drawn
- **THEN** its length is a count of records, or a figure quoted verbatim
- **AND** nothing is drawn whose length came from a weighting, an average or a percentage

#### Scenario: A rate or a share is wanted
- **WHEN** a share of records would be easier to read than two counts
- **THEN** both counts are shown and the share is derived from them and labelled as derived, so the
  reader can check it

### Requirement: An empty field is visibly empty

A field with no value SHALL render as *Not added yet* or an equivalent plain phrase. It SHALL NOT render
as blank space, as a dash alone, or as a zero.

#### Scenario: A field was never filled
- **WHEN** a record with an empty field is displayed
- **THEN** the field is visibly empty and named as such

#### Scenario: A field was filled with zero
- **WHEN** a value of zero was entered on purpose
- **THEN** it renders as `0`, visibly different from the empty case

#### Scenario: An empty field in a summary
- **WHEN** a count or a total would be affected by empty fields
- **THEN** how many are empty is shown beside it rather than counted as zero

### Requirement: The list says what to do next

The list SHALL name the next action for each record — the test that would move it, or the question
blocking it — rather than leaving the reader to infer one from the score.

#### Scenario: A row names its next step
- **WHEN** a problem appears in a list
- **THEN** the row shows its next test or its next question
- **AND** a record with neither says that it has neither, rather than leaving the space blank

#### Scenario: A record nobody has looked at
- **WHEN** a problem has no answered dimension
- **THEN** the row says so in those terms, so it cannot be mistaken for a record that was checked and
  came out poorly
- **AND** grouping those records apart is the rule in `problem-analysis-rubric`, and is not restated here
