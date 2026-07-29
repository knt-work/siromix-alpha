# Exam Creation Test Specification

## Test Scope

Verify the one-DOCX teacher workflow across upload, mode configuration, canonical handoff, AI attempt/provenance, validation, Draft review/editing, safe recovery, approval, Master Exam versioning, authorization, observability, and downstream boundaries.

Parser internals, model quality evaluation, mixing algorithms, and final publishing render fidelity belong to their later owning specifications. This suite must still contract-test their handoff boundaries.

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| AC-001 | Authorized one-DOCX/mode workflow succeeds; invalid count/type/size and unauthorized start fail before AI | E2E / Integration | Pending |
| AC-002 | Extraction non-invention, fixed A-D single-answer output, and generation default/range are enforced | Unit / Contract | Pending |
| AC-003 | AI is blocked before canonical success; identical canonical result is reused with traceability | Workflow / Integration | Pending |
| AC-004 | Ordered structures/assets survive canonical contract and unsupported content is explicit | Golden / Contract | Pending |
| AC-005 | Complete AI attempt provenance is persisted | Integration | Pending |
| AC-006 | Invalid outputs and wrong generation count cannot create approvable Drafts; recovery is bounded | Unit / Workflow | Pending |
| AC-007 | Valid output creates a distinct, stable, traceable Draft | Integration | Pending |
| AC-008 | Guided editor navigation, autosave states/revisions, revalidation, no-AI preview, and failed-save recovery work | E2E / Integration / Accessibility | Pending |
| AC-009 | Regeneration uses a distinct Draft plus comparison/selection; source replacement uses a linked one-DOCX workflow without overwrite | Workflow / E2E / Integration | Pending |
| AC-010 | Readiness/confirmation approval rejects unauthorized, invalid, stale, unsaved, error-bearing, or unacknowledged-warning states without data loss | Integration / E2E | Pending |
| AC-011 | First approval transactionally creates immutable Master version 1 and audit event | Integration / E2E | Pending |
| AC-012 | Official content revision creates next immutable version and preserves old derived associations | Integration | Pending |
| AC-013 | Mixing/publishing handoffs reject Drafts and require exact Master version | Contract | Pending |
| AC-014 | Repeated idempotent requests do not duplicate data or preventable AI calls | Integration / Workflow | Pending |
| AC-015 | Background processing, dashboard return, friendly/technical status, recommended recovery, correlation, logs, and audit work safely | Integration / E2E | Pending |
| AC-016 | Role and tenant isolation cover all sensitive resources/actions | Security / Integration | Pending |
| AC-017 | Four-step flow, navigator/drawer, autosave, warnings, comparison, approval, and full narrow-screen editing meet accessibility rules | Accessibility / Responsive E2E | Pending |
| AC-018 | Complete flow and meaningful failures run with local contract-compatible dependencies | E2E / Deployment | Pending |
| AC-019 | Processing and approval enforce their exact required, optional, and system-derived metadata gates | Unit / E2E | Pending |
| AC-020 | 10 MB/package/security rules and semantic ingestion blockers run before canonicalization/AI; presentation-only loss warns | Security / Contract / Workflow | Pending |
| AC-021 | Exact per-stage retry/repair limits, backoff, attempt records, idempotency, and manual recovery are enforced | Unit / Workflow / Integration | Pending |
| AC-022 | Exact retention, recoverable deletion, tenant/legal deletion, and legal-hold schedules are enforced | Integration / Time-based | Pending |
| AC-023 | Tenant Admin and platform-support permissions and audited support grants enforce least privilege | Security / Integration / E2E | Pending |
| AC-024 | P95 latency, availability telemetry, cost attribution, 80% warning, cap blocking, and audited cap increase work | Performance / Integration / E2E | Pending |
| AC-025 | One active cap request, Teacher status/withdrawal, seven-day expiry, Admin decision, atomic cap update, idempotent notification, authorization, and Draft preservation work | Unit / Integration / Workflow / E2E / Security | Pending |

