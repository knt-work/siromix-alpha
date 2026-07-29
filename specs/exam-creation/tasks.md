# Exam Creation Tasks

## Task Summary

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| EC-001 | Resolve product defaults and supported content | Orion | P0 | Completed |
| EC-002 | Define versioned lifecycle and data contracts | Backend / Worker | P0 | Pending |
| EC-003 | Implement source upload and workflow orchestration | Backend / Frontend | P0 | Pending |
| EC-004 | Integrate canonicalization contract | Backend / Worker | P0 | Pending |
| EC-005 | Integrate mode-specific validated AI processing | Backend / Worker | P0 | Pending |
| EC-006 | Implement Draft review, editing, and validation | Frontend / Backend | P0 | Pending |
| EC-007 | Implement transactional Master Exam approval/versioning | Backend | P0 | Pending |
| EC-008 | Add observability, audit, security, and recovery | Backend / Worker | P0 | Pending |
| EC-009 | Implement automated test coverage | Engineering | P0 | Pending |
| EC-010 | Document local operation and rollback | Engineering / DevOps | P1 | Pending |
| EC-013 | Implement retention, Admin/support controls, SLO telemetry, and AI cost cap | Backend / DevOps | P0 | Pending |

## Implementation Tasks

- **EC-001:** Apply the confirmed metadata, fixed A-D single-answer MCQ/editor scope, 15 default and 5-50 generation range, 10 MB upload/security policy, ingestion blockers, retry limits, retention schedule, least-privilege Admin/support permissions, operational targets, and USD 1 equivalent AI cost cap.
- **EC-002:** Define versioned contracts for workflow state, source version, canonical handoff, AI attempt, validated question output, Draft revision, Master Exam version, validation result, and audit event. Include compatibility and migration rules.
- **EC-003:** Implement the durable stage state machine, correlation/idempotency scopes, server-side authorization, resume behavior, and safe state transitions.
- **EC-004:** Implement private one-DOCX upload, validation, source versioning, storage references, content hashing, and secure processing handoff.
- **EC-005:** Integrate the ingestion boundary so canonicalization is parse-once/reusable and returns explicit assets, warnings, failures, parser/schema versions, and traceability.
- **EC-006:** Integrate AI Processing for both source modes with versioned request/response contracts, attempt provenance, bounded recovery, usage/cost attribution, and backend validation.
- **EC-007:** Create Draft revisions only from valid AI output and preserve stable identities and complete provenance.
- **EC-008:** Implement the four-step guided journey and Draft review/editor with question navigator, autosaved Draft revisions, validation/warning acknowledgement, preview refresh without implicit AI calls, concurrency protection, failed-autosave recovery, and full narrow-screen behavior.
- **EC-009:** Implement safe regeneration as a new attempt and distinct candidate Draft, side-by-side change summary, explicit candidate selection, and preserved prior Drafts. Implement post-Draft source replacement as a confirmed new linked one-DOCX workflow and candidate.
- **EC-010:** Implement transactional revalidation and approval that creates immutable, monotonically versioned Master Exams and audit events.
- **EC-011:** Expose post-approval handoff contracts that require an exact Master Exam version and prohibit Draft consumption.
- **EC-012:** Implement background-processing departure/return, exam-dashboard status, teacher-friendly stages with expandable technical provenance, and terminal-failure guidance with one recommended recovery action.
- **EC-013:** Implement retention/deletion/legal-hold processing, Tenant Admin and time-limited support-grant controls, service-level telemetry, per-attempt cost attribution, 80% warning, AI-attempt cap enforcement, and audited Admin cap increase.

## Database Tasks

- **DB-001:** Design tenant-aware persistence for all logical entities in Section 8, stable Draft identities and revisions, immutable Master versions, linked replacement workflows, selected candidate, optimistic concurrency, stage status, validation results, warning-instance acknowledgements, provenance, and audit records.
- **DB-002:** Add uniqueness and transaction constraints preventing duplicate logical attempts, Drafts, question identities within their scope, version numbers, and approvals.
- **DB-003:** Define migrations, backward compatibility, rollback behavior, and the exact Section 8 retention/deletion/legal-hold lifecycle without changing official exam meaning.
- **DB-004:** Ensure binary assets and original DOCX files remain outside core relational payloads and use stable private object references.

## API Tasks

