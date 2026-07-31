# Platform Foundation Tasks

## Task Summary

### MVP Release Gate

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| MVP-PF-001 | Monorepo, pinned tools, local operation, and readiness | Engineering | P0 | Completed |
| MVP-PF-002 | Tenant-safe persistence and migrations | Backend | P0 | Completed |
| MVP-PF-003 | Temporal and worker foundation | Backend / Worker | P0 | Completed |
| MVP-PF-004 | Authentication, sessions, RBAC, and service identities | Backend | P0 | Completed |
| MVP-PF-005 | Private object-storage adapters | Backend / Worker | P0 | Completed |
| MVP-PF-006 | Authoritative contracts, configuration, and observability | Engineering | P0 | Correction required: contract readers must reject `1.1` |
| MVP-PF-007 | Deterministic tests, CI gates, and feature boundaries | Engineering / DevOps | P0 | Correction required: boundary checks must be owner-scoped |
| MVP-PF-008 | MVP documentation and evidence reconciliation | Engineering | P0 | In progress |

### Production Hardening

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| PH-PF-001 | Historical/concurrent migration certification | Backend / DevOps | P1 | Deferred — non-blocking |
| PH-PF-002 | Full telemetry traversal and capture | Engineering / DevOps | P1 | Deferred — non-blocking |
| PH-PF-003 | Exhaustive multi-service failure injection | Engineering / DevOps | P1 | Deferred — non-blocking |
| PH-PF-004 | Clean Windows/Linux lifecycle certification | DevOps | P1 | Deferred — non-blocking |
| PH-PF-005 | Hosted immutable artifact and promotion certification | DevOps | P1 | Deferred — non-blocking |
| PH-PF-006 | Production-like rollout/rollback certification | DevOps | P1 | Deferred — non-blocking |
| PH-PF-007 | Production performance and operational readiness | DevOps | P1 | Deferred — non-blocking |

## Implementation Tasks

### MVP Release Gate

- **MVP-IMP-001:** Maintain the pinned pnpm workspace and minimal Next.js, NestJS, Python worker, and shared-package entry points.
- **MVP-IMP-002:** Maintain cross-platform bootstrap/dev/stop/health/doctor/migration/test/build/readiness/reset commands and safe diagnostics.
- **MVP-IMP-003:** Maintain static/runtime boundaries that prohibit feature contracts, behavior, imports, re-exports, and registrations inside Foundation-owned modules; permit approved feature implementation only in declared owner packages/modules; reject unowned artifacts and unauthorized cross-owner dependencies.
- **MVP-IMP-004:** Correct generated TypeScript/Python readers and compatibility metadata so only authoritative Foundation Envelope `1.0` is accepted.

### Production Hardening

- **PH-IMP-001:** Certify complete lifecycle behavior on clean hosted Windows/Linux runners.

## Database Tasks

### MVP Release Gate

- **MVP-DB-001:** Maintain PostgreSQL/pgvector health, Prisma schema, ordered immutable migrations, and non-destructive rollback rules.
- **MVP-DB-002:** Maintain only approved shared identity/tenant/session/service/grant/idempotency/outbox/audit/migration models.
- **MVP-DB-003:** Maintain tenant-required transactions, optimistic concurrency, idempotency, outbox, append-only audit, UTC/UUIDv7 conventions, and isolated reset guards.
- **MVP-DB-004:** Test empty/current-supported migration, pgvector readiness, checksum/order protection, and destructive-cleanup rejection.

### Production Hardening

- **PH-DB-001:** Test every retained historical, missing, partial, out-of-order, incompatible, and concurrent migration state against PostgreSQL.
- **PH-DB-002:** Certify rolling old/new readers, application rollback, and forward correction in a production-like environment.

## API Tasks

### MVP Release Gate

- **MVP-API-001:** Maintain typed configuration and safe liveness/readiness.
- **MVP-API-002:** Maintain tenant-scoped login, Argon2id, Ed25519 tokens, refresh-family rotation/revocation, cookie/CSRF safety, and audited provisioning.
- **MVP-API-003:** Maintain tenant/RBAC/resource/action policies, service identities, and support grants without feature permissions.
- **MVP-API-004:** Expose the authoritative Foundation Envelope `1.0` contract and OpenAPI metadata.

### Production Hardening

- **PH-API-001:** Certify production ingress/TLS/origin/service-identity bindings.

## Frontend Tasks

### MVP Release Gate

- **MVP-FE-001:** Maintain a content-free Next.js shell and safe session/configuration boundary.
- **MVP-FE-002:** Maintain Jest/Testing Library and Playwright smoke foundations without feature UI.

### Production Hardening

- **PH-FE-001:** Certify production headers, origins, and browser deployment behavior.

## Worker / Workflow Tasks

### MVP Release Gate

- **MVP-WW-001:** Maintain Temporal client, TypeScript/Python worker registration, versioned queues, bounded retry, heartbeat, cancellation, shutdown, health, replay, and tracing envelopes.
- **MVP-WW-002:** Maintain only content-free smoke workflow/activity behavior.
- **MVP-WW-003:** Test retry, cancellation, duplicate delivery, replay, and restart against local Temporal.

### Production Hardening

- **PH-WW-001:** Certify full telemetry traversal and exhaustive Temporal dependency failure recovery.

## Storage Tasks

### MVP Release Gate

- **MVP-ST-001:** Maintain versioned streaming storage, private opaque tenant keys, signed access, lifecycle/legal-hold hooks, health, and safe errors.
- **MVP-ST-002:** Maintain MinIO and R2-compatible contract parity with isolated test prefixes.

