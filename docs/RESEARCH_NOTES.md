# Shepherd Lens — Research Notes

## 1. Core Position

Shepherd Lens is not trying to reverse-engineer YouTube's internal algorithm.

It observes recommendation outputs visible to the user, records local snapshots over time, and helps users understand changes in their local attention environment.

Core framing:

* recommendation output audit
* user-side algorithm observation
* attention environment tracking
* local-first recommendation reflection

Avoid claiming:

* algorithm decoding
* psychological diagnosis
* complete feed analysis
* causal certainty without intervention design
* platform-wide behavior from a small visible sample

Always distinguish:

* visible sample
* local history
* inferred pattern
* unverified interpretation
* observation quality
* retrieval coverage

---

## 2. Key Research Lessons

### End-User Algorithm Audits

Research direction:
Tools for end-user algorithm audits show that ordinary users need structured support to observe personalized recommendation systems.

Useful lesson:
Raw metrics are not enough. Users need a guided way to understand what changed, what evidence supports it, and how uncertain the observation is.

Implication for Shepherd Lens:

* guide users through observation sessions
* show evidence behind each claim
* avoid overwhelming dashboard UI
* build algorithm literacy gradually

### YouTube Audit Methodology

Research direction:
YouTube audit studies show that results are highly sensitive to sampling method, login state, browsing history, timing, and page type.

Useful lesson:
A single visible screen is not enough to make broad claims about YouTube's algorithm.

Implication for Shepherd Lens:

* label analysis as local and partial
* store page type and timestamp
* compare repeated observations over time
* separate homepage, watch page, search page, and shorts contexts
* avoid saying "YouTube's algorithm is X" from one page

### Crowdsourced Recommendation Audits

Research direction:
Browser-extension-based studies show that user-side tools can collect recommendation outputs for auditing, especially when users explicitly consent.

Useful lesson:
Extensions are a valid research instrument, but privacy and consent are central.

Implication for Shepherd Lens:

* keep storage local by default
* make export explicit
* avoid silent collection of sensitive history
* design any future research mode separately from normal use

### Causal Auditing

Research direction:
Modern recommender audits increasingly ask whether user actions can influence future recommendations.

Useful lesson:
The important question is not only "what am I seeing?" but "can my actions change what I see next?"

Implication for Shepherd Lens:

* track before and after changes
* support small user experiments
* compare recommendation drift after search, watch, hide, ignore, or reset behavior
* eventually estimate user agency without overstating causality

### Information Diet / Epistemic Welfare

Research direction:
Information diet and epistemic welfare frameworks study how recommender systems shape what users know, how diverse their information environment is, and how stable their sense-making conditions are.

Useful lesson:
The project should focus on attention environment and information diet, not simple sentiment detection.

Implication for Shepherd Lens:

* measure diversity
* measure repetition
* measure conflict density
* measure topic concentration
* measure novelty decay
* explain recommendations as an information environment

### Evidence Environment and Verification Friction

Research direction:
Information environments are shaped not only by what content appears, but also by how easily users can inspect supporting sources.

Useful lesson:
The product should not decide truth. It should reduce the friction of independent verification.

Implication for Shepherd Lens:

* distinguish evidence availability from truth
* surface primary sources where possible
* categorize primary, research, reporting, and reference sources
* prefer source links over generated conclusions
* show uncertainty when source discovery is incomplete

### Observation Validity and Reproducibility

Research direction:
Algorithmic audits are difficult to reproduce because recommendation outputs change with time, login state, region, language, device, interaction history, and page context.

Useful lesson:
The product should not only show metrics. It should also show how much trust the user should place in the observation.

Implication for Shepherd Lens:

* label whether the current view is a snapshot, session trend, or weak signal
* expose visible sample size
* expose page context such as home, watch, search, or shorts
* show history depth and recency
* show extraction freshness
* warn when the current sample is too narrow for strong interpretation

### Open-Source and Retrieval-First AI

Research direction:
Many useful information-environment tasks do not require a paid generative model. Topic grouping, source discovery, citation extraction, and evidence navigation can often begin with rules, local embeddings, and public APIs.

Useful lesson:
Shepherd Lens should be useful without paid LLM access.

Implication for Shepherd Lens:

* use local heuristics as the baseline
* use open-source embeddings for topic similarity when needed
* use public source APIs for evidence discovery
* keep paid LLMs as optional adapters rather than core infrastructure
* prefer retrieved links and structured evidence over generated claims

---

## 3. Metrics Worth Building

### Short-Term Metrics

Already started:

* visible feed count
* stimulation density
* conflict density
* novelty proxy
* repetition density
* short-form pressure
* local drift comparison

Next useful metrics:

