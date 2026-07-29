# AI Processing Test Specification

## Test Scope

Verify the versioned AI request and Question JSON contracts, both processing modes, canonical eligibility/boundaries, provider adapters, structural/domain/grounding/fidelity validation, bounded retry/repair, uncertain outcomes, cancellation/recovery, cost control, atomic persistence/handoff, security/privacy, local parity, compatibility, and measurable operations.

DOCX parsing/canonicalization, Draft editing/lifecycle, Master approval, Question Bank/vector/RAG, mixing, and publishing are excluded except for negative boundary and handoff contract tests.

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| AC-001 | Authorized compatible successful canonical input starts; every ineligible/mismatched input invokes no provider | Contract / Workflow / Security | Pending |
| AC-002 | No DOCX/XML/OMML/private fragment dependency or canonical mutation; only authorized assets and Presentation MathML are consumed | Boundary / Security | Pending |
| AC-003 | Complete request/context/prompt/provider/schema/correlation/cost provenance validates and persists | Contract / Integration | Pending |
| AC-004 | Extraction golden fixtures preserve meaning/order/answers/structures/provenance, add nothing, and classify ambiguity | Fidelity / Golden | Pending |
| AC-005 | Generation default/range/exact count and canonical-only grounding/claim validation work | Unit / Grounding / Workflow | Pending |
| AC-006 | Only valid fixed A–D single-answer questions with consistent content/references pass | Schema / Domain | Pending |
| AC-007 | Every required domain, duplicate, reference, provenance, identity, and order failure is detected/classified | Unit / Property / Contract | Pending |
| AC-008 | Refusal/truncation/malformed/schema/incomplete/unsupported responses never hand off | Provider Contract / Workflow | Pending |
| AC-009 | Eligible structural repair stops at two, revalidates fully, and accounts lineage/usage/cost | Workflow / Integration | Pending |
| AC-010 | Domain-invalid processing stops and regeneration creates distinct immutable candidate identities | Workflow / Integration | Pending |
| AC-011 | Transient provider retry stops at three total with backoff; permanent cases do not retry | Workflow / Fault Injection | Pending |
| AC-012 | Duplicate delivery at every stage produces one logical side effect and no preventable rebilling | Idempotency / Integration | Pending |
| AC-013 | Uncertain provider outcome reconciles or blocks redispatch under reservation/audit policy | Workflow / Provider Contract | Pending |
| AC-014 | USD 1 cap, 80% warning, retry/repair/reservation accounting, Admin increase, and Draft non-blocking behavior work | Unit / Integration / Security | Pending |
| AC-015 | Token/unit/latency/pricing/reservation/final/USD reporting aggregates correctly and missing usage is explicit | Unit / Integration | Pending |
| AC-016 | Durable Temporal stages and counters recover from restart with at-least-once safety | Workflow / Recovery | Pending |
| AC-017 | Cancellation and terminal race are idempotent, preserve usage, and never leak a handoff | Workflow / Concurrency | Pending |
| AC-018 | Atomic result/outbox handoff exposes one complete validated result or none | Transaction / Integration | Pending |
| AC-019 | Complete Question JSON and candidate ID/order mapping contract is consumable by Exam Creation | Schema / Consumer Contract | Pending |
| AC-020 | All taxonomy families and machine-readable fields are stable and complete | Contract / Compatibility | Pending |
| AC-021 | Canonical warnings/provenance are preserved and unsupported content severity is respected | Contract / Boundary | Pending |
| AC-022 | Tenant, authorization, grants, encryption, secrets, and audit controls protect all boundaries | Security / Integration | Pending |
| AC-023 | Logs/metrics/traces/audits redact all prohibited data and prevent cross-tenant leakage | Security / Observability | Pending |
| AC-024 | Raw-response/failed-payload deletion, stricter deletion, and legal hold work | Retention / Integration | Pending |
| AC-025 | Deterministic local provider parity and separately controlled production contract tests work | Provider Contract / Local Parity | Pending |
| AC-026 | Migration, dual-read, rejection, rollout, and rollback preserve immutable meaning | Migration / Compatibility | Pending |
| AC-027 | AI_PROCESSING_PROFILE_V1 reports five-minute P95, availability, stage/provider/retry/token/cost metrics | Performance / Reliability | Pending |
| AC-028 | Failure injection at every durable stage proves recovery, accounting, atomicity, and redaction | Fault Injection / Workflow | Pending |

