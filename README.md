# Shepherd Lens

Shepherd Lens is a local-first Chrome extension research prototype for observing visible recommendation environments.

It extracts recommendations currently visible in YouTube's DOM, calculates transparent heuristic signals, stores bounded local history, and exposes drift and session-level comparisons through a progressively disclosed sidebar.

## Current Capabilities

- Manifest V3 extension with an automatically injected React sidebar
- YouTube home, watch, search, Shorts, and visible recommendation extraction
- Dynamic DOM and single-page navigation observation
- Local attention and feed-structure heuristics
- Bounded browser-local history, drift comparison, and session timeline signals
- Small user-marked before/after experiments
- Transparent observation-quality boundaries for weak signals, page snapshots, and session trends
- User-triggered public-source discovery through Crossref, Wikipedia, and GDELT
- Categorized research, reference, and reporting links with visible citation cues
- Optional FastAPI contract for deterministic, traceable interpretation of supplied measurements
- Versioned bilingual engineering calibration fixtures for every current local measurement
- Blinded human-annotation study contract with deterministic multi-rater reliability reporting
- English and Chinese interface copy
- Platform adapter boundary for future extractors

## Important Limits

Shepherd Lens observes only visible page content. It does not access YouTube's internal ranking model, reconstruct the complete recommendation system, diagnose users, or determine whether a claim is true.

Current metrics are experimental local heuristics. They should be interpreted as weak signals, not scientific or causal conclusions.
The synthetic calibration corpus is an engineering regression baseline, not a
ground-truth dataset or evidence of scientific validity.
The human-validation protocol and analysis toolkit are ready, but no independent
human study or real-feed validation dataset has been completed.
The sidebar exposes sample width, page context, history depth and recency, and extraction
freshness so users can see why an observation is limited.

Evidence discovery is also bounded. It searches public indexes for one recommendation
selected by the user. A discovered link is not proof, and no result does not mean that
no evidence exists.

The optional backend accepts explicitly supplied measurements and returns deterministic
interpretations. It is not connected to the extension, does not persist requests, and is
not required for any current extension capability.

## Repository Structure

```text
app/                    optional Next.js web shell
backend/                optional FastAPI contract, deterministic engine, and Python tests
docs/                   product, research, UI, and architecture notes
extension/public/       Manifest V3 static files
extension/src/          runtime store, service worker, adapters, analysis, UI, and tests
extension-dist/         generated unpacked extension
```

The main runtime flow is:

```text
platform adapter
-> normalized FeedItem[]
-> local measurements
-> bounded history
-> drift/session analysis
-> injected React UI

selected FeedItem
-> transparent evidence query
-> MV3 background retrieval
-> categorized public-source links

optional normalized measurements
-> versioned FastAPI contract
-> deterministic traceable interpretation
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for module boundaries.

## Local Development

Requirements:

- Node.js 22
- npm
- Chromium-based browser
- Python 3.11+ for the optional backend

Install dependencies and run all quality gates:

```bash
npm ci
npm run check
```

Build the unpacked extension:

```bash
npm run build:extension
```

Then open `chrome://extensions`, enable Developer mode, choose **Load unpacked**, and select `extension-dist`.

After rebuilding, reload the extension and refresh the YouTube tab.

## Commands

```bash
npm run dev              # optional Next.js web shell
npm run build            # production web build
npm run build:extension  # rebuild extension-dist
npm run lint             # ESLint
npm run typecheck        # full TypeScript check
npm test                 # Vitest suite
npm run test:calibration # focused bilingual measurement calibration baseline
npm run test:validation  # human-study contract, blinding, and reliability tests
npm run test:extension:e2e # headed Playwright Chromium extension smoke test
npm run check            # lint, typecheck, tests, extension build
```

Run the optional backend quality gates:

```bash
cd backend
python -m pip install -e ".[dev]"
python -m ruff check .
python -m pytest
```

Install the browser runtime once with `npx playwright install chromium`. The extension
E2E smoke test then opens Playwright's isolated Chromium against YouTube. It
checks sidebar injection, visible-feed extraction, watch/Shorts SPA navigation, duplicate
host prevention, public-source retrieval messaging, multi-tab injection, and live
browser-storage synchronization. Run it before a release; it remains separate from the
fast deterministic CI gate.

## Privacy

Recommendation snapshots and user experiments remain in `chrome.storage.local`. Their
versioned records are validated on read, and read-modify-write operations are serialized
by the extension service worker across supported tabs. Evidence search is optional and
user-triggered: only the selected item's derived query is sent to the declared public
indexes. No complete feed, local history, backend, paid model, or API key is required.
The optional backend does not receive data unless a future client explicitly calls it;
the current extension has no backend transport.

## Project Direction

- [Project master plan](docs/PROJECT_MASTER_PLAN.md)
- [Research notes](docs/RESEARCH_NOTES.md)
- [UI philosophy](docs/UI_PHILOSOPHY.md)
- [Evidence layer](docs/EVIDENCE_LAYER.md)
- [Platform adapter architecture](docs/PLATFORM_ADAPTER_ARCHITECTURE.md)
- [Measurement validation](docs/MEASUREMENT_VALIDATION.md)
- [Human validation protocol](docs/HUMAN_VALIDATION_PROTOCOL.md)