## Unit Tests

- Validate allowed workflow state transitions and reject skipped, backward, or incompatible transitions.
- Validate one-file rule, DOCX metadata policy, exclusive mode selection, and generation parameters.
- Verify generation defaults to 15, accepts integers 5-50, rejects all other values, and exposes no question-type parameter.
- Validate all versioned Question JSON/domain rules, including fields, types, choices, correct answers, linked content, duplicates, empty content, and requested count.
- Validate every question has exactly ordered labels A-D, exactly one correct answer, and supported editable score/rich-content fields.
- Verify Draft edits rerun domain validation without scheduling AI.
- Verify autosave increments the selected Draft revision, regeneration creates a distinct Draft identity, and Master Exam versions remain immutable and monotonic.
- Verify BR-011 blocking classifications, individual warning acknowledgement, revision scoping, and acknowledgement invalidation after related content changes.
- Verify every exact BR-023 retry and repair count, classification, backoff eligibility, idempotency-key scope, and safe regeneration rule.
- Verify Teacher, Tenant Admin, dual-role Admin/Teacher, platform support with/without grant, unauthorized-user, and tenant-boundary decisions.
- Verify metadata requirements separately at processing and approval gates.
- Verify 80% cost warning and hard-cap calculations include repair attempts.
- Verify cap-request states and transitions, one-active-request uniqueness, no Teacher cap-amount input, Admin-entered positive new cap above the current cap, seven-day expiry, requester withdrawal, and terminal-state immutability.
- Verify only same-tenant authorized Teachers submit/withdraw and only same-tenant authorized Tenant Admins approve/reject; submission never changes the cap.

## Integration Tests

- Persist and retrieve workflow, source, canonical, AI attempt, Draft revision, Master version, and audit provenance.
- Persist linked replacement workflows so each retains exactly one source and the original Draft remains unchanged.
- Persist warning-instance acknowledgement against the current Draft revision and invalidate it when applicable content changes.
- Reject duplicate idempotent commands and concurrent stale Draft updates.
- Roll back approval atomically when revalidation, version allocation, persistence, or audit insertion fails.
- Confirm first and subsequent approvals create immutable versions without changing older content or derived-data associations.
- Confirm private storage access requires authorization and tenant scope.
- Confirm stage errors preserve last committed source/canonical/Draft data.
- Confirm failed autosave retains visible local changes, keeps the last saved revision authoritative, and blocks destructive navigation and approval until recovered.
- Confirm correlation identifiers propagate across REST, workflow, worker, storage, and AI-adapter boundaries.
- Confirm logs/metrics/audit metadata omit full document, prompt, question/answer, credential, and provider payload content.
- Confirm provider usage/cost metadata is attributed when supplied.
- Confirm AI attempts are blocked at the USD 1 equivalent workflow cap, editing/approval remain available, and only an authorized Tenant Admin can raise the cap through an audit event.
- Confirm cap-request submission is idempotent, returns the current active request, preserves Draft access, and records no cap change.
- Confirm Admin approval atomically updates the workflow cap, decision/audit record, and outbox event; rejection leaves the cap unchanged.
- Confirm duplicate outbox delivery or AI acknowledgement publishes one logical approved cap change.
- Confirm retention schedules for each record/object class, 30-day recovery, 90-day candidate inactivity, 7-day temporary payloads, 1-year attempt metadata, 7-year audit events, tenant/legal deletion, and legal holds.
- Confirm time-limited support grants expire and every content access is tenant-scoped and audited.

## Workflow Tests