## Question JSON Schema Contract Tests

- Validate minimal and maximal valid request/result fixtures for both modes.
- Require every Section 8.1 and 8.2 field and reject prohibited/unknown major-version fields.
- Verify exactly four ordered labels A–D, exactly one valid correct label, stable candidate IDs, contiguous ordinals, valid references, hashes, timestamps, terminal `VALIDATED`, validation outcomes, warnings, and usage/cost metadata.
- Reject embedded binaries, temporary paths, signed URLs, DOCX/XML/OMML/private fragments, provider secrets, unsupported types, duplicate IDs/ordinals, and broken cross-references.
- Verify canonicalized result hash stability apart from explicitly excluded runtime fields.
- Verify Exam Creation can map candidate IDs to independent Draft identities without AI Processing assigning Draft/Master IDs.

## Mode-Specific Unit Tests

- Extraction accepts no generation count/question-type selector and generation accepts exactly one integer count, default 15, inclusive 5–50.
- Reject 4, 51, zero, negative, fractional, string, multiple-count, and unsupported mode parameters before provider invocation.
- Verify deterministic context selection/order, mode constraints, template identity, and request hashes.
- Verify extraction non-invention and generation canonical-only evidence rules.

## Extraction-Fidelity Tests

- Golden canonical fixtures with ordered questions, adjacent answers, tables/cell relationships, normalized Presentation MathML formulas, images/media/assets, captions, and source warnings.
- Confirm question order, meaning, option/correct-answer relationships, structured references, and provenance remain equivalent.
- Detect invented questions/options/answers, dropped/reordered questions, answer drift, lost references, unsupported content, incomplete questions, and ambiguity.
- Verify ambiguous cases follow the approved warning-versus-blocking threshold and never silently infer missing answers.

## Generation-Grounding and Requested-Count Tests

- Deterministic fake-provider results at counts 5, 15, and 50 plus each wrong-count/empty/incomplete case.
- Every question/answer/explanation claim must be supported by declared canonical evidence.
- Reject fabricated facts, unverifiable distractor claims that violate the approved grounding rule, references to other documents/world knowledge, and broken evidence references.
- Verify repeated/near-duplicate questions and unsupported claims are domain-invalid.

## Domain-Validation Tests

- Required/missing/empty fields; malformed text; fixed type; A–D labels/order; four non-empty options; one correct label.
- Duplicate option labels/text/normalized meanings; zero/multiple valid answers; answer not present; question/answer contradiction.
- Explanation absent where optional, or present and consistent with the declared answer/evidence.
- Empty, exact duplicate, normalized duplicate, unsupported, and malformed questions.
- Valid/invalid table, formula, image, media, asset, structured-content, and source-block references.
- Cross-question duplicate IDs, ordinal gaps/collisions, list/order mismatch, and unstable reordering.
- Property/fuzz tests ensure malformed payloads never bypass schema or domain gates.

## Provider-Adapter Contract Tests

- Standard success, refusal, safety/policy rejection, truncation/finish reasons, malformed JSON, timeout, throttle, outage, unavailable model, invalid configuration/credential, usage absent/present, latency, and provider-native cost.
- Stable call ID/idempotency propagation, deadline, cancellation, response normalization, status lookup/reconciliation, and secret redaction.
- Contract-compatible provider failure simulation uses the same normalized types as production adapters.
- Separately gated production-provider tests verify schema-constrained output, cancellation where supported, usage metadata, retention/privacy settings, and refusal/error normalization; they are never required for deterministic unit runs.

