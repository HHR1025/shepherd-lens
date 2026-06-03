# Shepherd Lens - Evidence Layer

## Purpose

The Evidence Layer extends Shepherd Lens beyond recommendation observation.

The Recommendation Environment asks:

```text
What is the platform showing the user?
```

The Evidence Layer asks:

```text
How easy is it for the user to independently verify what they are seeing?
```

The goal is not to determine truth.

The goal is to improve visibility into the evidence environment around visible content.

---

## Core Philosophy

Shepherd Lens is not:

* a fact checker
* a truth detector
* a political moderator
* a misinformation authority

Shepherd Lens is:

* an evidence navigator
* a source discovery layer
* a verification assistant
* a friction reducer for independent checking

The system should help users ask:

```text
What evidence exists for this claim?
```

It should avoid claiming:

```text
This claim is true.
```

---

## Evidence Environment

The Evidence Environment represents the visible and discoverable sources, references, and supporting material around a piece of recommended content.

Useful questions:

* Can this content be independently checked?
* Are primary sources available?
* Are research sources available?
* Are independent reports available?
* Are the cited sources visible to the user?
* How much effort does verification require?

---

## Evidence Confidence Index

Future metric:

```text
Evidence Confidence Index (ECI)
```

ECI estimates the availability and quality of supporting evidence.

Important boundaries:

* ECI is not a truth score.
* ECI is not a correctness score.
* ECI is not a political score.
* ECI does not settle disputed claims.

ECI reflects:

* evidence availability
* source quality
* source diversity
* independent confirmation
* citation visibility

---

## Proposed ECI Components

### Primary Source Ratio

Suggested weight:

```text
40%
```

Examples:

* government statistics
* official reports
* public datasets
* regulatory filings
* court documents
* company filings

### Independent Confirmation

Suggested weight:

```text
25%
```

Examples:

* Reuters
* Associated Press
* AFP
* multiple independent reporting organizations

Multiple independent confirmations should increase evidence confidence, while copied or syndicated references should not be over-counted.

### Source Diversity

Suggested weight:

```text
20%
```

Evidence is stronger when it comes from distinct categories:

* primary source
* research source
* independent reporting
* reference source

### Citation Visibility

Suggested weight:

```text
15%
```

Content that explicitly references sources should receive a higher evidence visibility score.

Examples:

* "According to Eurostat..."
* "Based on IMF data..."
* "The court filing states..."
* "The official report shows..."

---

## Source Categories

### Primary Sources

* government statistics
* official reports
* public datasets
* regulatory filings
* court filings
* company filings

### Research Sources

* academic papers
* university publications
* research institutes
* public policy institutes

### Independent Reporting

* Reuters
* Associated Press
* AFP
* other reputable reporting organizations

### Reference Sources

* encyclopedic references
* public knowledge repositories
* official documentation

---

## Source Navigation

The Evidence Layer should reduce verification friction.

Users should be able to quickly access supporting material without leaving the product in a maze of tabs.

Example UI summary:

```text
Evidence Confidence
High

Primary Sources Available
Research Sources Available
Independent Reporting Available

[View Sources]
```

The source panel should prioritize links over generated conclusions.

---

## Product Principles

### Support User Agency

The user remains responsible for judgment.

Shepherd Lens should support inquiry, not replace it.

### Be Verifiable

Prefer evidence links over generated claims.

Every evidence summary should be traceable to visible sources.

### Avoid Truth Claims

Measure evidence structures, not truth.

Correct:

```text
Primary sources found.
```

Incorrect:

```text
This video is correct.
```

### Remain Politically Neutral

Evaluate evidence availability and source structure rather than viewpoints.

### Preserve Uncertainty

If source discovery is incomplete, say so.

No source found does not always mean no evidence exists.

---

## Roadmap

### Phase 1

* evidence availability indicator
* source categorization
* source navigation panel
* manual source opening

### Phase 2

* Evidence Confidence Index
* primary source ratio
* source diversity metric
* citation visibility detection

### Phase 3

* evidence density
* independent confirmation count
* evidence environment summary
* duplicated source detection

### Phase 4

* longitudinal evidence tracking
* evidence environment trends
* evidence availability drift

---

## Important Limitation

Shepherd Lens does not determine truth.

Shepherd Lens measures:

* evidence availability
* source visibility
* source diversity
* verification accessibility

The user remains responsible for forming conclusions.