* channel concentration
* topic concentration
* visible feed entropy
* title hook density
* source diversity

### Medium-Term Metrics

Need local history:

* novelty decay
* repeated topic loops
* topic switching speed
* recommendation drift
* session-to-session similarity
* recurring channel exposure

### Advanced Metrics

Need embeddings or topic modeling:

* topic clusters
* topic transition graph
* semantic drift
* ideological or content-domain clustering
* information diet balance
* exploration vs exploitation ratio

### Experimental Metrics

Need user actions:

* agency score
* intervention response
* post-search drift
* post-watch drift
* recovery from unwanted topic loops

### Evidence Metrics

Need source discovery:

* evidence availability
* primary source ratio
* independent confirmation count
* source diversity
* citation visibility
* verification accessibility

### Observation Quality Metrics

Need before stronger interpretation:

* visible sample size
* page context
* history depth
* snapshot recency
* extraction freshness
* extraction coverage
* selector health
* confidence boundary label

---

## 4. Product Principles

### Be Honest

Do not overstate certainty. A small visible sample is a clue, not a conclusion.

### Be Evidence-Based

Every claim should be linked to observable evidence:

* titles
* channels
* durations
* repeated topics
* metric changes
* timestamps

### Stay Local-First

Default mode should work without backend or cloud analysis.

Sensitive history should remain local unless the user explicitly exports or opts in.

### Avoid Paid-Model Dependency

The project should not require OpenAI, Claude, or any paid LLM provider to deliver its core value.

Open models and public retrieval APIs should be the default path.

Paid models can be supported later as optional adapters for users who explicitly configure them.

### Help Users Reflect

The goal is not to shame the user or diagnose them.

The goal is to help them notice:

* what the feed repeats
* what it intensifies
* what it narrows
* what it neglects
* whether their actions change future recommendations

### Avoid Truth Claims

Shepherd Lens should help users navigate evidence.

It should not claim to be a fact checker, truth detector, or misinformation authority.

Correct:

```text
Primary sources found.
```

Incorrect:

```text
This claim is true.
```

---

## 5. Recommended Roadmap Adjustment

Before any paid model integration, build a stronger local measurement and retrieval layer.

Suggested order:

1. channel concentration
2. topic concentration
3. topic entropy
4. progressive disclosure UI
5. platform adapter architecture
6. session timeline
7. repetition loop detection
8. simple user experiment mode
9. observation quality and validity indicators
10. evidence layer
11. backend API
12. open-source interpretation layer
13. optional paid LLM adapters

Models should explain measured structures.

Models should not invent the structures.

## 6. Engineering Calibration Before Model Interpretation

The current metrics now have a versioned synthetic calibration baseline covering every
attention and feed-structure score in English, Chinese, or mixed-language fixtures.
This catches implementation drift and makes expected relative behavior reviewable.

Calibration is not validation. The fixtures are designed by the project and therefore
cannot establish construct validity, generalize to real recommendation feeds, or replace
independent human labels. Before making stronger claims, the project should define each
construct operationally, sample real feeds with consent, collect multiple blinded labels,
measure inter-rater agreement, and evaluate held-out errors across language and page type.

See `MEASUREMENT_VALIDATION.md` for the implemented gate and the scientific validation
boundary.

## 7. Independent Annotation Protocol

The project now defines a versioned human-study contract, bilingual 0-4 anchors for all
current measurements, blinded annotation packets, and deterministic per-measurement
reliability reports. Krippendorff's alpha with squared rank distance was selected because
the planned design uses ordinal judgments, may include more than two raters, and permits
missing values.

This choice follows Hayes and Krippendorff's general reliability criteria and remains a
point estimate rather than a validity verdict. Current annotation-method research also
emphasizes reporting uncertainty and disagreement patterns, while a 2026 audit of NLP
papers identifies recurring omissions around recruitment, training, language proficiency,
compensation, demographics, adjudication, and agreement. The project protocol therefore
requires these fields in any future public study report.

No real feed sample or independent rating has been collected. Protocol readiness must not
be described as completed scientific validation. See `HUMAN_VALIDATION_PROTOCOL.md`.

Correct architecture:

```text
feed extraction
-> platform normalization
-> local metrics
-> history
-> drift / loop detection
-> observation quality
-> evidence layer
-> optional open-source interpretation
-> reflective interface
```

Recommended low-cost sources and tools:

* sentence-transformers for local embeddings
* spaCy, KeyBERT, or lightweight keyword extraction
* OpenAlex, Crossref, Semantic Scholar, and arXiv for research sources
* World Bank, OECD, IMF, Eurostat, WHO, and UN Data for public statistics
* Wikidata and Wikipedia for reference navigation
* browser-accessible search APIs only if pricing, terms, and privacy are acceptable
