# Shepherd Lens Architecture

## Scope

This document describes the implemented architecture. Future product ideas remain in `PROJECT_MASTER_PLAN.md`.

## Runtime Flow

```text
YouTube DOM
-> PlatformAdapter
-> FeedItem[]
-> attention and structure measurements
-> bounded local history
-> drift, session, and experiment comparisons
-> injected React sidebar
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

Responsibilities:

* calculate deterministic local signals
* compare snapshots and sessions
* remain independent of YouTube DOM selectors and React

Domain calculations should be pure wherever possible and covered by unit tests.

### Persistence Layer

Files:

* `history-tracking.ts`
* storage operations in `user-experiment.ts`
* `runtime-schema.ts`

Responsibilities:

* read and validate untrusted browser-local data
* cap retained history and experiments
* expose storage-independent interfaces for tests

Stored data must be validated at runtime because TypeScript types do not protect persisted JSON.

### Presentation Layer

Files:

* `content.tsx`
* `localization.ts`
* `sidebar.css`

Responsibilities:

* coordinate extension lifecycle
* render progressive disclosure UI
* localize user-facing copy
* degrade gracefully when browser APIs fail

Presentation code must not introduce new measurement formulas.

## Extension Security

The extension uses declarative content scripts and requests only the `storage` permission. The content script runs only on declared YouTube match patterns. The background service worker exists for extension lifecycle diagnostics and future message-based capabilities.

No remote code is loaded by the extension.

## Quality Gates

Every change should pass:

```text
ESLint
-> TypeScript
-> Vitest
-> extension production build
-> Next.js production build
```

GitHub Actions runs these checks on pushes to `main` and on pull requests.

## Known Refactoring Boundary

`content.tsx` still contains both runtime orchestration and multiple presentation components. It should be split by feature when the next UI change requires touching those areas. A standalone file-size refactor is not urgent enough to justify broad UI regression risk.