### Production Hardening

- **PH-ST-001:** Certify production R2 bindings, lifecycle, legal hold, and exhaustive interruption/outage behavior.

## Contracts / Configuration / Observability Tasks

### MVP Release Gate

- **MVP-CO-001:** Treat JSON Schema `1.0` as authoritative and generate/conformance-test Zod, Pydantic, OpenAPI, metadata, and fixtures.
- **MVP-CO-002:** Reject `1.1` and unsupported majors until an authoritative compatible schema exists.
- **MVP-CO-003:** Maintain typed configuration, safe examples, forbidden-variable checks, and operational configuration version.
- **MVP-CO-004:** Maintain correlation carriers, Node/Python structured logging/redaction utilities, safe errors, and audit envelopes.
- **MVP-CO-005:** Keep `@siromix/contracts` Foundation-envelope-only and prevent it from importing or re-exporting feature contracts. Recognize the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts` as the DOCX Ingestion contract owner without making Foundation responsible for its schema or compatibility policy.

### Production Hardening

- **PH-CO-001:** Capture and verify complete trace/redaction behavior through real HTTP, Temporal, database/outbox, storage, provider, audit, health, and CI surfaces.
- **PH-CO-002:** Add future minor/major dual-reader rollout fixtures when those authoritative schemas are introduced.

## Security / Operations Tasks

### MVP Release Gate

- **MVP-SO-001:** Maintain least-privilege local networks/credentials, production fail-closed configuration, secure headers, session controls, and repository secret scanning.
- **MVP-SO-002:** Maintain CI gates without production deployment secrets on pull requests.
- **MVP-SO-003:** Maintain rollout order, compatibility verification, and non-destructive rollback contracts.

### Production Hardening

- **PH-SO-001:** Produce and retain clean hosted OCI images, SBOMs, provenance, container scans, migration/contract bundles, and deployment-verification evidence.
- **PH-SO-002:** Certify partial rollout, traffic gating, rollback, forward correction, deferred cleanup, backup/recovery, and operational response.

## Testing Tasks

### MVP Release Gate

- **MVP-TEST-001:** Implement every test mapped to MVP-AC-001 through MVP-AC-018.
- **MVP-TEST-002:** Run Node/Foundation, Jest/Testing Library, Playwright, Pytest, mandatory Docker integration, format, lint, typecheck, contract drift, security scan, and build.
- **MVP-TEST-003:** Fail mandatory integration when its explicit test profile is absent.
- **MVP-TEST-004:** Verify no feature-owned table, route, workflow, queue, contract, storage behavior, import, re-export, registration, or business rule exists inside Foundation-owned modules. Verify approved feature artifacts are allowed only in their declared owner packages/modules and reject unowned artifacts or unauthorized cross-owner dependencies.

### Production Hardening

- **PH-TEST-001:** Implement PH-AC-001 through PH-AC-007 before production deployment.

## Dependencies

- MVP local development: Docker Desktop/Engine with Compose, Node 24, pnpm 10, Python 3.12, uv 0.8, and Git.
- Production Hardening: hosted Windows/Linux CI, registry, production-like PostgreSQL/pgvector, R2, secrets manager, TLS/domains, telemetry, backup/recovery, and deployment environments.

## Existing Feature Dependencies Satisfied

- **Exam Creation:** shared auth/RBAC/tenancy, Prisma/PostgreSQL, private storage, Temporal, contracts, idempotency/outbox/audit, observability, testing, and rollback primitives remain MVP gates.
- **DOCX Ingestion:** shared authenticated tenant boundary, storage, PostgreSQL, Temporal, ClamAV connectivity, service identity, contracts, telemetry, and test isolation remain MVP gates.
- **AI Processing:** shared auth/RBAC/tenancy, PostgreSQL/outbox, Temporal, private storage, provider configuration hook, deterministic adapter/test foundation, contracts, and observability remain MVP gates.

No neighboring feature depends on exhaustive production certification to begin its approved MVP implementation.

## Feature-Owned Dependencies Remaining

All DOCX, canonicalization, AI, Draft/Master Exam, mixing, publishing, vector/RAG, feature permission, UI, workflow, retention, retry, and business-rule work remains feature-owned.

DOCX Ingestion contract artifacts are owned by the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`, not by Foundation's `@siromix/contracts`. The authoritative DOCX JSON Schema, compatibility metadata, TypeScript readers, and fixtures live in that feature package. Any generated Python worker binding must remain traceable to and conformance-tested against the feature-owned schema.

## Completion Checklist

### MVP Foundation Approved

- [x] Constitution and neighboring-spec alignment completed.
- [x] MVP and Production Hardening scopes separated.
- [x] MVP-AC-001 through MVP-AC-018 map to mandatory tests.
- [ ] Foundation Envelope runtime readers reject `1.1` and conform to authoritative schema `1.0`.
- [ ] Owner-scoped boundary tests permit approved feature packages while rejecting feature artifacts in Foundation-owned modules.
- [ ] All MVP mandatory tests pass after the contract correction.
- [ ] Pulsar status is `Approved` for **MVP Foundation**.

### Production Ready

- [ ] MVP Foundation is approved.
- [ ] PH-AC-001 through PH-AC-007 pass.
- [ ] Hosting, registry, managed data/storage, TLS/domains, secrets, telemetry, scaling, backup/recovery, and on-call decisions are approved.
- [ ] Pulsar or the designated release reviewer confirms **Production Ready**.
