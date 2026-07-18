# Shepherd Lens

## Subtitle

See how algorithms shape your attention.

Internal codename: Electronic Shepherd Prototype

---

# 1. Project Framing

Shepherd Lens is an AI-native experimental Chrome Extension for interpreting recommendation atmospheres.

It is not yet a complete cognitive analysis system. The current project should be understood in three layers:

* Current Prototype: what works today
* Experimental Layer: what the next stages will test
* Long-Term Vision: what the project is ultimately exploring

This distinction matters. Shepherd Lens should not pretend that atmospheric language is the same thing as real attention modeling.

---

# 2. Current Prototype

Current real capability:

* Chrome Extension Manifest V3
* YouTube content script injection
* background service worker
* React-based floating sidebar
* TailwindCSS styling
* Framer Motion animation
* collapsible and draggable progressive-disclosure UI
* visible YouTube feed extraction
* deterministic local attention and structure signals
* bounded local history and drift comparison
* session timeline and repetition-loop indicators
* user-marked before/after experiments
* English and Chinese interface copy
* platform adapter boundary

Important:

The current prototype does not perform paid or generative AI analysis, emotion detection, embeddings, topology analysis, causal inference, or platform-internal recommendation analysis.

Its current measurements are local heuristics derived from visible page content and bounded browser-local history.

---

# 3. Near-Term Experimental Layer

The next meaningful stage is not more glow effects.

The next meaningful stage is attention environment inference.

This means building a pipeline where feed content produces visible signals before any model interpretation happens.

Recommended low-cost pipeline:

```text
visible feed
-> feed extraction
-> statistical attention signals
-> optional open-source embeddings
-> pattern extraction
-> retrieval / source discovery where relevant
-> optional local or open-source interpretation
-> atmospheric interface
```

The system should avoid becoming:

```text
feed
-> GPT
-> cool-sounding words
```

That would be too hollow.

---

# 4. Core Product Bet

Shepherd Lens becomes useful only when it tracks recommendation environments over time.

Single-page analysis is only a diagnostic snapshot. It can show that the extension is observing the feed, but it is not the main product value.

The real value comes from:

* detecting recommendation drift across days and weeks
* noticing repeated topic loops
* comparing the current feed with previous snapshots
* showing how attention pressure changes over time
* identifying when informational variety narrows or expands
* estimating what type of viewer the algorithm appears to be optimizing for

The project should therefore move quickly from:

```text
current page score
```

to:

```text
feed history
-> drift comparison
-> repeated loops
-> changing algorithmic persona
-> evidence-backed reflection
```

This is the difference between a decorative dashboard and a useful recommendation-system mirror.

---

# 5. Attention Signals

The project should define measurable attention signals before claiming deeper analysis.

Initial signals to explore:

| Signal | Possible method |
| --- | --- |
| stimulation density | title length, punctuation, capitalization, thumbnail/title hook patterns |
| conflict saturation | conflict keyword frequency and topic framing |
| novelty density | embedding distance between visible recommendations |
| repetition loops | clustering repeated channels, topics, or similar titles |
| attention fragmentation | topic switching frequency across visible feed items |
| emotional volatility | shifts in affective language across recommendations |
| short-form pressure | duration distribution and short-video ratio |
| topic concentration | clustering visible feed items by semantic similarity |

These signals are experimental indicators, not objective psychological measurements.

---

# 6. Product Philosophy

The product should never:

* morally lecture the user
* diagnose psychology
* claim objective truth
* classify ideology with certainty
* pretend placeholder words are real analysis

Avoid:

* You are addicted
* You are radicalized
* This is misinformation
* Negative sentiment: 42%
* Anger: 0.7

Prefer:

* Algorithmic pressure may be increasing
* Attention rhythm appears unstable
* Informational diversity appears reduced
* This feed shows high stimulation density
* Conflict framing appears elevated

Tone:

* reflective
* atmospheric
* ambient
* AI-native
* slightly uncanny
* honest about uncertainty

---

# 7. Long-Term Vision

The long-term vision is an AI-native cognitive interface layer between humans and recommendation systems.

The project explores:

How recommendation systems shape attention and cognition over time.

The goal is to make invisible algorithmic environments more visible, without pretending to diagnose the user.

Long-term capabilities may include:

* feed topology
* semantic clustering
* repetition density analysis
* longitudinal drift tracking
* recommendation drift comparison
* repeated topic loop detection
* algorithmic persona generation
* changing algorithmic persona over time
* cognitive weather summaries
* topic concentration mapping
* novelty decay tracking

---

# 8. Technical Stack

## Frontend

* React
* Next.js
* TypeScript
* TailwindCSS
* shadcn/ui
* Framer Motion

## Chrome Extension

* Manifest V3
* content scripts
* background service worker
* browser storage API
* message passing
* injected sidebar UI

## Backend

Planned:

* Python
* FastAPI

Backend responsibilities:

* feed analysis orchestration
* signal calculation
* open-source embedding jobs where needed
* public-source retrieval
* longitudinal analysis
* topology calculations
* optional local model orchestration

