# DOCX Ingestion Tasks

## Task Summary

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| DI-001 | Resolve security and canonical contract decisions | Orion / Vega | P0 | Completed |
| DI-002 | Define Canonical Document schema and compatibility policy | Backend / Worker | P0 | Pending |
| DI-003 | Implement secure source validation and isolated parsing | Backend / Worker | P0 | Pending |
| DI-004 | Implement deterministic canonical transformation | Worker | P0 | Pending |
| DI-005 | Implement private asset extraction and references | Worker / Backend | P0 | Pending |
| DI-006 | Implement persistence, reuse, retry, and handoff | Backend / Worker | P0 | Pending |
| DI-007 | Implement security, observability, and retention | Backend / DevOps | P0 | Pending |
| DI-008 | Implement mandatory automated tests | Engineering | P0 | Pending |
| DI-009 | Document local operation, migration, and rollback | Engineering / DevOps | P1 | Pending |

## Implementation Tasks

- **DI-001:** Apply approved SECURITY_PROFILE_V1, Presentation MathML/private OMML provenance, BR-030 shape support/severity, ClamAV contract, tenant-scoped deduplication, and PERFORMANCE_PROFILE_V1.
- **DI-002:** Define and version Canonical Document, block, asset, issue, attempt, status, provenance, and handoff contracts from Section 8.
- **DI-003:** Define stable issue/error codes and severity rules covering all BR-016/BR-017 conditions.
- **DI-004:** Implement source command authorization, one-file/10 MiB checks, content detection, DOCX package validation, malware gate, safe archive/XML validation, hashing, and durable validation status.
- **DI-005:** Implement isolated/resource-bounded DOCX package parsing without active content execution or external fetching.
- **DI-006:** Implement deterministic ordered transformation for all required block families, normalized Presentation MathML with private OMML provenance, BR-030 shapes/relationships, and explicit unsupported/lossy issue generation.
- **DI-007:** Implement private asset validation, extraction, hashing, tenant-scoped HMAC physical deduplication, distinct semantic references, encryption, and reference-safe lifecycle.
- **DI-008:** Implement canonical schema/cross-reference validation and atomic result persistence.
- **DI-009:** Implement tuple-based reuse, immutable recanonicalization/version linking, and explicit reuse provenance.
- **DI-010:** Implement three-attempt transient retry/backoff, permanent classification, atomic cancellation/completion arbitration, stable cancellation events, server-timed 30-second Undo eligibility, idempotent resumption, restart recovery, and duplicate-delivery convergence.
- **DI-011:** Implement terminal handoff/status and safe recovery mapping for Exam Creation and future AI Processing, including preserved-stage information and blocked handoff while cancelled.

## Database Tasks

- **DB-001:** Create tenant-aware persistence for SourceDocumentVersion, IngestionAttempt, CanonicalDocumentVersion, CanonicalBlock, CanonicalAsset, IngestionIssue, and IngestionAuditEvent.
- **DB-002:** Add uniqueness/idempotency constraints for source hash scope, attempt identity, canonical tuple/version, block/asset identities, and audit side effects.
- **DB-003:** Represent immutable versions, predecessor/migration links, explicit ordinals/relationships, status transitions including `CANCELLED` and `RESUMING`, stable cancellation/resume references, authoritative timestamps, retention state, legal hold, and recoverable deletion.
- **DB-004:** Define migrations, backward compatibility, rollback, and consumer-version support without mutating prior canonical meaning.

## API Tasks

- **API-001:** Define REST/internal command contracts for submit, status, result retrieval, retry, cancel, 30-second Undo/resume, authorized asset access, and deletion/restore where owned.
- **API-002:** Enforce tenant, role, support-grant, lifecycle, cancellation-event freshness, authoritative Undo expiry, optimistic concurrency, idempotency, and schema-version checks server-side.
- **API-003:** Return stable safe issue/error codes, retryability, terminal status, cancellation ID/time/expiry/Undo eligibility, resume outcome, preserved stages, version/provenance, warnings, and recommended recovery without sensitive diagnostics.
- **API-004:** Publish contract fixtures for Exam Creation and future AI Processing consumers.

## Frontend Tasks

- **FE-001:** No standalone ingestion UI. Provide Exam Creation with data for the five-stage stage-only tracker, vertical narrow-screen layout, inline upload errors that preserve Setup data, persistent expandable warnings, failed-stage error card, one recovery action, subtle reuse note, preserved completed tracker above AI status, and recommended-action behavior.
- **FE-002:** Provide collapsed Technical details and accessible semantics for current/completed/failed stages, warning count/list, reuse, error-card focus, non-color-only status, and optional provenance.
- **FE-003:** Implement immediate Tenant Admin cancellation with Undo visible until the server-provided 30-second expiry; disable Undo while pending and present success, expiry, stale, unauthorized, duplicate-completed, and failed-resume outcomes without implying deletion.

