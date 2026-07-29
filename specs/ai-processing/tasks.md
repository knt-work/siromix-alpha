# AI Processing Tasks

## Task Summary

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| AIP-001 | Resolve owner and Vega decisions | Orion / Vega / Owner | P0 | Pending |
| AIP-002 | Define versioned request, Question JSON, and taxonomy contracts | Backend / AI Worker | P0 | Pending |
| AIP-003 | Implement durable Temporal-compatible processing workflow | Backend / AI Worker | P0 | Pending |
| AIP-004 | Implement provider-neutral adapter and deterministic local provider | AI Worker | P0 | Pending |
| AIP-005 | Implement structural, domain, grounding, and fidelity validation | AI Worker / Backend | P0 | Pending |
| AIP-006 | Implement retry, repair, uncertainty, cancellation, and cost controls | Backend / AI Worker | P0 | Pending |
| AIP-007 | Implement atomic result persistence and Exam Creation handoff | Backend | P0 | Pending |
| AIP-008 | Implement security, privacy, observability, retention, and operations | Backend / DevOps | P0 | Pending |
| AIP-009 | Implement mandatory automated test suites | Engineering | P0 | Pending |
| AIP-010 | Document deployment, migration, compatibility, and rollback | Engineering / DevOps | P1 | Pending |

## Implementation Tasks

- **IMP-001:** Resolve OQ-001 through OQ-003 and VEGA-001 through VEGA-005; reconcile approved decisions into the spec before implementation.
- **IMP-002:** Define semantic versions and machine-readable schemas for requests, validated results, questions/options/references/provenance, validation outcomes, usage/cost, handoff, and error taxonomy.
- **IMP-003:** Define stable processing-result, processing-attempt, provider-call, response, candidate-question, ordinal, issue, correlation, idempotency, and regeneration-predecessor identities.
- **IMP-004:** Implement deterministic canonical eligibility, mode-specific context construction, prompt-envelope construction, hashes, and provenance without DOCX/private-fragment dependencies.
- **IMP-005:** Implement JSON parsing, JSON Schema validation, domain/reference validation, extraction fidelity, generation grounding/count validation, and duplicate/identity/order detection.
- **IMP-006:** Implement bounded structural repair and keep it distinct from regeneration.

## Database Tasks

- **DB-001:** Create tenant-aware persistence for AIProcessingAttempt, ProviderCall, AIProcessingResult, CandidateQuestion, ProcessingIssue, ProcessingStageEvent, UsageCostRecord, and audit/handoff outbox records.
- **DB-002:** Add uniqueness constraints for attempt, idempotency, provider-call dispatch, response, result, candidate ID/ordinal, usage charge, audit side effect, and handoff publication.
- **DB-003:** Implement atomic terminal result/question/provenance/validation/usage persistence and outbox publication; prevent partial visibility.
- **DB-004:** Model encrypted temporary raw-response references, deletion state, retention/legal hold, uncertain outcome, cancellation, retry/repair counters, cost reservations, and immutable predecessor/version links.
- **DB-005:** Define forward/rollback migrations, dual-read support where approved, immutable prior-result preservation, and explicit incompatible-version rejection.

## API Tasks

- **API-001:** Define authorized internal REST/command contracts for submit, status, result retrieval, retry, regenerate linkage, cancel, cost-cap context/change notification, and handoff acknowledgement.
- **API-002:** Enforce server-side tenant/workflow/role/service/support-grant, schema-version, lifecycle, idempotency, deadline, canonical eligibility, and cost-cap rules.
- **API-003:** Return stable safe status, taxonomy issues, retry/repair state, preserved work, usage/cost, compatibility, and recommended actions without content leakage.
- **API-004:** Publish versioned fixtures and consumer compatibility tests for Exam Creation.

## Frontend Tasks

- **FE-001:** No standalone UI. Supply Exam Creation with semantic durable status, warning/error, cost-cap, uncertainty, cancellation, preserved-work, and recommended-action contracts.
- **FE-002:** After Lyra review, implement only the Exam Creation-owned presentation changes explicitly added to the approved Exam Creation specification; do not create AI-owned editing or approval UI.

