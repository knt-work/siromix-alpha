# Platform Foundation Test Specification

## Test Scope

The test plan is divided into:

1. **MVP Release Gate:** mandatory tests required for MVP Foundation approval and safe implementation of Exam Creation, DOCX Ingestion, and AI Processing.
2. **Production Hardening:** non-blocking certification required before production deployment.

Production Hardening failures or missing evidence must be reported but must not block MVP Foundation approval.

## Acceptance Criteria Coverage Matrix

### MVP Release Gate

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| MVP-AC-001 | Locked workspace, pinned tools, minimal build/load, and deterministic generation | Bootstrap / Build | Passed |
| MVP-AC-002 | Local dependencies/apps/workers start without production credentials and report readiness | Local integration | Passed |
| MVP-AC-003 | Typed configuration, secret/example, browser allowlist, and production fail-closed cases | Unit / Security | Passed |
| MVP-AC-004 | Empty/current migration, pgvector, ordering/checksum, destructive-cleanup, and rollback-contract cases | Migration / Integration | Passed |
| MVP-AC-005 | Tenant transaction, concurrency, idempotency, outbox, audit, conventions, and reset isolation | Unit / Integration | Passed |
| MVP-AC-006 | Real Temporal queues/retry/heartbeat/cancel/replay/duplicate/restart and negative feature registration | Workflow / Integration | Passed |
| MVP-AC-007 | Login, password/JWT/session/provisioning/CSRF/local-identity security | Security / Integration | Passed |
| MVP-AC-008 | RBAC, tenant, service identity, and support-grant denial/scope behavior | Security / Integration | Passed |
| MVP-AC-009 | MinIO/R2-compatible private streaming/signed/lifecycle/health/error parity | Storage integration | Passed |
| MVP-AC-010 | Authoritative `1.0` JSON Schema/Zod/Pydantic/OpenAPI conformance; reject `1.1`/unsupported; drift | Contract / Compatibility | Failing — implementation accepts `1.1` |
| MVP-AC-011 | Node/Python safe-field preservation and prohibited key/value redaction | Unit / Security | Passed |
| MVP-AC-012 | Liveness/readiness safe state and dependency recovery | Integration / Recovery | Passed |
| MVP-AC-013 | Node, frontend coverage, E2E, Python, mandatory integration, workflow, storage, migration, security, and build commands | Test infrastructure | Passed |
| MVP-AC-014 | CI required-gate configuration and pull-request secret/promotion restrictions | CI contract / Security | Passed |
| MVP-AC-015 | Exact isolated test reset; reject development/production/ambiguous targets | Destructive safety | Passed |
| MVP-AC-016 | Static/runtime feature-boundary inventory | Architecture / Negative | Passed |
| MVP-AC-017 | Exam Creation, DOCX Ingestion, and AI Processing consumer fixtures | Consumer contract | Passed |
| MVP-AC-018 | Safe versioned readiness report completeness | Operations contract | Passed |

### Production Hardening

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| PH-AC-001 | Historical/partial/concurrent/incompatible migration and forward-correction matrix | Migration certification | Deferred — non-blocking |
| PH-AC-002 | Captured end-to-end telemetry propagation/redaction | Observability certification | Deferred — non-blocking |
| PH-AC-003 | Exhaustive real-dependency failure injection | Reliability certification | Deferred — non-blocking |
| PH-AC-004 | Clean hosted Windows/Linux lifecycle and edge cases | Cross-platform certification | Deferred — non-blocking |
| PH-AC-005 | Hosted OCI/SBOM/provenance/scan/bundle/promotion evidence | Artifact certification | Deferred — non-blocking |
| PH-AC-006 | Production-like rollout/rollback/forward-correction certification | Deployment certification | Deferred — non-blocking |
| PH-AC-007 | Release performance/restart/backup/recovery/operations targets | Operational certification | Deferred — non-blocking |

## MVP Unit Tests

- Typed configuration accepts required local/test inputs and rejects missing, unknown, conflicting, forbidden, or insecure production inputs.
- Password, JWT, session, tenant authorization, support grant, deterministic clock/UUIDv7, retry, redaction, safe error, registration isolation, and reset guards behave deterministically.
- Foundation Envelope `1.0` validates in Zod and Pydantic; `1.1`, unsupported majors, unknown fields, and invalid values fail.

## MVP Contract Tests

- Generate Zod, Pydantic, OpenAPI, manifest, and fixtures from or against the authoritative JSON Schema `1.0`.
- Prove identical required/optional fields, formats, patterns, unknown-field behavior, and version acceptance in TypeScript and Python.
- Drift fails when generated output differs.
- Writers emit `1.0`; no reader accepts `1.1` until an authoritative `1.1` schema is added.
- Consumer fixtures exist for Exam Creation, DOCX Ingestion, and AI Processing.
- Static checks prohibit feature orchestration/business rules.

## MVP Integration Tests