## Worker / Workflow Tasks

- **WW-001:** Implement durable stages matching Section 10, atomic terminal persistence, cancellation/completion arbitration, `CANCELLED`/`RESUMING` transitions, and resume from the first incomplete eligible stage.
- **WW-002:** Implement exact SECURITY_PROFILE_V1 archive/XML/asset checks and the 1-vCPU/512-MiB/30-CPU-second/45-wall-second/128-MiB-temp/64-PID/no-network parser sandbox.
- **WW-003:** Propagate stable identifiers, correlation, parser/schema/config versions, cancellation/resume IDs and authoritative timestamps, and privacy-safe metrics across all stages.
- **WW-004:** Implement local contract-compatible object storage, database, workflow, containerized ClamAV, parser, and fault injection; keep deterministic scanner fake test-only.

## Security / Operations Tasks

- **SO-001:** Configure all approved SECURITY_PROFILE_V1 and parser isolation values as versioned external configuration.
- **SO-005:** Deploy ClamAV clamd INSTREAM scanning with preferred Unix socket, 12 MiB StreamMaxLength, 10-second timeout, freshclam updates, 24-hour freshness enforcement, fail-closed health behavior, and no untrusted TCP exposure.
- **SO-006:** Provision PERFORMANCE_PROFILE_V1 telemetry and test environment: four 1-vCPU/512-MiB workers, workload classification, percentile/queue metrics, and separate reuse/stress reporting.
- **SO-002:** Implement private object access, encryption, tenant scoping, service identities, time-limited support grants, and audit.
- **SO-003:** Implement stage metrics, attempt/reuse/retry counters, issue counts, P95 latency reporting, structured logs, traces, and alerts without sensitive content.
- **SO-004:** Implement 7-day temporary/failed-payload cleanup, 1-year failed-attempt retention, 7-year audit retention, exam-lifetime plus 30-day recoverable source/canonical retention, legal holds, and safe asset deletion.

## Testing Tasks

- **TEST-001:** Implement every case in `test-spec.md` and maintain traceability to AC-001 through AC-028.
- **TEST-002:** Add unit/contract tests for validation, deterministic transformation, issue severity, schema/cross-reference rules, identity/versioning, reuse, and idempotency.
- **TEST-003:** Add golden DOCX fixtures for every supported structure/relationship plus unsupported and lossy conditions.
- **TEST-004:** Add integration/workflow tests for storage, database, retry, restart, cancellation/completion races, 30-second Undo, duplicate/concurrent resume, stage reuse, atomic handoff, retention, and deletion.
- **TEST-007:** Add UX contract and accessibility tests for all confirmed Lyra decisions: tracker labels/layout, no estimates, inline validation, warning expansion/persistence, blocking-error focus/action, Technical details, reuse note, AI-status transition, and cancellation Undo states.
- **TEST-005:** Add security tests for disguised/unsafe packages, malware, archive/XML attacks, isolation, authorization, tenant boundaries, support grants, and log redaction.
- **TEST-006:** Add performance and local-parity tests through the 10 MiB boundary and PERFORMANCE_PROFILE_V1.
- **TEST-008:** Add exact-boundary SECURITY_PROFILE_V1, formula/OMML, shape-family, real ClamAV/EICAR, tenant-deduplication, and PERFORMANCE_PROFILE_V1 suites.

## Dependencies

- Approved DI-001 architecture/security decisions.
- Approved authentication/RBAC and tenant contracts.
- Private object-storage, PostgreSQL migration, Temporal-compatible workflow, malware-scanner, and isolated parser interfaces.
- Versioned schema-validation tooling.
- Exam Creation handoff contract.

AI Processing is a downstream consumer, not an implementation dependency, but its future spec must adopt the Canonical Document contract.

## Completion Checklist

- [x] Constitution check completed before implementation planning.
- [x] Lyra UX review completed and Orion cancellation/Undo reconciliation applied.
- [x] DI-001 architecture/security decisions resolved and reconciled.
- [x] Canonical schema, issue taxonomy, identity, versioning, compatibility, and handoff contracts specified and approved for implementation.
- [x] Security/privacy threat cases and resource limits specified.
- [ ] All AC-001 through AC-028 tests pass.
- [ ] Golden, contract, integration, workflow, security, recovery, retention, performance, and local-parity suites pass.
- [ ] P95 target is measured under the approved normal-load profile.
- [ ] No ingestion behavior crosses into AI, Draft/Master, mixing, or publishing ownership.
- [x] No unresolved constitutional, Exam Creation, or AI Processing conflict remains.
- [x] Specification status is `Implementation Ready`.
- [ ] Pulsar review status is `Approved`.
