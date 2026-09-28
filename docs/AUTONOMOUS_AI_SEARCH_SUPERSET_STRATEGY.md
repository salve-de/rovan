# Rovan Autonomous AI Search Superset Strategy

- Status: CURRENT / HARD
- Date: 2026-09-22
- Scope: AI-search observation, competitor intelligence, diagnosis, deliverables, remeasurement, automation boundary
- Applies to: Rovan / `feature/positioning-autopilot`

## 1. Core decision

Rovan will not become a managed-service agency that logs into customer websites, CMSs, ad accounts, CRMs, or third-party portals and edits them on the customer's behalf.

That boundary is intentional.

Everything else that a capable human ASO / LLMO / GEO / AI-search consultant can perform from lawful public information, customer-confirmed facts, and supported AI/search providers should be treated as an automation target for Rovan.

The product target is:

> Observe what AI buyers see, explain why a company is omitted or included, identify the highest-value evidence gap, generate implementation-ready deliverables, and continuously prove what changed — without routine human consulting work.

Rovan should beat human-service providers on breadth, repeatability, frequency, evidence traceability, and marginal operating effort. It must not claim certainty where the underlying AI systems are stochastic or opaque.

## 2. Hard execution boundary

### Rovan may automate

- public-site crawl and source extraction;
- company / product / market / buyer / use-case understanding;
- Buyer Prompt generation and panel versioning;
- OpenAI / Gemini / Perplexity and other supported AI-answer observations;
- shortlist / mention / citation extraction;
- competitor discovery from observed answers and public evidence;
- competitor-site crawling and persisted before/after diffs;
- citation-source and source-domain analysis;
- evidence-gap detection;
- missing-fact and missing-page detection;
- technical AI/search-readiness audit;
- robots / sitemap / canonical / indexability / structured-data checks;
- page-level content clarity and buyer-fact checks;
- priority scoring;
- recommended change specification;
- finished FAQ, comparison copy, article copy, title/meta copy and JSON-LD generation;
- page-placement guidance and internal-link recommendations;
- downloadable implementation packs;
- Rovan-hosted public-information pages, when explicitly opted in;
- remeasurement under comparable conditions;
- change tracking, alerts and recurring reports;
- opportunity prioritization and partner/seller workflow support;
- all ordinary platform-side administration that can safely be automated.

### Rovan must not do

- log into or directly modify the customer's website or CMS;
- push edits to WordPress, Shopify, Webflow or equivalent customer systems;
- modify a customer's DNS, hosting, ad account or CRM;
- alter third-party websites, directories or media;
- fabricate reviews, citations, evidence, AI observations, customer results or urgency;
- treat correlation after a change as proven causality;
- promise an AI recommendation, rank, lead, contract or revenue outcome.

The product may generate a complete implementation artifact, but the final write into an external customer-controlled system remains outside Rovan.

## 3. Human-service work to absorb

A traditional AI-search consulting engagement often performs a loop like:

```text
Choose target questions
→ manually query AI systems
→ inspect competitors
→ inspect cited sources
→ audit the client site
→ infer missing evidence
→ write FAQ/articles/schema
→ prepare a report
→ repeat next month
```

Rovan should convert that into:

```text
Discover
→ Measure
→ Explain
→ Prioritize
→ Generate
→ Package
→ Remeasure
→ Learn
→ Repeat
```

The owner/operator should not be required to manually perform the above loop for each customer.

## 4. Required product modules

### 4.1 Buyer Question Universe

Rovan should not depend on a tiny manually chosen keyword list.

Maintain a versioned question universe derived from:

- company and product facts;
- use cases;
- buyer roles;
- industry;
- geography where relevant;
- buying stage;
- comparison intent;
- alternatives;
- price / fit / trust / risk / implementation questions;
- observed AI-query fanout or related-question signals when lawfully available.

Questions must be separated into stable Core Prompts for comparable longitudinal measurement and exploratory prompts for discovery.

### 4.2 Multi-surface AI Observation

For every supported AI/search surface, preserve:

- exact prompt;
- provider / surface;
- model when available;
- locale / language / region when controlled;
- timestamp;
- repetition count;
- raw answer;
- extracted candidate companies;
- position/order where the answer meaningfully contains one;
- citations / source URLs;
- retrieval failures;
- parsing confidence;
- measurement completeness.

A failed provider call is missing data, not a negative recommendation.

### 4.3 Competitive Intelligence

Rovan should automatically answer:

- Which companies appear when the customer does not?
- On which Buyer Prompts?
- Which source pages support those appearances?
- Which public facts do competitors expose that the customer does not?
- Did the competitor site materially change?
- Did cited domains or source patterns change?
- Is the change a real web-content diff, only an AI-answer change, or both?

Never call an AI-answer fluctuation a competitor-site change without a persisted crawl diff.

### 4.4 Citation and Source Intelligence

Track not only whether the company is mentioned, but where AI systems appear to obtain support.

Required views include:

- source URLs by Buyer Prompt;
- domains repeatedly cited across providers;
- first-party vs third-party sources;
- source freshness;
- source topic;
- source-page overlap between the customer and competitors;
- missing source types;
- newly appearing / disappearing citations;
- citation concentration and dependence.

This is evidence for diagnosis, not proof of hidden ranking logic.

### 4.5 Evidence Gap Engine

For every meaningful losing prompt, Rovan should attempt to connect:

```text
Buyer question
→ observed winner / shortlist
→ public evidence used or available
→ customer's available evidence
→ missing / weak / ambiguous evidence
→ concrete remediation artifact
```

Evidence gaps may include:

- missing pricing information;
- missing service area;
- unclear target customer;
- missing feature facts;
- no comparison-ready statement;
- weak proof / case studies;
- unsupported claims;
- missing FAQ;
- stale facts;
- crawl/indexability barriers;
- ambiguous entity identity;
- poor page structure;
- absent structured data where it is useful and valid;
- lack of source-backed niche differentiation.

Do not invent a gap merely because a competitor appears.

### 4.6 Technical Readiness Audit

Automate checks that a human consultant would normally inspect:

- robots rules;
- sitemap presence and health;
- canonical signals;
- indexability;
- status codes and redirect behavior;
- page discoverability;
- headings and semantic clarity;
- structured data validity;
- organization / product / article / local-business data where appropriate;
- duplicate or conflicting entity facts;
- page speed / rendering signals when supported;
- JavaScript dependence where it prevents extraction;
- content freshness and obvious source conflicts.

Technical checks must be labelled as readiness signals, not guaranteed AI-ranking factors.

### 4.7 Implementation-Ready Change Pack

Rovan must not stop at "you should improve your FAQ."

A Change Pack should be precise enough that the customer can paste it, forward it to a developer, or convert it into a code change with minimal interpretation.

Where applicable it should contain:

- target URL;
- reason for priority;
- affected Buyer Prompts;
- evidence supporting the diagnosis;
- exact insertion / replacement location;
- finished heading;
- finished body copy;
- FAQ question and answer copy;
- comparison-table content;
- title / description suggestions;
- structured-data JSON-LD;
- internal-link source pages and anchor suggestions;
- fact fields still requiring customer confirmation;
- validation checklist;
- expected measurement surface to recheck after publishing.

The customer-site write is excluded; the implementation artifact is not.

### 4.8 Priority Engine

Human consultants are paid partly to decide what matters first. Rovan must automate that decision support.

Priority should consider:

- commercial intent of affected questions;
- number of losing prompts;
- repeat agreement across providers/runs;
- evidence strength;
- implementation effort;
- technical blocking severity;
- competitive pressure;
- freshness;
- historical response to similar changes;
- uncertainty.

The UI should surface a small number of highest-leverage actions rather than a giant undifferentiated checklist.

### 4.9 Continuous Remeasurement

After the customer publishes a change externally, Rovan should detect or accept evidence that the page changed, then remeasure comparable conditions.

Track:

- before/after content snapshot;
- published-at / detected-at time;
- comparable prompt set;
- provider/model conditions;
- candidate inclusion;
- citation changes;
- measurement completeness;
- time-series movement;
- uncertainty and external confounders.

Do not claim the change caused the movement unless the evidence supports that inference.

### 4.10 Autonomous Monitoring