## Database

Initially:

* SQLite

Later:

* PostgreSQL
* pgvector

## Model and Retrieval Layer

Primary strategy:

* local heuristics first
* open-source models where useful
* public retrieval APIs before generative interpretation
* paid LLM APIs only as optional future adapters

Possible tasks:

* topic grouping
* source discovery assistance
* evidence summarization from retrieved links
* optional atmospheric interpretation
* optional cognitive weather generation
* trend summarization

Important:

The project should not depend on paid LLM access to be useful.

Any model should interpret extracted structures and retrieved sources. It should not be the only source of truth.

Recommended low-cost tools and APIs:

* sentence-transformers for local embeddings
* MiniLM or E5-style embedding models for topic similarity
* spaCy or KeyBERT for lightweight keyword extraction
* OpenAlex, Crossref, Semantic Scholar, and arXiv for research retrieval
* World Bank, OECD, IMF, Eurostat, WHO, and UN Data for public statistics
* Wikipedia and Wikidata for reference navigation, not final authority
* browser-accessible search APIs only where cost and terms are acceptable

---

# 9. Supported Platforms

## MVP

1. YouTube
2. Reddit
3. X/Twitter

## Future

* TikTok
* Instagram
* Xiaohongshu
* Bilibili

---

# 10. UI Design Philosophy

The UI matters, but it should support the model rather than hide the absence of one.

The interface should feel:

* ambient
* translucent
* cinematic
* neural
* atmospheric
* elegant
* slightly dystopian

Avoid:

* enterprise dashboards
* spreadsheets
* corporate SaaS appearance
* empty cyberpunk language without evidence

---

# 11. Development Philosophy

Build incrementally.

Prioritize:

* working demos
* visible progress
* honest project status
* measurable signals
* explainable interpretation
* strong UX

Avoid:

* overengineering
* premature optimization
* giant rewrites
* massive feature explosions
* overstating current capability

---

# 12. Development Workflow

Core workflow:

```text
Issue
-> Codex implementation
-> local testing
-> commit
-> push
-> next issue
```

Every completed stage should be committed.

Example:

```bash
git add .
git commit -m "Stage 1 sidebar injection working"
git push
```

---

# 13. First Real Milestone

The first milestone is:

```text
YouTube page
-> sidebar injected
-> placeholder atmosphere rendered
```

Status:

Completed on 2026-05-28.

What it proves:

* the extension loads
* content script injection works
* React rendering works inside YouTube
* the project has a visible interface surface

What it does not prove:

* real feed analysis
* emotion detection
* attention modeling
* longitudinal tracking
* topology analysis

---

# 14. Development Stages

## Stage 0: Project Initialization

Goal:
Create clean architecture.

Tasks:

* setup repo
* setup Next.js
* setup TypeScript
* setup TailwindCSS

Status:
Complete.

---

## Stage 1: Sidebar Injection

Goal:
Inject floating sidebar into YouTube.

Requirements:

* Manifest V3
* content script
* background service worker
* dark translucent UI
* collapsible panel
* React rendering
* Framer Motion animation

Status:
Complete.

No AI analysis yet.

---

## Stage 2: Feed Extraction

Goal:
Extract visible YouTube feed data.

Requirements:

* titles
* descriptions where visible
* channels
* video durations where visible
* dynamic feed updates
* infinite scroll support
* duplicate avoidance

Output shape:

```json
[
  {
    "title": "...",
    "channel": "...",
    "description": "...",
    "duration": "...",
    "url": "..."
  }
]
```

Status:
Complete.

---

## Stage 3: Local Attention Signals

Goal:
Turn extracted feed items into measurable experimental signals.

Initial metrics:

* stimulation density
* conflict saturation
* novelty density
* repetition density
* topic concentration
* attention fragmentation

This stage should exist before model-based interpretation.

Status:
Complete.

---

## Stage 4: Local History Tracking

Goal:
Store feed snapshots and signal snapshots locally so Shepherd Lens can compare recommendation environments over time.

Requirements:

* save extracted feed snapshots
* save local attention signal snapshots
* store timestamped records in browser storage
* avoid unbounded storage growth
* expose recent snapshot count in the sidebar
* prepare comparison windows such as current vs previous session

Status:
Complete.

---

## Stage 5: Drift Comparison

Goal:
Detect simple recommendation-environment changes from stored local history.

Requirements:

* compare current signals with previous snapshots
* detect rising or falling stimulation density
* detect rising or falling conflict saturation
* detect repeated channels or topic loops
* detect novelty decay
* render a concise local comparison summary

Status:
Complete.

---

## Stage 6: Local Measurement Expansion

Goal:
Strengthen the local measurement layer before any backend or model-based interpretation.

Requirements:

* channel concentration
* topic concentration
* visible feed entropy
* source diversity
* title hook density
* evidence references for each metric

Status:
Complete.

---

## Stage 7: UI Progressive Disclosure

