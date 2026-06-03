# Shepherd Lens - UI Philosophy

## Design Goal

Shepherd Lens is not a dashboard.

Shepherd Lens is not an analytics console.

Shepherd Lens should feel like:

```text
a cognitive lens
```

The interface should help users understand their information environment without overwhelming them.

---

## Core Principles

### Calm

Avoid alarmist visual language.

Avoid red-green warning systems.

Avoid excessive notifications.

The product should feel observant, not panicked.

### Minimal

Only surface the most important information by default.

Secondary information should remain hidden until requested.

### Progressive Disclosure

Users should not see every metric simultaneously.

Information should be revealed gradually:

```text
overview
-> section summary
-> expanded details
-> source evidence
```

### Interpretation Before Numbers

Users should first understand meaning.

Good:

```text
Feed diversity: low
```

Then, in an expanded view:

```text
Entropy: 23
```

Raw metrics belong in expanded views.

### Local First

Always show locally observed information.

Never imply access to platform internals.

---

## Navigation Philosophy

Avoid:

* long scrolling dashboards
* large metric walls
* complex settings panels
* permanent visibility of every metric
* separate panels for every new feature

Prefer:

* layered disclosure
* expandable sections
* compact summaries
* contextual exploration
* evidence links when needed

---

## Main Navigation Structure

Two primary views:

```text
Overview
Evidence
```

### Overview View

Purpose:

Understand the current recommendation environment.

Contains:

* Recommendation Environment
* Attention Environment
* Feed Structure
* Drift Summary

### Evidence View

Purpose:

Understand the current evidence environment.

Contains:

* Evidence Confidence
* Source Diversity
* Source Navigation

---

## Progressive Disclosure Model

### Default View

Only show:

* Attention Climate
* Feed Diversity
* Drift Summary
* Evidence Confidence

### Expanded Attention Climate

Reveals:

* Stimulation
* Conflict
* Novelty
* Repetition
* Short-form pressure

### Expanded Feed Structure

Reveals:

* Channel concentration
* Topic concentration
* Feed entropy
* Source diversity
* Hook density

### Expanded Drift Analysis

Reveals:

* trend changes
* repeated channels
* topic loops
* previous snapshot context

### Expanded Evidence Layer

Reveals:

* Evidence Confidence
* Primary Source Ratio
* Independent Confirmation
* Source Diversity
* View Sources

---

## Visual Style References

Inspired by:

* Arc Browser
* Linear
* Perplexity
* Notion

Characteristics:

* translucent
* lightweight
* readable
* modern
* information-dense without feeling crowded

---

## Future Constraint

New features must not automatically create new permanent UI sections.

Rule:

```text
New feature != new permanent panel
```

Instead:

```text
New feature = new expandable layer
```

This keeps the interface scalable.

---

## Long-Term Goal

The interface should feel like:

```text
a lens for understanding information environments
```

rather than:

```text
a monitoring dashboard
```

Users should progressively discover deeper layers of information rather than confronting every metric at once.
