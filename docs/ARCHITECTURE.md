# Shepherd Lens Architecture

## Scope

This document describes the implemented architecture. Future product ideas remain in `PROJECT_MASTER_PLAN.md`.

## Runtime Flow

```text
YouTube DOM
-> PlatformAdapter
-> FeedItem[]
-> ExtensionRuntime store
-> attention and structure measurements
-> bounded local history
-> drift, session, and experiment comparisons
-> injected React sidebar

explicitly selected FeedItem
-> deterministic evidence query
-> background public-index adapters
-> validated categorized source links

optional normalized measurements
-> strict versioned API models
-> deterministic analysis engine
-> traceable structured response
```

## Layer Boundaries

### Platform Layer

Files:

* `extension/src/platform-adapter.ts`
* `extension/src/platforms/`

Responsibilities:

* detect supported pages
* extract platform DOM into normalized `FeedItem` values
* observe platform navigation and feed changes

Platform selectors must not appear in measurement, history, or UI formatting modules.

### Domain Layer

Files:

* `attention-signals.ts`
* `local-measurements.ts`
* `drift-comparison.ts`
* `session-timeline.ts`
* `user-experiment.ts`
* `observation-quality.ts`
* `evidence-analysis.ts`
* `measurement-calibration.ts`
* `measurement-calibration-corpus.ts`
* `measurement-validation-definitions.ts`
* `measurement-validation-study.ts`

Responsibilities:

* calculate deterministic local signals
* compare snapshots and sessions
* derive categorical observation boundaries from visible sample and runtime context
* derive transparent evidence queries and visible citation cues from one selected item
* remain independent of YouTube DOM selectors and React

Domain calculations should be pure wherever possible and covered by unit tests.
Keyword-based title signals include explicit English and Chinese phrase sets; they remain
transparent heuristics and are tested against calm and hook-heavy examples in both languages.

The versioned synthetic calibration corpus calls these production calculations directly.
It verifies bounded, deterministic behavior for every current measurement without
duplicating formulas. This is an engineering regression gate, not scientific validation;
the distinction and future validation requirements are documented in
`MEASUREMENT_VALIDATION.md`.

The human-validation modules are also pure and remain outside the extension runtime.
They validate versioned study data, create packets that omit local scores and existing
annotations, and calculate descriptive per-measurement reliability reports. They do not
collect feeds, identify raters, alter production scores, or expose validation claims in
the sidebar. The study governance requirements are documented in
`HUMAN_VALIDATION_PROTOCOL.md`.

### Persistence Layer

Files:

* `history-tracking.ts`
* `user-experiment.ts`
* `runtime-persistence.ts`
* `browser-runtime-persistence.ts`
* `background.ts`
* `runtime-schema.ts`
* `storage-schema.ts`

Responsibilities:

* read and validate untrusted browser-local data
* migrate supported legacy local records
* cap retained history and experiments
* expose storage-independent interfaces for tests
* serialize history and experiment transactions across extension tabs

Stored data must be validated at runtime because TypeScript types do not protect persisted JSON.
History and experiment records carry explicit schema versions. Malformed and supported
legacy records fall back or migrate safely. Unknown future versions are rejected before
any write, keeping an older extension instance from downgrading newer stored data.

Read-modify-write operations are sent to the Manifest V3 service worker and executed
through one serial task queue. This prevents two supported tabs from overwriting each
other's history or experiment updates while the extension is running.
Content runtimes subscribe to `chrome.storage.onChanged`, so history and experiment
updates are reflected in other open supported tabs without waiting for another page action.

### Runtime Coordination Layer

Files:

* `extension-runtime.ts`

Responsibilities:

* own the platform observer lifecycle
* debounce visible-feed extraction
* publish stable feed, history, and experiment snapshots
* timestamp completed extractions for freshness assessment
* queue same-tab history updates
* route persistence commands through the background service worker

The runtime has an idempotent `start()` method and an explicit `stop()` cleanup path.
React subscribes through `useSyncExternalStore`; internal state propagation does not
depend on page-level custom events.

