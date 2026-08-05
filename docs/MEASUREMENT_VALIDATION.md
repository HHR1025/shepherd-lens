# Measurement Validation

## Status

Engineering calibration baseline implemented.

Scientific validation has not been completed.

## Purpose

The calibration baseline protects the current deterministic measurements from
unintentional semantic drift. It runs a versioned set of synthetic English,
Chinese, and mixed-language feeds through the same pure functions used by the
extension and checks explicit inclusive score ranges.

This answers an engineering question:

```text
Do known fixtures still produce the expected relative behavior?
```

It does not answer a scientific question:

```text
Do these scores accurately represent real users' recommendation environments?
```

## Current Corpus

The corpus is defined in
`extension/src/measurement-calibration-corpus.ts`. It contains only synthetic
fixtures and no user browsing data.

It covers all current attention and feed-structure measurements:

* stimulation
* conflict
* novelty
* repetition
* short-form pressure
* channel concentration
* topic concentration
* visible-feed entropy
* source diversity
* title-hook density

The cases include calm and hook-heavy English and Chinese feeds, conflict-heavy
feeds, diverse and repetitive feeds, short- and long-form feeds, and a negative
control for substring matching. Every expected range includes a written
rationale.

## Quality Gate

Run the focused calibration suite with:

```bash
npm run test:calibration
```

The validator rejects malformed corpora, unknown measurement identifiers,
out-of-bounds or reversed ranges, empty rationales, invalid feed items, and
duplicate case identifiers. The report records actual values, expected ranges,
per-expectation outcomes, and an aggregate pass rate.

The suite is also included in `npm test` and therefore in `npm run check` and
continuous integration.

## Change Policy

Do not widen a range merely to make a failing test pass.

When a measurement formula or lexical rule intentionally changes:

1. inspect the failed case and actual score;
2. determine whether the fixture, rationale, or implementation is wrong;
3. add a regression case for any concrete false positive or false negative;
4. update the corpus version when its interpretation contract changes;
5. document the reason for changed expectations.

The calibration modules must not become a second implementation of the
measurement formulas. They call the production domain functions directly.

## Scientific Validation Still Required

A publishable or externally defensible measurement claim needs a separate,
independently labeled validation study. At minimum, that work should include:

* a documented sampling strategy across page types, languages, and topics;
* blinded labels from multiple human raters;
* operational definitions for each construct;
* inter-rater agreement and disagreement analysis;
* false-positive, false-negative, calibration, and sensitivity reporting;
* held-out examples that are not used to tune thresholds;
* explicit limits on demographic, cultural, temporal, and platform validity.

Until that study exists, the UI and documentation must continue to describe
the measurements as local heuristic signals rather than facts, diagnoses, or
platform-internal properties.
