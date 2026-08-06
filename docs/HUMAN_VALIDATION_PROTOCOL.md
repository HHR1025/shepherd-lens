# Human Measurement Validation Protocol

## Status

Protocol contract and reliability toolkit implemented.

No independent human validation study has been completed.

## Purpose

This protocol defines how Shepherd Lens can compare its local heuristic scores
with independent human judgments without exposing those scores to annotators.
It is designed to make a future pilot reproducible and auditable. It does not
turn synthetic calibration fixtures into ground truth and does not establish
construct validity by itself.

## Study Unit

One unit is one bounded snapshot of visible recommendations from a supported
page. A unit records:

* an opaque case identifier;
* page type: home, watch, search, or Shorts;
* language: English, Chinese, or mixed;
* a broad topic stratum;
* an observation timestamp;
* normalized visible `FeedItem` values;
* local measurement values kept outside the annotator packet.

The validation contract is versioned in
`extension/src/measurement-validation-study.ts`. Untrusted study JSON is
validated before packet generation or analysis.

## Constructs And Anchors

Every current attention and feed-structure measurement has:

* an English and Chinese name;
* an English and Chinese operational definition;
* five construct-specific anchors from 0 to 4.

The definitions live in
`extension/src/measurement-validation-definitions.ts` so the annotation packet
and analysis code share one source of truth. An anchor is a human judgment about
the visible feed, not a translation of the local 0-100 score.

## Sampling Plan

A real study must define its sample before inspecting agreement results.
Sampling should be stratified across:

* home, watch, search, and Shorts pages;
* English, Chinese, and mixed-language feeds;
* informational, entertainment, political, commercial, and other declared
  topic groups;
* different dates and times rather than one browsing session;
* calm, mixed, and visibly intense recommendation environments.

The final sample size should follow a documented precision or power target. A
convenient round number must not be presented as statistically justified.
Repeated snapshots from one account or session must be identified as clustered
observations rather than treated as fully independent samples.

## Consent And Privacy

Real feed collection requires explicit informed consent from the person whose
recommendations are visible. Before collection, the study must document:

* what page content will be recorded;
* how long data will be retained;
* who can access raw snapshots;
* how withdrawal requests are handled;
* whether titles or channels may reveal sensitive interests;
* how screenshots, account names, avatars, and other direct identifiers are
  removed or avoided.

Raters use opaque identifiers such as `rater-a12`. Direct identifiers, email
addresses, names, and recruitment records do not belong in the study JSON.
Consent records must be stored separately from annotation data.

## Annotator Preparation

The study report must disclose recruitment, relevant language proficiency,
training, compensation, exclusions, and adjudication rules. Annotators should:

1. read the bilingual construct definitions;
2. practice on examples excluded from the study sample;
3. discuss ambiguous instructions before independent coding begins;
4. complete the study units independently;
5. use a missing rating instead of guessing when visible evidence is
   insufficient.

At least two independent raters are required by the contract. More raters may
be used, and missing values are supported.

## Blinding

`createBlindedAnnotationPacket` emits only case context, visible feed items,
operational definitions, and anchors. It excludes:

* all local heuristic scores;
* all existing annotations;
* rater identifiers;
* aggregate results and reliability estimates.

Packet ordering is deterministic for reproducibility. If a study needs
counterbalanced order, that assignment should occur in a separate documented
layer without changing case contents.

## Reliability Analysis

`analyzeValidationStudy` reports each measurement separately. It uses
Krippendorff's alpha with squared rank distance for the 0-4 ordinal scale. Alpha
is suitable here because the design may contain more than two raters and
missing ratings.

The report also includes:

* rated and comparable case counts;
* declared and observed rater counts;
* expected, observed, and missing annotations;
* missing rate;
* mean human rating;
* mean local score;
* descriptive mean absolute error and signed bias after normalizing human
  ratings to 0-100.

The toolkit returns `insufficient_data` when alpha cannot be estimated. It does
not apply a universal acceptable/unacceptable threshold. Reliability depends on
the construct, sample, prevalence, uncertainty, and intended claim. A formal
study should add confidence intervals and inspect disagreement patterns rather
than reporting alpha alone.

## Adjudication

Reliability must be calculated on the original independent ratings before any
discussion or adjudication. If disagreements are later reviewed:

* preserve the original ratings;
* store adjudicated labels separately;
* record the adjudication rule and participants;
* report both pre-adjudication reliability and post-adjudication outcomes;
* revise ambiguous instructions before collecting a new held-out sample.

Do not tune a measurement threshold on the same cases used for final reporting.

## Minimum Study Report

A public validation report should include:

* protocol and schema versions;
* sampling frame, dates, page types, languages, topics, and clustering;
* case, rater, and annotation counts;
* recruitment, language proficiency, training, compensation, and exclusions;
* per-measurement missingness and Krippendorff's alpha;
* uncertainty intervals and disagreement analysis;
* descriptive local-score error and bias;
* adjudication procedure;
* held-out evaluation design;
* privacy, cultural, temporal, language, and platform limitations.

## Quality Gate

Run the focused contract and reliability tests with:

```bash
npm run test:validation
```

The tests include perfect agreement, a hand-verifiable systematic-disagreement
case, missing data, insufficient data, deterministic output, leakage prevention,
all current measurement definitions, and malformed input rejection.

## Current Limitations

The repository does not currently contain:

* real user feed snapshots;
* recruited annotators or completed independent ratings;
* confidence intervals or power calculations;
* an annotation collection UI;
* an adjudicated or held-out dataset;
* evidence that the local measurements are scientifically valid.

## Method References

* Hayes, A. F., and Krippendorff, K. (2007). [Answering the Call for a
  Standard Reliability Measure for Coding Data](https://doi.org/10.1080/19312450709336664).
* Hughes, J. (2021). [krippendorffsalpha: An R Package for Measuring Agreement
  Using Krippendorff's Alpha Coefficient](https://journal.r-project.org/articles/RJ-2021-046/).
* James, J. (2026). [Counting on Consensus: Selecting the Right Inter-annotator
  Agreement Metric for NLP Annotation and Evaluation](https://arxiv.org/abs/2603.06865).
* Kunilovskaya et al. (2026). [Who Annotates in NLP? A Large-scale Assessment
  of Human Annotation Reporting between 2018 and 2025](https://arxiv.org/abs/2606.02255).