- Happy path for raw-exam extraction from canonical success through Draft creation.
- Happy path for knowledge generation with exact requested count.
- Generation defaults to 15, accepts boundary counts 5 and 50, and rejects 4, 51, non-integers, and question-type parameters.
- AI is never invoked before canonical success.
- Retry resumes the failed eligible stage and reuses prior successful outputs.
- Transient failures back off and stop at the configured bound; permanent failures do not loop.
- Upload and canonicalization transient failures stop after 3 attempts; provider transient failures stop after 3 attempts; malformed AI output stops after 2 repair attempts after the original response; autosave stops after 3 attempts; preview stops after 2 attempts; approval uses idempotent manual recovery rather than blind repetition.
- Domain-invalid AI output after structural repair stops and recommends regeneration without looping.
- Duplicate delivery of each command/activity does not duplicate records, questions, approvals, or preventable provider calls.
- Regeneration records a new attempt and candidate while preserving current Draft and approved versions.
- Post-Draft source replacement starts a linked workflow with one new source and never mutates or adds a source to the original workflow.
- Interrupted workflow resumes from durable state after worker/process restart.
- Pending cap request expires after seven days; duplicate/concurrent submit/withdraw/approve/reject and worker restart converge on one valid state and one cap outcome.
- Notification delivery retries durably after interruption without reopening a rejected/cancelled/expired request or duplicating an approved cap update.

## End-to-End Tests

- Teacher completes Setup, Processing, Review & Edit, and Approval for a raw-exam DOCX; uses the question navigator, edits a question/answer, observes autosave and refreshed preview without another AI call, acknowledges warnings individually, passes the readiness checklist, and approves Master Exam version 1.
- Teacher uploads a knowledge DOCX, accepts default 15 or enters 5-50, receives only valid A-D single-answer questions of the requested count, edits supported rich content and score, and approves.
- Invalid upload is rejected with accessible actionable feedback before processing.
- Processing and approval enforce their different BR-019 metadata sets while optional and system-derived fields behave as specified.
- Teacher can add, delete, duplicate, reorder, and edit questions but cannot remove option A-D, add a fifth option, or select zero/multiple correct answers.
- Canonicalization, provider, validation, save, preview, and approval failures each preserve the documented recoverable state.
- Teacher leaves during processing, observes teacher-friendly dashboard status, returns to the durable stage, and can expand exact technical and provenance details.
- Saved edits survive regeneration; a semantic side-by-side summary identifies additions, removals, and changes, and explicit selection opens either preserved Draft.
- Teacher confirms post-Draft DOCX replacement; the existing Draft remains available and the replacement is processed as a candidate in a new linked one-DOCX workflow.
- Exhausted automatic recovery identifies the failed stage and preserved work and emphasizes exactly one recommended recovery action.
- A stale browser revision cannot approve after another edit.
- An approved exam edited through the revision flow produces Master Exam version 2 while version 1 remains unchanged.
- Draft-only workflow cannot enter mixing or publishing; approved exact-version handoff succeeds.
- Tenant Admin can view status/audit, retry, cancel unapproved work, delete under policy, and raise the cost cap but cannot perform Teacher-only content actions; dual-role behavior and platform-support grants work as specified.
- Cost warning appears at 80%, the cap blocks only further AI attempts, and an audited authorized increase permits a later attempt.
- Cap-blocked Teacher submits **Request an Admin cap increase**, sees sent/pending status without implied approval, continues editing the existing Draft, and cannot create a duplicate active request.
- Same-tenant Admin sees the pending request, explicitly approves or rejects it, and the Teacher sees the resulting status; approval permits a later AI attempt only after the cap-change handoff succeeds.
- Teacher withdraws a pending request; an undecided request expires after seven days; either terminal state permits a later new request while preserving audit history.
- Keyboard-only user can complete the critical journey and perceive progress, navigator status, errors, warning acknowledgements, save state, comparison changes, and approval confirmation programmatically.
- Narrow-screen user can fully edit complex content using the navigator drawer and complete a sequentially reflowed candidate comparison without information loss.

## Error Case Tests

