# DOCX Ingestion Tasks

## Task Summary

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| DI-001 | Resolve security and canonical contract decisions | Orion / Vega | P0 | Completed |
| DI-002 | Define Canonical Document schema and compatibility policy | Backend / Worker | P0 | Completed |
| DI-003 | Define stable issue/error taxonomy and severity rules | Backend / Worker | P0 | Pending |
| DI-004 | Implement secure source validation and malware/package gates | Backend / Worker | P0 | Pending |
| DI-005 | Implement isolated resource-bounded DOCX parsing | Worker / DevOps | P0 | Pending |
| DI-006 | Implement deterministic canonical transformation | Worker | P0 | Pending |
| DI-007 | Implement private asset extraction, references, and lifecycle | Worker / Backend | P0 | Pending |
| DI-008 | Implement canonical validation and atomic persistence | Backend / Worker | P0 | Pending |
| DI-009 | Implement reuse and immutable recanonicalization | Backend / Worker | P0 | Pending |
| DI-010 | Implement retry, cancellation, Undo, and durable recovery | Backend / Worker | P0 | Pending |
| DI-011 | Implement terminal handoff, status, and recovery mapping | Backend / Worker | P0 | Pending |
| DI-012 | Implement security operations, observability, retention, and performance controls | Backend / DevOps | P0 | Pending |
| DI-013 | Implement mandatory automated test suites | Engineering | P0 | Pending |
| DI-014 | Document local operation, migration, and rollback | Engineering / DevOps | P1 | Pending |

## Implementation Tasks

