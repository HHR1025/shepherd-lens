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
* `user-experiment.ts`
* `runtime-persistence.ts`
* `browser-runtime-persistence.ts`
* `background.ts`
* `runtime-schema.ts`

Responsibilities:

* read and validate untrusted browser-local data
* migrate supported legacy local records
* cap retained history and experiments
* expose storage-independent interfaces for tests
* serialize history and experiment transactions across extension tabs

Stored data must be validated at runtime because TypeScript types do not protect persisted JSON.
History and experiment records carry explicit schema versions. Unknown future versions
fall back safely instead of being interpreted as the current schema.

Read-modify-write operations are sent to the Manifest V3 service worker and executed
through one serial task queue. This prevents two supported tabs from overwriting each
other's history or experiment updates while the extension is running.

### Runtime Coordination Layer

Files:

* `extension-runtime.ts`

Responsibilities:

* own the platform observer lifecycle
* debounce visible-feed extraction
* publish stable feed, history, and experiment snapshots
* queue same-tab history updates
* route persistence commands through the background service worker

The runtime has an idempotent `start()` method and an explicit `stop()` cleanup path.
React subscribes through `useSyncExternalStore`; internal state propagation does not
depend on page-level custom events.

### Presentation Layer

Files:

* `content.tsx`
* `localization.ts`
* `sidebar-presenter.ts`
* `sidebar-preferences.ts`
* `sidebar.css`

Responsibilities:

* inject the sidebar host
* render progressive disclosure UI
* localize user-facing copy
* persist independent language and sidebar-position preferences
* degrade gracefully when browser APIs fail

Presentation code must not introduce new measurement formulas.
Pure summary formatting and localized display derivation live in
`sidebar-presenter.ts`. Browser preference hooks and draggable-position bounds
live in `sidebar-preferences.ts`, keeping `content.tsx` focused on component
composition and extension injection.

## Extension Security

The extension uses declarative content scripts and requests only the `storage` permission. The content script runs only on declared YouTube match patterns. The background service worker serializes validated internal persistence requests and handles extension lifecycle diagnostics.

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

`content.tsx` remains the largest presentation module because it contains the sidebar
component tree. Runtime orchestration, summary formatting, and browser preferences have
been removed from it. Future UI splits can therefore proceed one disclosure feature at
a time without moving persistence, observation, or localization logic simultaneously.

The project still lacks a browser-driven Chrome extension end-to-end suite. Unit tests,
type checking, linting, and production builds protect deterministic modules, but manual
verification on supported YouTube page types remains part of release validation.