## Worker / Workflow Tasks

- **WW-001:** Implement the Section 8.4 durable stages as Temporal-compatible workflows/activities with typed versioned inputs/outputs, heartbeats, timeouts, and restart-safe checkpoints.
- **WW-002:** Implement three-total-attempt provider retry/backoff, two-repair limit, permanent classification, cancellation propagation/race handling, uncertain-outcome reconciliation, and duplicate-delivery convergence.
- **WW-003:** Implement provider-call dispatch protection, provider idempotency/status lookup where available, conservative cost reservation, and audited release/redispatch rules.
- **WW-004:** Implement the provider-neutral AI Provider Interface and deterministic local/fake provider with all required success/failure/usage/cost scenarios.
- **WW-005:** Implement separately controlled production-provider contract tests and exclude them from the deterministic main suite.

## Security / Privacy / Operations Tasks

- **SO-001:** Provision least-privilege service identities, tenant-aware storage/queries, TLS, encryption at rest, secret isolation/rotation, and time-limited audited support access.
- **SO-002:** Document and enforce approved provider data sent, asset handling, residency, retention, training/abuse-monitoring settings, and deletion controls.
- **SO-003:** Implement privacy-safe structured logs, metrics, traces, alerts, audit events, stage/latency/reliability distributions, usage/cost reporting, and redaction tests.
- **SO-004:** Implement raw-response and failed-payload deletion, stricter tenant/legal deletion, legal holds, deletion monitoring, and access auditing.
- **SO-005:** Define `AI_PROCESSING_PROFILE_V1`, production health gates, deployment/rollback runbooks, adapter/schema compatibility checks, and cap/pricing configuration versioning.

## Testing Tasks

- **TEST-001:** Implement every case in `test-spec.md` with traceability to AC-001 through AC-028.
- **TEST-002:** Add Question JSON/request/taxonomy/handoff schema contract and compatibility fixtures.
- **TEST-003:** Add extraction fidelity and generation grounding/count suites using synthetic canonical fixtures.
- **TEST-004:** Add domain/reference/identity/order validation and bounded repair suites.
- **TEST-005:** Add provider-adapter contract, deterministic local parity, controlled production-provider, and all provider failure simulations.
- **TEST-006:** Add workflow tests for retry, backoff, repair, uncertain outcomes, cancellation, restart, duplicate delivery, atomic persistence, and handoff.
- **TEST-007:** Add cost-cap/reservation/accounting, tenant/auth/security/privacy/redaction, retention/deletion/legal-hold, migration/rollback, performance/reliability, and failure-injection suites.

## Dependencies

- Approved Exam Creation lifecycle and cost-control contract.
- Approved DOCX Ingestion Canonical Document schema, compatibility declarations, issue taxonomy, and authorized asset-access contract.
- Resolution of OQ-001 through OQ-003 and VEGA-001 through VEGA-005.
- Authentication/RBAC, tenant model, PostgreSQL migration/outbox mechanism, Temporal-compatible runtime, encrypted object storage, schema tooling, and provider-secret management.

Question Bank, vector/RAG, Mixing, and Publishing are neither dependencies nor permitted implementation scope.

## Completion Checklist

- [ ] Constitution check repeated after design.
- [ ] Lyra review completed for user-facing status semantics and Orion reconciliation applied.
- [ ] Owner and Vega decisions resolved and recorded.
- [ ] Versioned request, Question JSON, taxonomy, provider, workflow/activity, and handoff contracts approved.
- [ ] All AC-001 through AC-028 have passing mapped tests.
- [ ] Deterministic main suite has no live-provider dependency.
- [ ] Retry/repair/cost/idempotency/cancellation/uncertain-outcome limits pass.
- [ ] No invalid/partial/cancelled result can reach Exam Creation.
- [ ] No DOCX/private-parser or Draft/Master ownership boundary is crossed.
- [ ] Security, privacy, provider governance, retention, migration, deployment, rollback, latency, reliability, token, and cost gates pass.
- [ ] Pulsar review status is `Approved`.