### Public Retrieval Layer

Files:

* `evidence-retrieval.ts`
* `browser-evidence-retriever.ts`
* `background.ts`

Responsibilities:

* accept only bounded, validated evidence-search messages
* fetch keyless Crossref, MediaWiki, and GDELT endpoints from the MV3 service worker
* validate untrusted provider JSON before normalization
* enforce per-provider result caps, timeouts, safe HTTP(S) links, and URL deduplication
* preserve useful partial results when one provider is empty or unavailable

Retrieval is user-triggered and non-persistent. Only the deterministic query for one
selected visible recommendation leaves the page; feed history and the full visible feed
remain local. Provider categories describe where a link was discovered, not whether it
supports or disproves a claim.

### Optional Backend Boundary

Files:

* `backend/shepherd_lens_api/models.py`
* `backend/shepherd_lens_api/analysis.py`
* `backend/shepherd_lens_api/app.py`
* `backend/shepherd_lens_api/config.py`
* `backend/shepherd_lens_api/adapters.py`

Responsibilities:

* accept bounded, versioned feed, measurement, history, and evidence inputs
* reject unknown fields, inconsistent levels, unsafe URLs, and naive timestamps
* return deterministic interpretations whose basis points to supplied measurement IDs
* preserve explicit weak-signal, page-snapshot, and session-trend boundaries
* expose protocol boundaries for future retrieval and interpretation adapters
* remain optional and independent of extension runtime behavior

The API route is a thin adapter over the pure analysis engine. It does not extract DOM
data, persist requests, call remote providers, or run a model. CORS is disabled by
default and accepts only explicitly configured origins without credentials. The current
extension does not call this service.

### Presentation Layer

Files:

* `content.tsx`
* `localization.ts`
* `sidebar-presenter.ts`
* `sidebar-preferences.ts`
* `sidebar.css`
* `sidebar/`

Responsibilities:

* inject the sidebar host
* render progressive disclosure UI
* localize user-facing copy
* persist independent language and sidebar-position preferences
* degrade gracefully when browser APIs fail

Presentation code must not introduce new measurement formulas.
Pure summary formatting and localized display derivation live in
`sidebar-presenter.ts`. Browser preference hooks and draggable-position bounds
live in `sidebar-preferences.ts`. Overview, Evidence, Experiment, navigation, and
shared display primitives live under `sidebar/`, keeping `content.tsx` focused on
the injected shell and runtime subscription.

The observation-quality disclosure reuses the low-priority status layer. It presents
categorical boundaries rather than a synthetic confidence score:

```text
weak signal
-> page snapshot
-> session trend
```

These boundaries are derived from visible sample size, page context, recent extraction
time, local history depth and recency, and active-session snapshots. They describe the
strength of the local observation, not the platform's internal recommendation model.

## Extension Security

The extension uses declarative content scripts, and `storage` is its only named Chrome
permission. The content script runs only on declared YouTube match patterns. The
background service worker serializes validated internal persistence requests and handles
extension lifecycle diagnostics.

Public evidence retrieval adds narrowly scoped HTTPS host permissions for Crossref,
GDELT, and English and Chinese Wikipedia. The content script does not fetch those hosts
directly. No wildcard host permission, remote code, API key, or user credential is used.

No remote code is loaded by the extension.

## Quality Gates

Every change should pass:

```text
ESLint
-> TypeScript
-> Vitest
-> extension production build
-> Next.js production build

Python backend changes also require:

Ruff
-> pytest
```

GitHub Actions runs independent Node and Python verification jobs on pushes to `main`
and on pull requests.

Release candidates should also pass:

```text
npm run test:extension:e2e
```

This headed Playwright Chromium smoke test covers extension loading, injection, visible-feed
observation, YouTube SPA routes, duplicate-host prevention, multiple tabs, and live
storage propagation. External YouTube availability remains an environmental dependency,
so this suite is intentionally separate from deterministic CI.
