# Future Claim Verification Agent

## Status

Research Concept

Roadmap Only

Do Not Implement Yet

---

## Vision

Current Shepherd Lens focuses on:

* Recommendation Environment
* Attention Environment
* Evidence Environment

Future versions may introduce a Claim Verification Agent.

The purpose is to help users investigate whether specific factual claims are supported by publicly available evidence.

The system should not determine objective truth.

The system should evaluate evidence availability and evidence support.

This agent should not depend on paid LLM APIs. If models are used, open-source or user-configured adapters should be preferred.

---

## Motivation

Current recommendation analysis answers:

```text
What am I being shown?
```

Current evidence analysis answers:

```text
What evidence is available?
```

Future claim verification should answer:

```text
What evidence supports or contradicts the specific claims being made?
```

---

## Important Principle

The system should verify claims.

The system should not verify narratives.

---

## Claims vs Narratives

### Verifiable Claim

Examples:

* Hungary's inflation rate reached 10%.
* China's GDP growth was below 2%.
* The unemployment rate increased by 3%.

Characteristics:

* measurable
* time-bounded
* evidence retrievable

### Narrative

Examples:

* China is collapsing.
* Europe is doomed.
* Democracy is dying.
* Society is falling apart.

Characteristics:

* interpretive
* subjective
* difficult to operationalize

Narratives should not receive automated verification scores.

---

## Conceptual Pipeline

```text
Video / article / post
-> Transcript or text extraction
-> Claim extraction
-> Claim classification
-> Evidence retrieval
-> Evidence evaluation
-> Evidence report
```

---

## Stage 1: Transcript Extraction

Input:

* YouTube videos
* articles
* social media posts

Output:

Plain text content suitable for analysis.

Potential technologies:

* YouTube transcript APIs
* speech-to-text models
* OCR for images
* document parsing

---

## Stage 2: Claim Extraction

Goal:

Identify potentially verifiable claims.

Example input:

```text
Hungary's inflation reached 10%.
```

Example output:

```text
Claim: Hungary's inflation rate reached 10%.
```

Potential technologies:

* rule-based extraction for simple numeric or named-entity claims
* open-source information extraction models
* local small language models where available
* structured prompting only as an optional adapter
* information extraction models

---

## Stage 3: Claim Classification

Classify extracted claims.

Categories:

* Economic
* Political
* Scientific
* Health
* Demographic
* Corporate
* Legal

Determine:

* Verifiable
* Partially Verifiable
* Narrative
* Opinion

Only verifiable claims should continue into evidence retrieval.

---

## Stage 4: Evidence Retrieval

Retrieve supporting information from open sources.

Official statistics:

* Eurostat
* World Bank
* IMF
* OECD
* WHO
* UN Data
* National Statistics Offices

Research sources:

* Google Scholar
* Semantic Scholar
* OpenAlex
* Crossref
* arXiv
* PubMed where relevant

Independent reporting:

* Reuters
* Associated Press
* AFP

Public documents:

* government reports
* regulatory filings
* corporate disclosures

---

## Stage 5: Evidence Evaluation

Evaluate:

* source availability
* source quality
* source diversity
* independent confirmation

The system should avoid:

* truth judgments
* political conclusions
* ideological scoring

---

## Stage 6: Evidence Report

Example:

```text
Claim:
"Hungary's inflation reached 10%."

Evidence Support:
Moderate

Sources Found:
Official Sources: 3
Research Sources: 2
Independent Reports: 4

Evidence Confidence:
High

View Sources:
[Source 1]
[Source 2]
[Source 3]
```

---

## Evidence Confidence

Future metric.

Evidence Confidence is not:

* truth probability
* correctness probability
* misinformation score

Evidence Confidence represents:

* evidence availability
* source quality
* source diversity
* independent verification

---

## Potential Technologies

Frontend:

* React
* TypeScript

Backend:

* Python
* FastAPI

Data processing:

* spaCy
* NLTK
* sentence-transformers
* KeyBERT
* open-source rerankers

Retrieval:

* Common Crawl
* OpenAlex API
* Crossref API
* Semantic Scholar API
* arXiv API
* World Bank API
* OECD API
* IMF Data API
* Eurostat API
* Wikidata API
* optional low-cost search APIs

LLMs:

* local models
* open-source hosted models where terms and cost are acceptable
* GPT / Claude only as optional user-configured adapters

Vector storage:

* Qdrant
* Chroma
* Weaviate

---

## Relationship To Shepherd Lens

Layer 1:

```text
Recommendation Environment
What am I seeing?
```

Layer 2:

```text
Attention Environment
How is attention being shaped?
```

Layer 3:

```text
Evidence Environment
What evidence exists?
```

Layer 4:

```text
Claim Verification Agent
What evidence supports or contradicts specific factual claims?
```

---

## Risks

Potential risks:

* hallucinated claim extraction
* poor source quality
* political controversy
* verification ambiguity
* narrative misclassification

Mitigation:

* prioritize transparency
* show sources
* avoid truth labels
* expose reasoning steps
* keep users in control
* separate retrieved evidence from model-generated explanation
* keep model use optional

---

## Roadmap Position

Current priority:

1. Feed extraction
2. Local metrics
3. Drift analysis
4. Evidence Layer

Future priority:

1. Source Navigation
2. Evidence Confidence Index
3. Open-source retrieval and reranking
4. Claim Verification Agent

The Claim Verification Agent should not begin until the Recommendation Environment and Evidence Environment layers are mature and stable.

---

## Long-Term Goal

Help users move from:

```text
I saw this.
```

to:

```text
I understand why I saw this.
```

to:

```text
I know how to investigate whether the underlying claims are supported by evidence.
```

The system should augment human judgment rather than replace it.