Goal:
Restructure the sidebar so new features become expandable layers rather than permanent metric walls.

Requirements:

* Overview view
* Evidence view
* compact default summaries
* expandable attention metrics
* expandable feed structure metrics
* expandable drift analysis
* calm non-dashboard interaction model

Reference:

* UI_PHILOSOPHY.md

Status:
Complete.

---

## Stage 8: Platform Adapter Architecture

Goal:
Refactor Shepherd Lens so future platforms can be added without rewriting metrics, history, drift, evidence, or UI layers.

Requirements:

* define a platform adapter interface
* isolate YouTube-specific DOM selectors and navigation handling
* preserve current YouTube behavior
* keep metrics platform-independent
* normalize extracted items into a shared feed model
* avoid adding new platform support in this stage

Reference:

* PLATFORM_ADAPTER_ARCHITECTURE.md

Status:
Complete.

---

## Stage 9: Session Timeline and Loop Detection

Goal:
Show how the recommendation environment changes within and across sessions.

Requirements:

* session timeline
* repeated topic loop detection
* novelty decay
* session-to-session similarity
* recurring channel exposure
* topic switching speed

Status:
Complete.

---

## Stage 10: User Experiment Mode

Goal:
Support small user-side experiments about recommendation agency.

Examples:

* before / after search drift
* before / after watch drift
* before / after ignore behavior
* recovery from unwanted topic loops
* simple intervention notes

Status:
Complete.

---

## Stage 11: Observation Quality and Validity Indicators

Goal:
Make the system honest about how strong or weak the current observation is before adding evidence retrieval.

Requirements:

* visible sample size quality
* page context detection
* history depth and recency
* extraction freshness
* selector health / extraction health
* confidence boundary labels such as snapshot, session trend, or weak signal
* local-only wording that avoids platform-wide claims

This stage should make clear when Shepherd Lens is seeing only:

```text
a small visible sample
```

rather than:

```text
the user's complete recommendation environment
```

Status:
Next.

---

## Stage 12: Evidence Layer and Source Navigation

Goal:
Help users understand the evidence environment surrounding visible recommended content.

Requirements:

* evidence availability indicator
* source categorization
* source navigation panel
* primary source detection where possible
* independent reporting detection where possible
* citation visibility detection
* clear boundary that evidence confidence is not a truth score
* open-source and public API retrieval before paid model interpretation
* source links before generated summaries

Reference:

* EVIDENCE_LAYER.md

---

## Stage 13: Backend API

Goal:
Create FastAPI analysis service after the local measurement layer is stronger.

Requirements:

* POST /analyze-feed
* receive feed JSON
* receive calculated signals
* receive local history context where appropriate
* return structured atmosphere analysis
* preserve uncertainty and evidence references
* support retrieval adapters for public/open APIs
* keep paid model calls optional

---

## Stage 14: Open-Source Interpretation Layer

Goal:
Use local or open-source models to interpret measured feed structures and attention signals where useful.

The model should receive:

* extracted feed items
* calculated metrics
* drift comparisons
* evidence references
* topic clusters where available
* clear safety and uncertainty instructions

The model may return:

* atmosphere labels
* cognitive weather summary
* evidence-based explanation
* uncertainty notes

The model should explain measured structures, not invent them.

Paid LLM APIs may be added later as adapters, but they are not required for the core product.

---

## Stage 15: Algorithmic Persona

Goal:
Generate atmospheric AI personas only after evidence-backed interpretation exists.

Examples:

* Late-Night Doomscroller
* Conflict-Reactive Explorer
* Fast-Stimulation Seeker
* Endless Scroll Wanderer

Persona output must remain probabilistic and non-diagnostic.

---

## Stage 16: Longitudinal Analysis

Goal:
Detect attention environment drift over time.

Examples:

* conflict exposure increased
* long-form exposure decreased
* informational diversity dropped
* repetition loops intensified

---

## Stage 17: Feed Topology

Goal:
Visualize information structure.

Tasks:

* open-source embeddings
* clustering
* graph visualization
* repetition density analysis
* emotional homogeneity analysis

---

## Stage 18: Visual Polish

Goal:
Polish atmosphere and UX after the signal pipeline exists.

Add:

* glow effects
* neural animation accents
* smooth transitions
* translucent panels
* cinematic typography

Important:

Visual polish should not outrun analytical substance.

---

# 15. Issue Management Rules

Every major task should become:

* one GitHub Issue
* one focused implementation task

Avoid giant Issues.

Good:

* Implement YouTube sidebar injection
* Extract visible YouTube feed titles
* Add local stimulation density metric

Bad:

* Build full AI cognitive platform

---

# 16. Current Priority

Current priority after Stage 10:

```text
observation quality and validity indicators
-> evidence layer and source navigation
-> evidence-backed reflection over time
```

The next task should build on the local experiment and timeline layers.

The next task should make the product more honest about sampling limits, page context, history depth, and extraction reliability.

After that, the project should help users inspect source visibility and evidence availability through open retrieval sources and public APIs.
