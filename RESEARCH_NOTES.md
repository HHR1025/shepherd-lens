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

### Help Users Reflect

The goal is not to shame the user or diagnose them.

The goal is to help them notice:

* what the feed repeats
* what it intensifies
* what it narrows
* what it neglects
* whether their actions change future recommendations

---

## 5. Recommended Roadmap Adjustment

Before OpenAI integration, build a stronger local measurement layer.

Suggested order:

1. channel concentration
2. topic concentration
3. topic entropy
4. session timeline
5. repetition loop detection
6. simple user experiment mode
7. backend API
8. LLM interpretation layer

The LLM should explain measured structures.

The LLM should not invent the structures.

Correct architecture:

```text
feed extraction
-> local metrics
-> history
-> drift / loop detection
-> evidence layer
-> optional LLM interpretation
-> reflective interface
```