## Retry, Repair, Cancellation, and Recovery Workflow Tests

- Transient provider failures attempt at most three calls total with approved backoff; every permanent class attempts once.
- Structurally eligible original response receives zero to two repairs; third repair is impossible.
- Each repair restarts parsing/schema/domain/grounding validation and preserves lineage/usage/cost.
- Domain-invalid output does not loop and returns regeneration recommendation.
- Worker/process interruption before, during, and after every stage resumes from the first incomplete eligible stage.
- Cancellation before/during each stage, cancellation/provider completion race, duplicate/concurrent cancellation, cancellation during backoff/repair/uncertainty, and restart during cancellation.
- Cancellation winning prevents handoff; terminal persistence winning returns already-completed without corrupting the result.

## Duplicate-Delivery and Uncertain-Provider-Outcome Tests

- Duplicate/concurrent request, workflow, activity, provider dispatch, response capture, repair, persistence, usage finalization, audit, outbox, and handoff acknowledgement delivery.
- Verify one logical attempt/call/result/question set/charge/event/handoff per idempotency scope.
- Lose acknowledgement before dispatch, during transmission, after provider acceptance, after response, and before durable response capture.
- Provider supporting idempotency/status lookup reconciles without a second billable call.
- Provider lacking reconciliation remains blocked until approved timeout/release; conservative reservation and audit prevent cap bypass.

## Cost-Cap and Usage-Accounting Tests

- Below, exactly at, and above 80% and USD 1 cap using committed plus reserved amounts.
- Original, retry, repair, cancelled in-flight, uncertain, provider-refused, missing-usage, and reconciled calls all account per approved rules.
- Unauthorized/Admin/dual-role cap increases, audit evidence, concurrency at cap, and stale cap context.
- Cap blocks only new AI calls; retrieval/handoff and Exam Creation editing/approval of existing valid results remain permitted.
- Pricing version/time, provider units, token categories, currency conversion, estimates/finals/adjustments, and aggregation reconciliation.

## Tenant-Isolation, Authorization, Privacy, and Log-Redaction Tests

- Teacher, Tenant Admin, workflow service, AI worker, support with valid/expired/missing grant, unauthorized user, and cross-tenant calls for every command/result/asset/provider-response action.
- Tenant IDs in all database/object queries; stable identifiers do not reveal cross-tenant existence.
- TLS/configuration checks, encryption at rest, provider-secret isolation/rotation, least-privilege storage and provider access.
- Injection fixtures place sensitive markers in canonical text, prompts, questions, all option/answer/explanation fields, assets, raw responses, errors, provider messages, identifiers, and signed URLs; assert none appear in ordinary logs/metrics/traces/audits.

## Canonical Document Compatibility and Boundary Tests

- Accept only `SUCCEEDED` and `SUCCEEDED_WITH_WARNINGS`; reject retryable/failed/cancelled/partial statuses.
- Supported/unsupported canonical schema versions, changed hashes, missing assets, broken references, blockers, warnings, and tenant authorization.
- Spy/static boundary tests prove no original DOCX/object, package, DOCX XML, OMML, temporary parser output, or private source fragment is opened.
- Formula input is normalized Presentation MathML; stable authorized asset access is used only when referenced.
- Canonical records remain byte/semantically unchanged after every success/failure/retry.

## Atomic Persistence and Handoff Tests

- Fail before/during/after result, question, provenance, validation, usage, hash, raw-deletion schedule, audit, and outbox writes.
- Consumers see no result until the entire validated aggregate commits.
- Duplicate publication/acknowledgement produces one Exam Creation handoff.
- Handoff retrieves the exact immutable schema/result hash and cannot retrieve failed, repaired-but-invalid, cancelled, or partial results.

## Migration and Backward-Compatibility Tests

- Additive compatible minor-version fixtures, rejected unsupported major versions, declared old/new dual readers, and provider-adapter/taxonomy compatibility.
- Upgrade and rollback at every durable stage with in-flight old-version attempts.
- Migration preserves exact question meaning, answers, identity, provenance, usage/cost, warnings, and hashes or records an explicit new representation/version.
- Incompatible worker fails closed without provider call or result reinterpretation.

