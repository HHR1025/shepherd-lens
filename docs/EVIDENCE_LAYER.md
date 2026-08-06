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

The first versions should use open retrieval sources and public APIs before relying on paid generative models.

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
* a public-source retrieval interface

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

Useful public APIs and sources:

* World Bank
* OECD
* IMF
* Eurostat
* WHO
* UN Data
* national statistics offices

### Research Sources

* academic papers
* university publications
* research institutes
* public policy institutes

Useful public APIs and sources:

* OpenAlex
* Crossref
* Semantic Scholar
* arXiv
* PubMed where relevant

### Independent Reporting

* Reuters
* Associated Press
* AFP
* other reputable reporting organizations

### Reference Sources

* encyclopedic references
* public knowledge repositories
* official documentation

Useful public APIs and sources:

* Wikidata
* Wikipedia
* official documentation sites

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

The first implementation should prefer:

```text
title / channel / visible text
-> claim-like phrase or entity extraction
-> public source search
-> categorized links
-> evidence availability summary
```

It should avoid:

```text
title
-> generative model
-> unsupported verdict
```

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

### Keep Costs Low

Evidence discovery should be useful without paid LLM access.

Preferred order:

1. local rules and entity extraction
2. public APIs and open indexes
3. open-source embeddings or rerankers
4. optional user-configured paid model adapters

---

## Roadmap

### Phase 1

* evidence availability indicator
* source categorization
* source navigation panel
* manual source opening
* public API retrieval proof of concept
* no generated truth verdicts

Status:
Implemented in Stage 12.

Current implementation:

* starts only after the user selects one visible recommendation and requests a search
* shows the exact deterministic query derived from visible metadata
* queries Crossref, English or Chinese Wikipedia, and GDELT through the MV3 service worker
* returns categorized research, reference, and reporting links
* keeps provider failures independent and rejects unsafe or duplicate URLs
* detects visible citation wording, DOI or URL identifiers, named primary institutions,
  and named independent reporting organizations using transparent local rules
* does not persist retrieved results or send the complete feed or local history
* states that results are discovery links, not verification or truth judgments

The GDELT category is deliberately labeled `reporting`, not `independent reporting`.
Independence is only surfaced when a known organization is explicitly visible; the
retrieval provider alone is not treated as proof of editorial independence.

Optional backend follow-up:

* exposes versioned `POST /v1/evidence/search` for one explicit bounded query
* implements keyless Crossref and English or Chinese Wikipedia adapters
* isolates provider success, empty, timeout, and error states
* reports bounded provider elapsed times without logging query contents
* uses a bounded process-local TTL cache and does not cache complete provider failures
* remains disconnected from the extension until an explicit consent and transport milestone

The backend does not duplicate GDELT retrieval yet. That provider remains in the extension
path until its backend response and operational behavior are validated independently.

### Phase 2

* Evidence Confidence Index
* primary source ratio
* source diversity metric
* citation visibility detection
* basic entity and claim-like phrase extraction
* open-source reranking where needed

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

Paid LLM access is not a requirement for the Evidence Layer.

If models are used, they should summarize retrieved sources and uncertainty rather than create unsupported conclusions.