- PostgreSQL is migrated from empty/current supported state and pgvector is ready.
- Tenant transactions, concurrency, idempotency, outbox, audit, and reset isolation work against PostgreSQL.
- Authentication, refresh families, provisioning, RBAC, service identities, and support grants work against PostgreSQL.
- MinIO and R2-compatible adapters satisfy the shared private storage contract.
- Real Temporal workers prove bounded retry, heartbeat, cancellation, replay, duplicate delivery, and restart behavior.
- Health distinguishes dependency state and recovers after dependency return.

## MVP Frontend and E2E Tests

- Jest/Testing Library renders the content-free Foundation shell with the configured coverage threshold.
- Playwright reaches the minimal web shell without introducing feature behavior.

## MVP Security Tests

- Argon2id, Ed25519/EdDSA, `kid`, issuer/audience/expiry, refresh rotation/reuse/expiry/revocation, CSRF/cookie, provisioning, RBAC, service identity, support grant, tenant isolation, production fail-closed configuration, safe headers, and repository secret scanning pass.
- Prohibited keys and credential-like values are redacted in Node and Python utilities.
- Pull-request CI has read-only permissions and no production deployment secret or promotion step.

## MVP Migration and Rollback Tests

- Apply current migrations to an empty/current-supported PostgreSQL state.
- Verify pgvector readiness.
- Reject changed checksum, invalid ordering, and destructive cleanup in the active migration set.
- Verify deployment contracts use expand-first ordering, health gates, application rollback, forward correction, and no automatic destructive down migration.

Historical snapshot combinations, lock-contention certification, and production-like rolling migration are Production Hardening.

## MVP CI and Build Tests

- CI configuration contains locked install, format, lint, typecheck, contract drift, Node, frontend, E2E, Python, integration, security, build, and artifact-metadata gates.
- Mandatory integration requires `SIROMIX_ENV=test` and `SIROMIX_INTEGRATION=1`; the mandatory command fails when absent.
- Local format, lint, typecheck, contract drift, security scan, build, and all mandatory test commands pass.

## MVP Boundary Tests

- Database, routes, workflows, task queues, storage behaviors, contracts, and imports contain only Foundation-owned primitives.
- No DOCX, canonical, AI, Exam/Draft/Master/cap-request, mixing, publishing, vector, or RAG implementation exists.
- Registering a consumer/adapter/worker leaves unrelated owner catalogs unchanged.

## Production Hardening Tests

### Historical Migration Certification

- Exercise every retained historical snapshot, missing/out-of-order/partial state, lock contention, incompatible application/schema, rolling readers, rollback, and forward correction.

### Full Telemetry Certification

- Capture one flow through HTTP, Temporal, database/outbox, storage, provider adapter, audits, health, and CI-format output.
- Inject prohibited markers and assert none escape.

### Exhaustive Failure Injection

- Inject before startup, during side effect, before commit, after commit/before acknowledgement, during retry, and during shutdown for every shared dependency.

### Cross-Platform Certification

- Execute bootstrap, doctor, dev, health, stop, migrations, tests, build, reset safety, path/quoting/line-ending, port collision, unavailable Docker, and shutdown behavior on clean hosted Windows and Linux.

### Artifact and Deployment Certification

- Build content-addressed OCI images, migration/contract bundles, SBOMs, provenance, and scans from one clean commit.
- Promote unchanged references under external configuration.
- Exercise partial rollout, health gating, rollback, forward correction, incompatible-version rejection, and deferred cleanup.

### Operational Certification

- Verify release performance, dependency restarts, backup/restore, disaster recovery, scaling, and on-call readiness against approved production targets.

## Test Data

### MVP Release Gate

- Synthetic two-tenant users and Teacher/Tenant Admin/support/service/CI/deployment identities.
- Clock-controlled tokens, support grants, idempotency/outbox/audit records, and current migration state.
- Foundation Envelope `1.0` valid/invalid fixtures and three neighboring consumer fixtures.
- MinIO/R2-compatible opaque tenant object fixtures.
- Deterministic Temporal smoke/retry/cancel/replay/duplicate/restart fixtures.
- Local/test/production configuration matrices with fake secrets and prohibited markers.

### Production Hardening

- Historical/incompatible database snapshots, production-like telemetry and fault fixtures, clean hosted platform matrices, artifact/provenance/scan fixtures, and operational recovery evidence.

All fixtures are synthetic, non-sensitive, deterministic, and tenant isolated.

## Completion Criteria

### MVP Foundation Approved

- MVP-AC-001 through MVP-AC-018 each have at least one implemented, passing mapped test.
- All MVP mandatory test commands pass.
- Foundation Envelope readers and writers conform to authoritative schema `1.0` and reject `1.1`.
- No feature-owned behavior exists.
- No unresolved Constitution violation remains.
- Pulsar status is `Approved` for **MVP Foundation**.

Production Hardening items do not block this status.

### Production Ready

- MVP Foundation is approved.
- PH-AC-001 through PH-AC-007 pass with evidence tied to the release commit.
- Production environment, security, artifact, rollout, rollback, performance, backup/recovery, and operational decisions are approved.
- The designated release review records **Production Ready**.