- Missing, multiple, over-10-MB, fake-extension/MIME, corrupt, encrypted, macro-enabled, disguised, malware-positive, unsafe archive-expansion/entry/decompression, and storage-failed uploads.
- Empty canonical content, invalid canonical schema, lost semantic order, broken required media/table/formula relationships, and meaning-affecting unsupported content block AI; presentation-only loss proceeds with warning.
- Unsupported/lossy canonical elements as warning and blocking fixtures.
- Canonical hash/schema/parser mismatch.
- Provider timeout, throttle, configuration failure, unavailable model, and bounded retry exhaustion.
- Schema-invalid, empty, duplicate, unsupported-type, invalid-answer, broken-reference, and wrong-count AI responses.
- Network loss during upload, save, preview, retry, regeneration, and approval.
- Pending and failed autosave block approval and any navigation that would discard local changes.
- Retention runs too early/late, recovery-period restoration, legal-hold suppression, tenant/legal deletion, and raw-provider-response removal.
- Admin attempts Teacher-only actions; platform support accesses content without, outside, or after an audited grant.
- Missing cost, 80% threshold crossing, hard-cap crossing, unauthorized increase, and editing/approval while capped.
- Duplicate/misrouted/stale/expired/cancelled/already-decided/cross-tenant cap request; invalid Admin-entered new cap; unauthorized submit/withdraw/approve/reject; concurrent decisions; delayed/duplicate notification; and submission incorrectly displayed as approval.
- Unauthorized/cross-tenant access for every resource and mutation.
- Concurrent edits, duplicate approval, stale approval, incomplete-state approval, and approval transaction failure.
- Attempted silent replacement of saved edits or approved versions, same-workflow second-source attachment, and unconfirmed linked source replacement.
- Draft or unknown Master version supplied to downstream handoff.

## Test Data

- Minimal and complex valid DOCX fixtures with headings, paragraphs, lists, tables, images, formulas/shapes where supported, and adjacent-element relationships.
- Raw-exam fixtures for fixed four-option single-answer MCQs, rich text, score, table/media/formula association, duplicate, malformed labels/options, and zero/multiple correct answers.
- Knowledge-source fixtures with deterministic fake-provider responses for exact, low, high, duplicate, invalid, and empty question counts.
- Unsupported/lossy, corrupt, encrypted, fake-type, oversized, and unsafe upload fixtures.
- Versioned Canonical Document, Question JSON, Draft Exam, and Master Exam contract fixtures.
- Multiple Draft candidates and linked one-source workflow fixtures covering regeneration, autosave revisions, source replacement, and candidate comparison.
- Two tenants and role fixtures covering authorized Teacher, scoped Admin policy, unauthorized user, and cross-tenant attempts.
- Clock-controlled retention fixtures and AI-cost fixtures below, at, and above warning/cap thresholds.
- Clock-controlled cap-request fixtures for pending, approved, rejected, withdrawn, exact seven-day expiry, post-expiry, duplicate/concurrent decisions, outbox retry, and cross-tenant authorization.
- Performance fixtures for valid DOCX inputs through 10 MB and generated Drafts through 50 questions.
- Fault-injection fixtures for storage, database, workflow restart, provider, validation, preview, audit, and approval transaction failures.

Fixtures must contain synthetic, non-sensitive content and stable golden expectations.

## Completion Criteria

- Every acceptance criterion has at least one implemented, passing mapped test.
- Business-critical units reach at least 90% unit coverage where practical, with no untested approval, answer-integrity, authorization, or idempotency branch.
- Required unit, golden, contract, integration, workflow, end-to-end, security, error, accessibility, and local-parity suites pass.
- Tests demonstrate no AI call during Draft editing and no official exam without explicit valid approval.
- Tests demonstrate immutable Master versions and exact-version downstream handoffs.
- Required tests are release-blocking and cannot be skipped.
- Regression tests are added for every confirmed defect affecting content, answers, identity, provenance, versioning, or approval.
- Performance tests report P95 against NFR-006, monitoring demonstrates the NFR-012 availability calculation, and failures block release when targets are not met under the defined normal-load profile.