- **DI-001:** Apply approved SECURITY_PROFILE_V1, Presentation MathML/private OMML provenance, BR-030 shape support/severity, ClamAV contract, tenant-scoped deduplication, and PERFORMANCE_PROFILE_V1.
- **DI-002:** Define and version Canonical Document, block, asset, issue, attempt, status, provenance, and handoff contracts from Section 8 in the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`. Keep the authoritative JSON Schema, compatibility metadata, TypeScript readers, and fixtures in that package; generate or conformance-test the Python worker binding against it; do not place or re-export these contracts through Foundation's `@siromix/contracts`.
- **DI-003:** Define stable issue/error codes and severity rules covering all BR-016/BR-017 conditions.
- **DI-004:** Implement source command authorization, one-file/10 MiB checks, content detection, DOCX package validation, malware gate, safe archive/XML validation, hashing, and durable validation status.
- **DI-005:** Implement isolated/resource-bounded DOCX package parsing without active content execution or external fetching.
- **DI-006:** Implement deterministic ordered transformation for all required block families, normalized Presentation MathML with private OMML provenance, BR-030 shapes/relationships, and explicit unsupported/lossy issue generation.
- **DI-007:** Implement private asset validation, extraction, hashing, tenant-scoped HMAC physical deduplication, distinct semantic references, encryption, and reference-safe lifecycle.
- **DI-008:** Implement canonical schema/cross-reference validation and atomic result persistence.
- **DI-009:** Implement tuple-based reuse, immutable recanonicalization/version linking, and explicit reuse provenance.
- **DI-010:** Implement three-attempt transient retry/backoff, permanent classification, atomic cancellation/completion arbitration, stable cancellation events, server-timed 30-second Undo eligibility, idempotent resumption, restart recovery, and duplicate-delivery convergence.
- **DI-011:** Implement terminal handoff/status and safe recovery mapping for Exam Creation and future AI Processing, including preserved-stage information and blocked handoff while cancelled.
- **DI-012:** Implement the approved security/operations controls, privacy-safe observability, retention/recovery/legal-hold behavior, ClamAV operating contract, and PERFORMANCE_PROFILE_V1 environment and telemetry defined by SO-001 through SO-006.
- **DI-013:** Implement the complete mandatory automated coverage defined by TEST-001 through TEST-009 and `test-spec.md`, preserving traceability to AC-001 through AC-028.
- **DI-014:** Document production-compatible local operation, configuration, migrations, recanonicalization/backward compatibility, deployment, rollback, failure recovery, and the approved environment differences.

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
- **SO-002:** Implement private object access, encryption, tenant scoping, service identities, time-limited support grants, and audit.
- **SO-003:** Implement stage metrics, attempt/reuse/retry counters, issue counts, P95 latency reporting, structured logs, traces, and alerts without sensitive content.
- **SO-004:** Implement 7-day temporary/failed-payload cleanup, 1-year failed-attempt retention, 7-year audit retention, exam-lifetime plus 30-day recoverable source/canonical retention, legal holds, and safe asset deletion.
- **SO-005:** Deploy ClamAV clamd INSTREAM scanning with preferred Unix socket, 12 MiB StreamMaxLength, 10-second timeout, freshclam updates, 24-hour freshness enforcement, fail-closed health behavior, and no untrusted TCP exposure.
- **SO-006:** Provision PERFORMANCE_PROFILE_V1 telemetry and test environment: four 1-vCPU/512-MiB workers, workload classification, percentile/queue metrics, and separate reuse/stress reporting.

## Testing Tasks

- **TEST-001:** Implement every case in `test-spec.md` and maintain traceability to AC-001 through AC-028.
- **TEST-002:** Add unit/contract tests for validation, deterministic transformation, issue severity, schema/cross-reference rules, identity/versioning, reuse, and idempotency.
- **TEST-003:** Add golden DOCX fixtures for every supported structure/relationship plus unsupported and lossy conditions.
- **TEST-004:** Add integration/workflow tests for storage, database, retry, restart, cancellation/completion races, 30-second Undo, duplicate/concurrent resume, stage reuse, atomic handoff, retention, and deletion.
- **TEST-005:** Add security tests for disguised/unsafe packages, malware, archive/XML attacks, isolation, authorization, tenant boundaries, support grants, and log redaction.
- **TEST-006:** Add performance and local-parity tests through the 10 MiB boundary and PERFORMANCE_PROFILE_V1.
- **TEST-007:** Add UX contract and accessibility tests for all confirmed Lyra decisions: tracker labels/layout, no estimates, inline validation, warning expansion/persistence, blocking-error focus/action, Technical details, reuse note, AI-status transition, and cancellation Undo states.
- **TEST-008:** Add exact-boundary SECURITY_PROFILE_V1, formula/OMML, shape-family, real ClamAV/EICAR, tenant-deduplication, and PERFORMANCE_PROFILE_V1 suites.
- **TEST-009:** Add owner-boundary tests proving `@siromix/docx-ingestion-contracts` is the authoritative feature package, direct consumers use it, the Python binding conforms to its schema, and Foundation's `@siromix/contracts` neither contains nor re-exports DOCX contracts.

## Task-to-Test Ownership

Tests are implemented alongside their owning DI task and consolidated under DI-013 as the final feature-wide release gate. DI-013 does not defer testing until the end or transfer behavioral ownership away from the implementation task.

| DI Task | Required Test Ownership |
|---|---|
| DI-002 | Contract and owner-boundary coverage from TEST-002 and TEST-009 for the versioned schemas, readers, fixtures, compatibility policy, and Foundation separation. |
| DI-003 | Unit, contract, golden, workflow, and error-case coverage from TEST-001 through TEST-004 for every BR-016/BR-017 code, severity, retryability, downstream policy, and safe recovery mapping. |
| DI-004 | Unit, integration, and security coverage from TEST-002, TEST-004, TEST-005, and TEST-008 for authorization, file limits, type/package validation, malware, archive/XML limits, hashing, and durable validation status. |
| DI-005 | Golden, integration, security, local-parity, and exact-boundary coverage from TEST-003 through TEST-006 and TEST-008 for isolated parsing, prohibited execution/fetching, sandbox limits, and restart/failure behavior. |
| DI-006 | Unit, contract, golden, and exact-boundary coverage from TEST-002, TEST-003, and TEST-008 for deterministic structure/order, formulas, shapes, relationships, and unsupported/lossy classification. |
| DI-007 | Unit, integration, security, retention, and exact-boundary coverage from TEST-002, TEST-004, TEST-005, and TEST-008 for asset validation, private references, tenant isolation, deduplication, and reference-safe lifecycle. |
| DI-008 | Unit, contract, integration, and workflow coverage from TEST-002 and TEST-004 for schema/cross-reference validation, identity constraints, atomic persistence, and success-only visibility. |
| DI-009 | Unit, integration, workflow, and migration coverage from TEST-002 and TEST-004 for reuse eligibility, mismatch handling, immutable linked versions, and reuse provenance. |
| DI-010 | Unit, integration, workflow, and UX-contract coverage from TEST-002, TEST-004, and TEST-007 for retries, interruption, cancellation/completion races, Undo boundaries, resumption, and duplicate delivery. |
| DI-011 | Contract, integration, workflow, and UX/accessibility coverage from TEST-004 and TEST-007 for terminal handoff, preserved-stage status, warnings, failures, technical details, reuse, and AI transition. |
| DI-012 | Security, integration, retention, local-parity, performance, and exact-boundary coverage from TEST-004 through TEST-006 and TEST-008 for operations, telemetry, privacy, retention, ClamAV, and PERFORMANCE_PROFILE_V1. |
| DI-013 | Owns execution and traceability of the complete `test-spec.md` suite, including TEST-001 through TEST-009 and AC-001 through AC-028; it does not replace tests required within DI-002 through DI-012. |
| DI-014 | Owns documentation verification for local operation, migrations, compatibility, deployment, recovery, and rollback, including any documentation checks required by `test-spec.md`. |

## Dependencies

- DI-001 decisions are prerequisites for all implementation tasks.
- DI-002 contract approval is a prerequisite for DI-003 through DI-014.
- DI-003 issue/error taxonomy is a prerequisite for source validation, parser, transformation, API recovery, workflow failure handling, and their fixtures.
- DI-004 secure source validation must complete before DI-005 parser invocation is permitted.
- DI-005 parser output is the input to DI-006 deterministic transformation.
- DI-006 canonical output and DI-007 asset output are prerequisites for DI-008 atomic validation and persistence.
- DI-008 persisted output is a prerequisite for DI-009 reuse and DI-011 successful handoff.
- DI-010 retry/cancellation/resumption semantics apply to DI-004 through DI-011 and must be integrated before terminal workflow approval.
- DI-012 cross-cutting controls apply to every runtime task and cannot be deferred past the task they protect.
- Each DI-002 through DI-012 task owns its mapped tests; DI-013 completes the feature-wide release suite after those focused tests exist.
- DI-014 follows the final approved runtime, migration, compatibility, operational, and rollback behavior.
- Approved authentication/RBAC and tenant contracts.
- Private object-storage, PostgreSQL migration, Temporal-compatible workflow, malware-scanner, and isolated parser interfaces.
- Versioned schema-validation tooling.
- Dedicated workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`; Foundation's `@siromix/contracts` remains domain-neutral and is not a DOCX contract dependency.
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
