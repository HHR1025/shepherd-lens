# Platform Adapter Architecture

## Status

Planned

High Priority

Infrastructure Milestone

---

## Purpose

Current Shepherd Lens is implemented exclusively for YouTube.

This is intentional.

The project should first achieve stability on a single platform before expanding to additional platforms.

However, future expansion should not require major rewrites.

The architecture should therefore become platform-extensible as early as possible.

---

## Strategic Principle

Do not support multiple platforms yet.

Instead:

```text
Build the architecture that will eventually support multiple platforms.
```

Current goal:

```text
YouTube Stability
```

Future goal:

```text
Cross-Platform Information Environment Observatory
```

---

## Why This Matters

A hard-coded YouTube implementation creates long-term limitations.

Without abstraction:

* every new platform requires duplicated logic
* metrics become platform-dependent
* maintenance complexity increases

A platform adapter architecture allows:

* shared metrics
* shared history
* shared evidence systems
* platform-specific extraction

---

## Future Platform Roadmap

### Phase 1: YouTube

Current platform.

### Phase 2: Reddit

Reasons:

* text-heavy
* easier topic analysis
* easier evidence analysis
* simpler extraction

### Phase 3: X / Twitter

Reasons:

* information diffusion
* real-time narratives
* evidence tracking
* public discourse analysis

### Phase 4: TikTok

Reasons:

* attention dynamics
* short-form pressure
* recommendation behavior

Requires:

* transcript extraction
* OCR
* speech-to-text

### Phase 5: Instagram

Requires:

* image analysis
* OCR
* visual content extraction

### Phase 6: Regional Platforms

Examples:

* Bilibili
* Xiaohongshu
* other regional platforms

---

## Architectural Goal

All future platforms should implement the same interface.

Example:

```typescript
interface PlatformAdapter {
  platform: string;

  detectPage(): boolean;

  extractVisibleItems(): FeedItem[];

  observeFeedChanges(callback: () => void): void;

  getPlatformMetadata(): PlatformMetadata;
}
```

The rest of Shepherd Lens should not care whether content comes from:

* YouTube
* Reddit
* X
* TikTok

Metrics should operate on normalized data.

---

## Normalized Feed Model

Every platform should be converted into a shared structure.

Example:

```typescript
interface FeedItem {
  id: string;

  platform: string;

  title: string;

  author: string;

  url: string;

  timestamp?: string;

  metadata?: Record<string, unknown>;
}
```

This enables:

* common metrics
* common history
* common drift analysis

---

## Platform Layer

Responsible for:

* DOM extraction
* page detection
* navigation events
* infinite scrolling
* platform-specific parsing

Examples:

```text
youtubeAdapter.ts
redditAdapter.ts
xAdapter.ts
tiktokAdapter.ts
```

---

## Core Layer

Should remain platform-independent.

Responsible for:

* attention metrics
* feed structure metrics
* drift analysis
* history snapshots
* evidence layer
* future claim verification

The Core Layer should never directly reference YouTube selectors.

---

## Evidence Layer Compatibility

Future Evidence Layer should work across platforms.

Examples:

```text
YouTube:
Video title / description / transcript
-> Evidence Retrieval

Reddit:
Post / comments
-> Evidence Retrieval

X:
Tweet / thread
-> Evidence Retrieval
```

The verification pipeline should remain platform-independent.

---

## Claim Verification Compatibility

Future Claim Verification Agent should consume normalized content.

Input:

```text
FeedItem
-> Claim Extraction
-> Claim Classification
-> Evidence Retrieval
-> Evidence Report
```

The verification system should not care where the content originated.

---

## Future Architecture

```text
Platform Layer
-> Extraction Layer
-> Normalization Layer
-> Measurement Layer
-> History Layer
-> Evidence Layer
-> Claim Verification Layer
-> UI Layer
```

---

## Current Scope

This document does not introduce:

* Reddit support
* X support
* TikTok support
* OCR
* AI analysis
* Evidence Layer
* Claim Verification

Current objective:

```text
Refactor the codebase so future platform support becomes straightforward.
```

---

## Success Criteria

The architecture is considered successful when:

* YouTube functionality remains unchanged
* platform-specific logic is isolated
* core metrics become platform-independent
* future adapters can be added without rewriting metrics
* future Evidence Layer can operate across platforms
* future Claim Verification can operate across platforms

---

## Long-Term Vision

Shepherd Lens should evolve from:

```text
YouTube Recommendation Analyzer
```

into:

```text
Cross-Platform Information Environment Observatory
```

The platform should eventually help users understand:

* recommendation environments
* attention environments
* evidence environments

across multiple digital ecosystems.