- **API-001:** Define REST endpoints and Zod/class-validator schemas for workflow creation, upload, aggregate generation configuration, status, retry, Draft retrieval/autosave, regeneration, linked source replacement, candidate comparison/selection, warning acknowledgement, validation, preview request, and approval.
- **API-002:** Enforce Teacher, Tenant Admin, platform-support grant, tenant, lifecycle, concurrency, cost-cap, and idempotency checks server-side for every operation.
- **API-003:** Return stable machine-readable error codes, retryability, actionable messages, current revision/status, and correlation IDs without leaking sensitive content.
- **API-004:** Publish contract tests for ingestion, AI, Draft/Master, and later mixing/publishing handoffs.
- **API-005:** Expose authorized retention/deletion, legal-hold, support-grant, cost status, and Admin cap-increase operations with auditable outcomes.

## Frontend Tasks

- **FE-001:** Build the accessible four-step journey for Setup, Processing, Review & Edit, and Approval with prerequisite-aware step navigation.
- **FE-002:** Build BR-019 metadata gates, secure one-DOCX upload, mutually exclusive mode selection, and a total generation-count input defaulting to 15 with a 5-50 range; do not expose a question-type selector.
- **FE-003:** Display teacher-friendly durable stages, dashboard departure/return status, expandable technical provenance, warnings, terminal failures, one recommended recovery action, and saved-work guarantees.
- **FE-004:** Build the structured Draft editor with question navigator, field and review-level validation, individual warning acknowledgement, autosave states/retry, preview refresh, concurrency recovery, and protection from losing unpersisted changes.
- **FE-005:** Build side-by-side regeneration comparison, explicit preserved-candidate selection, and confirmed source replacement into a clearly linked workflow/candidate.
- **FE-006:** Build the dedicated approval readiness checklist, unresolved-item navigation, target-version information, final immutable-version confirmation, success state, and later-feature handoffs without implementing mixing or publishing.
- **FE-007:** Verify keyboard and focus behavior, semantic status/error/change announcements, non-color-only meaning, navigator drawer, responsive candidate comparison, and full complex-content editing on narrow screens.

## Worker / Workflow Tasks

- **WW-001:** Implement durable orchestration stages for upload completion, canonicalization, AI processing, validation, Draft creation, and terminal failures.
- **WW-002:** Apply the exact BR-023 retry/repair counts, backoff, and idempotency at each boundary; distinguish transient, permanent, structural-repair, domain-validation, and authorization failures.
- **WW-003:** Propagate correlation/provenance identifiers and privacy-safe structured telemetry.
- **WW-004:** Provide local contract-compatible storage and AI adapters with meaningful failure simulation.

## Testing Tasks

- **TEST-001:** Implement all cases in `test-spec.md` and maintain traceability to AC-001 through AC-024.
- **TEST-002:** Add unit tests for lifecycle transitions, validation severity, warning acknowledgement invalidation, stable Draft/revision/Master identities, concurrency, authorization, and idempotency.
- **TEST-003:** Add contract and golden-fixture tests for Canonical Document and Question JSON boundaries.
- **TEST-004:** Add integration tests for database transactions, private storage, orchestration, adapters, retry behavior, provenance, and audit records.
- **TEST-005:** Add end-to-end tests for extraction, aggregate-count generation, four-step navigation, autosave/edit-without-AI, dashboard return, regeneration comparison, linked source replacement, failure recovery, readiness/approval, later version approval, and access denial.
- **TEST-006:** Add responsive accessibility checks for navigator, warning acknowledgement, comparison, autosave, processing status, and approval, plus regression fixtures for correctness defects.

## Dependencies

- Confirmed product decisions in EC-001 and completed Lyra/Orion reconciliation.
- Approved DOCX Ingestion and AI Processing contracts or an explicitly approved sequencing decision defining them within this delivery.
- Authentication/RBAC and tenant model.
- PostgreSQL migration mechanism and private object-storage interface.
- Temporal-compatible orchestration and worker runtime.
- Versioned schema-validation tooling and AI provider interface.
- Preview contract capable of rendering saved Draft domain data without becoming the Publishing Engine.

Mixing and Publishing are downstream consumers and are not implementation dependencies for creating or approving a Master Exam.

## Completion Checklist

- [ ] Constitution check completed before implementation planning.
- [x] High-impact open questions resolved.
- [x] Lyra UX review completed and Orion reconciliation applied.
- [ ] All contracts are versioned and ownership boundaries documented.
- [ ] Security, privacy, idempotency, observability, cost, migration, local parity, and rollback tasks completed.
- [ ] AC-001 through AC-024 each have passing mapped tests.
- [ ] Mandatory unit, contract, integration, workflow, end-to-end, error, and accessibility tests pass.
- [ ] No Draft can enter mixing/publishing or become official without approval.
- [ ] No unresolved constitutional or neighboring-spec conflict remains.
- [ ] Pulsar review status is `Approved`.
