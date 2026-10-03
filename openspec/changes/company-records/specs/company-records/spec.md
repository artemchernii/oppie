## ADDED Requirements

### Requirement: What a company is paid is decided by what kind of company it is

A company record SHALL say what kind of company it is, and that SHALL decide what its money figure
means. The system SHALL NOT store a second field restating the same fact.

#### Scenario: A salary
- **WHEN** a company is recorded with kind `employer`
- **THEN** its figure is a salary — what a firm pays a person — and is presented as such

#### Scenario: A licence price
- **WHEN** a company is recorded with kind `vendor`
- **THEN** its figure is a price a firm pays for software

#### Scenario: Work done by hand
- **WHEN** a company is recorded with kind `bespoke`
- **THEN** its figure is what a firm paid for the work to be done manually

#### Scenario: The meaning is stated twice
- **WHEN** a record carries a second field that restates what `kind` already decides
- **THEN** it is a defect of this requirement, because two fields saying one thing can disagree

### Requirement: A company's location is countable, and its wording is kept

Every company SHALL carry a two-letter country, or nothing when it has not been established, together
with the location as written on the source. Grouping SHALL use the code only.

#### Scenario: A country is recorded
- **WHEN** a company has an established country
- **THEN** it is stored as two letters, and its free-text location is kept beside it

#### Scenario: A country is not established
- **WHEN** nobody has established the country
- **THEN** the field is empty and the company appears under "not established", never under a guess

#### Scenario: A location overview is drawn
- **WHEN** companies are counted by location
- **THEN** the count groups on the country code
- **AND** two spellings of one country cannot appear as two rows

### Requirement: A figure is quoted, never parsed

Every money figure SHALL be stored and displayed verbatim, exactly as published, together with the
note saying where it came from. The system SHALL NOT convert it to a number, round it, convert a
currency, or restate it in its own words.

#### Scenario: A figure is shown
- **WHEN** a figure appears on a surface
- **THEN** it appears character for character as published, with its provenance note reachable

#### Scenario: A figure has no provenance
- **WHEN** an amount is recorded with an empty note
- **THEN** it is rejected, because a price with no page behind it is not evidence

#### Scenario: A figure is a range or a phrase
- **WHEN** a figure is a range, a per-unit rate, a share, or a phrase rather than a single number
- **THEN** it is stored and shown as written, and is not reduced to a representative number

### Requirement: Money that is not the same kind of quantity is never combined

The system SHALL NOT sum, average, or plot on one scale any figures that differ in payer, currency or
footing. Salaries and prices SHALL be presented apart from each other.

#### Scenario: The money is displayed
- **WHEN** figures are shown
- **THEN** what employers pay and what vendors charge appear in separate tables
- **AND** no total, average or single axis spans both

#### Scenario: Figures share a payer but not a footing
- **WHEN** two figures are both vendor prices but one is per year and the other per user per month
- **THEN** the footing is shown on each row and the two are not added together

#### Scenario: A currency is stated without a figure
- **WHEN** a record carries a currency or a footing and no amount
- **THEN** it is rejected, because it would render as a unit beside an empty field

### Requirement: An unrecorded figure is not a zero

A company with no figure SHALL render as not added, and SHALL NOT contribute a zero to any count,
total or chart. A count of companies with a figure SHALL be distinguishable from a count of companies.

#### Scenario: A company has no figure
- **WHEN** a company with no amount is displayed
- **THEN** it reads as not added rather than as zero

#### Scenario: The coverage is reported
- **WHEN** companies are summarised
- **THEN** how many carry a figure is stated separately from how many exist

### Requirement: Counting is allowed; adding is not

Charts and summaries over companies SHALL show counts of records, or figures quoted verbatim. Any
value computed from money SHALL NOT be presented.

#### Scenario: A distribution is drawn
- **WHEN** companies are shown by country or by kind
- **THEN** the visual is a count of records, and its length is that count

#### Scenario: A summary is drawn over the money
- **WHEN** a surface summarises the money
- **THEN** it reports how many figures exist and in which currencies
- **AND** it does not report a total, a mean, a median or a range across currencies