Paid recurring value should come from continuing to watch the market, not from delivering a one-time PDF.

Rovan should detect and prioritize:

- new competitor entries;
- newly lost Buyer Prompts;
- newly won Buyer Prompts;
- citation-source shifts;
- public fact conflicts;
- stale or broken pages;
- crawl/indexability regressions;
- material competitor-site changes;
- provider/model behavior changes;
- new high-intent question opportunities.

Routine monitoring, diagnosis and artifact generation should require no owner/operator consulting work.

## 5. Output model

The core user-facing chain is:

```text
THREAT
What changed or where the company loses.

GAP
What observable evidence or readiness issue separates the company from the current answer set.

ACTION
The single highest-value implementation-ready change.

RESULT
What happened under comparable remeasurement.
```

Deep evidence remains inspectable, but the first screen should not become a consultant-style wall of text.

## 6. "No external write" must not become "report-only"

The external-write boundary must never be used as an excuse to make Rovan a passive audit tool.

Bad:

> Add more FAQ content.

Required:

> On `/pricing`, insert the following four FAQ items below the current pricing table. Here is the finished copy, valid JSON-LD, three internal-link sources, the eight Buyer Prompts this change targets, and the checks to run after publication.

The user should do as little interpretation as possible.

## 7. Automation standard

For a workflow to count as automated, Rovan must be able to perform the ordinary case without an employee:

- researching the account;
- selecting prompts;
- querying providers;
- discovering competitors;
- reading citations;
- comparing evidence;
- deciding priority;
- drafting deliverables;
- preparing recurring reports;
- scheduling remeasurement;
- classifying changes;
- generating routine alerts.

Human intervention is reserved for exceptions such as legal/data-rights disputes, provider outages, abuse, payment/fraud issues, uncertain source rights, or system failures.

## 8. Competitive target

The target is not merely feature parity with one consulting company.

Rovan should structurally outperform human-service ASO/LLMO offerings by being:

- more frequent than monthly manual checks;
- broader than a manually sampled question set;
- multi-provider by default;
- evidence-linked rather than opinion-only;
- reproducible through stored conditions and raw observations;
- able to inspect far more competitors and cited sources;
- able to generate implementation-ready deliverables immediately;
- able to remeasure continuously;
- scalable without adding proportional consultant headcount.

"Best" must be supported by concrete capabilities and measurement, not marketing wording.

## 9. Data moat and learning loop

Long-term advantage should come from accumulated, legally usable observation history and product learning.

Potential reusable intelligence includes:

- prompt clusters by market;
- recurring evidence-gap patterns;
- source-domain patterns;
- technical failure patterns;
- change-type vs subsequent observation distributions;
- provider-specific stability;
- industry-specific buyer-question libraries;
- market-level benchmark distributions.

Customer-private information must remain isolated according to product rules. Aggregated learning must not leak identifiable private customer data.

## 10. Acceptance criteria for future work

A feature is aligned with this strategy when it improves at least one of:

1. observation breadth or quality;
2. diagnosis accuracy and evidence traceability;
3. competitor/citation intelligence;
4. implementation readiness;
5. autonomous prioritization;
6. recurring monitoring value;
7. comparable remeasurement;
8. operator workload reduction.

A proposed feature should be rejected or redesigned if it requires Rovan staff to routinely:

- manually inspect each customer;
- manually write each customer's content;
- manually prepare each report;
- manually decide each week's action;
- manually edit customer websites;
- manually maintain ordinary customer operations.

## 11. Non-negotiable truth boundaries

Rovan must distinguish:

- observed fact;
- extracted fact;
- customer-confirmed fact;
- inferred hypothesis;
- generated recommendation;
- implementation artifact;
- external publication;
- before/after observation;
- causal conclusion.

These states must never be collapsed into a single "AI says this works" claim.

## 12. Strategic summary

Rovan is not an agency and not a passive rank tracker.

It is an autonomous AI buyer-consideration intelligence and improvement system:

> continuously observe the decision surface, find where the company loses, explain the observable reason, produce the exact implementation artifact, and verify what changed — while leaving the final write to the customer's external systems outside Rovan.

This is the approved product direction unless superseded by a later explicit owner decision.
