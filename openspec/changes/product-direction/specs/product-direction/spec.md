## ADDED Requirements

### Requirement: Discovery starts from direction, not a known problem

The system SHALL accept sparse direction such as a market, geography, industry, role, workflow area,
constraint or free-form prompt. A user SHALL NOT need to provide a pre-framed problem before the
engine can search.

#### Scenario: A user gives a loose prompt

- **WHEN** the user enters “financial operations in European RIAs”
- **THEN** the system creates a traceable discovery run
- **AND** the run records the input and the source classes searched
- **AND** the result may contain candidate problems without pretending they are accepted records

### Requirement: The engine discovers concrete work

Every candidate problem SHALL describe a concrete workflow, the person or team doing it, and the
context in which it happens. A category label or generic complaint alone SHALL NOT be a candidate
problem.

#### Scenario: A source describes manual work

- **WHEN** a source says that a role reconciles files, prepares reports or fulfils a regulatory task
- **THEN** the candidate preserves the work as a workflow
- **AND** the source quote and URL remain reachable
- **AND** the candidate names what is still unknown

### Requirement: Discovery separates pain, money and repetition

The engine SHALL keep separate evidence for pain, money or headcount already committed, and
repetition across firms, roles or events. It SHALL NOT turn one source into proof of all three.

#### Scenario: A community post describes severe pain

- **WHEN** the source contains a complaint but no paid service, salary or procurement evidence
- **THEN** it may support pain language
- **AND** it SHALL NOT be marked as proof that someone pays today

### Requirement: The engine finds existing business patterns

For a discovered workflow, the system SHALL be able to collect existing businesses, vendors,
contractors or comparable services, together with their segment, offer, pricing basis and source.
The result SHALL be labelled as a business pattern or comparison, not as a guaranteed opportunity.

#### Scenario: A vendor has a public price

- **WHEN** a pricing page gives a figure and its basis
- **THEN** the figure is kept verbatim with the URL
- **AND** the system does not add it to salaries, contract values or other figures
- **AND** the page is reachable from the candidate it supports

### Requirement: Copy and start paths are hypotheses

The system MAY show possible paths such as copy the service model, adapt it to another segment, or
start a new product. It SHALL show the evidence and unknowns behind the path and SHALL NOT state that
the path will work.

#### Scenario: A business pattern resembles the user's target

- **WHEN** an existing business serves a similar workflow
- **THEN** the system may suggest “investigate adapting this model”
- **AND** it names the similarity and the difference
- **AND** it does not imply permission to copy protected assets or a forecast of success

### Requirement: Candidates wait for human acceptance

Discovery results SHALL remain proposals until a person accepts them. Running a discovery, loading a
page or collecting a source SHALL NOT create or modify a tracked problem, business record, gate,
verdict, score or decision.

#### Scenario: A user reviews a candidate

- **WHEN** the user accepts it
- **THEN** the accepted candidate, reason and source bundle are written together
- **AND** the candidate becomes eligible for the existing validation loop

#### Scenario: A user rejects a candidate

- **WHEN** the user rejects it
- **THEN** the candidate remains outside the tracked problem set
- **AND** the rejection reason may be stored for the discovery run

### Requirement: Every discovery result is traceable

Every candidate claim SHALL point to one or more source citations containing a URL, source status,
and the exact quote or figure that supports it. A generated summary without a supporting citation
SHALL be labelled as an inference or unknown.

#### Scenario: The engine clusters several sources

- **WHEN** three sources appear to describe the same workflow
- **THEN** the cluster retains all three source links and the evidence extracted from each
- **AND** the cluster size is shown as a count of sources, not as a probability of market size

### Requirement: Accepted candidates enter validation

Once accepted, a candidate SHALL enter the existing problem-validation loop: paid-today evidence,
repetition, buyer, next test, and eventually a human continue, park or kill decision. Discovery
analysis SHALL NOT bypass those gates.

#### Scenario: A candidate is accepted

- **WHEN** it becomes a tracked Problem
- **THEN** its source bundle remains attached or reachable
- **AND** missing gates remain visibly unknown
- **AND** the user is shown the next validation question rather than a final business verdict