## Local-Provider Parity Tests

- Full extraction and generation workflows run locally without production credentials.
- Deterministic provider reproduces success, refusal, truncation, malformed output, timeout, throttle, uncertain outcome, cancellation, usage, latency, pricing, and cost-cap cases.
- Normalized adapter outputs match production adapter contract fixtures.
- No local-only code branch changes request/result/workflow semantics.

## Performance, Reliability, and Cost-Reporting Tests

- Run the approved `AI_PROCESSING_PROFILE_V1` sample across extraction/generation counts, source complexity, tables/formulas/assets, warm/cold conditions, and qualifying concurrency.
- Measure durable request acceptance through atomically available validated result: queue and per-stage P50/P95/P99/max, provider latency, retries, repairs, question count, token categories, provider units, and USD-equivalent cost.
- Confirm five-minute P95 under the approved profile; separately report declared provider outages and stress tests.
- Calculate 99.5% availability with internal, canonical-input, provider, cancellation, and client-caused outcomes separately classified.
- Confirm performance/usage telemetry contains no sensitive content.

## Failure Injection for Every Durable Stage

Inject pre-commit, post-side-effect/pre-commit, post-commit/pre-acknowledgement, timeout, cancellation, and restart failures at:

- request validation
- canonical eligibility validation
- context construction
- prompt construction
- provider invocation/dispatch
- response capture
- JSON parsing
- JSON Schema validation
- domain/grounding validation
- each bounded repair
- final result persistence
- raw-response deletion scheduling/execution
- usage/cost reservation/finalization
- audit/outbox persistence
- Exam Creation handoff/publication/acknowledgement

Each case asserts correct taxonomy, bounded action, durable recovery point, idempotency, accounting, atomic visibility, redaction, and terminal outcome.

## Error Case Tests

- Every Section 12 case maps to a stable code/family, safe message, stage, severity, retryability, repairability, terminality, affected reference, and recommended action.
- Unknown errors fail closed as `AIP-PERM-*`, publish no result, preserve committed usage/provenance, and alert safely.
- Taxonomy compatibility tests prevent an existing code from silently changing meaning or retry behavior.

## Test Data

- Synthetic versioned Canonical Document fixtures for minimal/maximal extraction and generation, warnings/blockers, tables, Presentation MathML, images/media/assets, and provenance.
- Valid/invalid request, result, taxonomy, provider, workflow/activity, and handoff contract fixtures across supported versions.
- Deterministic provider scripts for every response/failure/uncertainty/cost/usage case.
- Extraction ambiguity and fidelity golden corpus; generation grounded/unsupported-claim corpus; duplicate/near-duplicate corpus.
- Two-tenant role/service/support-grant fixtures and sensitive-marker redaction corpus.
- Clock-controlled retry/backoff/cancellation/retention/cost/pricing fixtures.
- Migration/rollback and in-flight-version fixtures.
- Fault-injection controls for every durable stage and atomic boundary.

All fixtures are synthetic, non-sensitive, deterministic, and stable.

## Completion Criteria

- AC-001 through AC-028 each have at least one implemented, passing mapped test.
- Mandatory schema, mode, fidelity, grounding, domain, adapter, workflow, idempotency, cost, security, privacy, canonical-boundary, atomicity, migration, local-parity, performance, reliability, and failure-injection suites pass.
- Business-critical validation, idempotency, authorization, cost, cancellation, and handoff branches have no untested path and reach at least 90% unit coverage where practical.
- The deterministic main suite makes no live production-provider call.
- No invalid, partial, failed, or cancelled result reaches Exam Creation.
- No duplicate delivery or uncertain outcome causes a preventable duplicate result or billable call.
- No prohibited sensitive content appears in ordinary telemetry.
- Required correctness, security, privacy, contract, migration, and cost tests are release-blocking.
