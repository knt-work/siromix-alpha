# Platform Foundation Tasks

## Task Summary

| Task ID | Task | Owner | Priority | Status |
|---|---|---|---|---|
| PF-001 | Scaffold the monorepo and pinned toolchain | Engineering | P0 | Pending |
| PF-002 | Build local Docker and bootstrap foundation | Engineering / DevOps | P0 | Pending |
| PF-003 | Implement database, tenancy, transaction, and outbox primitives | Backend | P0 | Pending |
| PF-004 | Implement Temporal client/worker foundation | Backend / Worker | P0 | Pending |
| PF-005 | Implement authentication, RBAC, tenancy, and service identities | Backend / Frontend | P0 | Pending |
| PF-006 | Implement object-storage interface and adapters | Backend / Worker | P0 | Pending |
| PF-007 | Implement shared contracts, configuration, and observability | Engineering | P0 | Pending |
| PF-008 | Implement deterministic testing and CI foundation | Engineering / DevOps | P0 | Pending |
| PF-009 | Implement artifact, deployment, migration, and rollback contracts | DevOps / Engineering | P1 | Pending |
| PF-010 | Document developer operation and verify readiness | Engineering | P0 | Pending |

## Implementation Tasks

- **IMP-001:** Create the BR-001 workspace layout and minimal buildable Next.js, NestJS, Python worker, and shared-package entry points.
- **IMP-002:** Pin Node LTS, Python 3.12, pnpm, uv, dependency locks, TypeScript/Python strict configuration, formatting/linting, import boundaries, and generated-file policy.
- **IMP-003:** Add cross-platform root commands for every BR-045 operation with safe non-interactive CI behavior.
- **IMP-004:** Implement prerequisite/config doctor, named startup readiness, actionable diagnostics, and machine-readable readiness report.
- **IMP-005:** Document architecture ownership and prohibit feature business behavior/import leakage through lint/static boundaries.

## Database Tasks

- **DB-001:** Configure PostgreSQL/pgvector and `packages/database` with Prisma schema/client/migrations and health validation.
- **DB-002:** Implement only Tenant, UserIdentity, TenantMembership, RefreshSession, ServiceIdentity, SupportGrant, IdempotencyRecord, OutboxEnvelope, AuditEnvelope, and migration metadata primitives.
- **DB-003:** Implement tenant-required transaction/query helpers, optimistic concurrency, UTC/stable-ID/money conventions, and existence-safe errors.
- **DB-004:** Implement idempotency acquisition/replay and transactional outbox persistence/claim/delivery primitives with failure injection.
- **DB-005:** Provide isolated parallel test databases/schemas, deterministic seed identities, reset guards, and empty/prior-state migration fixtures.
- **DB-006:** Define expand/contract migration checks, immutable checksum validation, compatibility gates, deployment ordering, and forward-correction rollback procedure.

## API Tasks

- **API-001:** Implement typed configuration bootstrap and safe liveness/readiness endpoints.
- **API-002:** Implement tenant-slug-plus-normalized-email authentication, tenant-local uniqueness, Argon2id minimum parameters/hash upgrade, Ed25519/EdDSA access JWTs with `kid` and 15-minute maximum lifetime, bounded signing-key rotation, seven-day-inactivity/30-day-absolute refresh-family rotation/revocation, cookie/CSRF policy, and privacy-safe errors.
- **API-003:** Implement tenant/RBAC/resource/action policy guards and tenant context propagation without feature permissions.
- **API-004:** Implement service-identity authentication and scoped workflow/worker/CI/deployment authorization.
- **API-005:** Implement support-grant create/approve/revoke/validate primitives without feature-specific content permission.
- **API-006:** Expose OpenAPI and versioned shared envelope contracts with generated/conformance-tested clients.
- **API-007:** Implement idempotent audited production provisioning for the first tenant/Tenant Admin by deployment identity and later tenant-scoped Teacher/Tenant Admin membership provisioning/deactivation, with deterministic identities restricted to local/test and no administration UI.

## Frontend Tasks

- **FE-001:** Create minimal Next.js shell, authentication/session client boundary, server-safe token handling, configuration, health integration, and no feature screen.
- **FE-002:** Provide reusable authorization/session hooks that are advisory only; preserve server authority.
- **FE-003:** Add component/test foundations for Tailwind, shadcn/ui, React Hook Form, Zod, Testing Library, and Playwright without implementing feature UI.

## Worker / Workflow Tasks

- **WW-001:** Configure Temporal local namespace/Web UI and NestJS client module.
- **WW-002:** Configure TypeScript and Python worker registration, scoped identities, queue naming/versioning, shutdown, health, heartbeat, cancellation, and tracing.
- **WW-003:** Define versioned workflow/activity envelopes and baseline retry helpers that feature specs may narrow.
- **WW-004:** Implement a content-free foundation smoke workflow/activity only.
- **WW-005:** Provide deterministic Temporal test environment, duplicate-delivery/replay/cancellation/failure controls, and privacy-safe telemetry.
- **WW-006:** Ensure no DOCX, AI, Exam Creation, mixing, or publishing workflow is registered.

## Storage Tasks

- **ST-001:** Define the versioned streaming `ObjectStorage` interface, stable opaque references, error taxonomy, health, lifecycle/legal-hold hooks, and failure injection.
- **ST-002:** Implement MinIO local/test and R2-compatible S3 adapters with contract parity.
- **ST-003:** Enforce private buckets, tenant-private opaque keys, safe metadata, authorized five-minute signed access, and existence-safe cross-tenant denial.
- **ST-004:** Provide isolated test prefixes/buckets and safe cleanup guards without feature retention/deduplication logic.

## Contracts / Configuration / Observability Tasks

- **CO-001:** Create authoritative JSON Schema/OpenAPI locations, schema version metadata, deterministic TypeScript/Python generation/conformance, fixtures, and drift checks.
- **CO-002:** Implement current/immediately-previous-compatible-minor consumer helpers and breaking-major dual-read readiness/rollback fixtures.
- **CO-003:** Implement process-specific typed configuration schemas, safe examples, secret redaction, forbidden-variable checks, and operational configuration version hooks.
- **CO-004:** Implement correlation/causation propagation, OpenTelemetry setup, Pino/structlog structured logging, safe errors, audit envelopes, and local exporters.
- **CO-005:** Implement sensitive-marker redaction verification across Node, Python, HTTP, Temporal, database/outbox, storage, health, errors, and CI output.

## Security / Operations Tasks

- **SO-001:** Configure least-privilege Compose networking, database/storage/Temporal credentials, process/service identities, and production security invariants.
- **SO-002:** Configure secure headers, CORS/origin validation, TLS-required production policy, cookie/CSRF policy, password/session controls, and credential rotation.
- **SO-003:** Configure dependency, container, and secret scanning with release-blocking findings according to documented severity policy.
- **SO-004:** Define production adapter bindings for supported hosting targets without selecting or deploying to one.
- **SO-005:** Produce content-addressed OCI images and migration/contract artifacts with commit provenance and SBOMs.
- **SO-006:** Document rollout health gates, migration order, rollback, forward correction, and disaster-safe configuration validation.

## Testing Tasks

- **TEST-001:** Implement every case in `test-spec.md` and maintain traceability to AC-001 through AC-028.
- **TEST-002:** Add clean-machine/bootstrap, exact Node.js 24/pnpm 10/Python 3.12/uv 0.8 tool-line validation, deterministic build/generation, NFR-001 reference-profile startup evidence, health, and Windows/CI parity suites.
- **TEST-003:** Add database migration, tenant isolation, transaction, concurrency, idempotency, outbox, audit, reset-safety, and pgvector-readiness suites.
- **TEST-004:** Add tenant-scoped identity/provisioning, Argon2id policy/upgrade, Ed25519 algorithm/`kid`/key rotation, access/refresh lifetime and family-reuse, session/CSRF, RBAC, service identity, support grant, secret, network, and cross-tenant security suites.
- **TEST-005:** Add Temporal and storage adapter contract, deterministic replay, retry, heartbeat, cancellation, duplicate delivery, failure, tenant, signed-access, and parity suites.
- **TEST-006:** Add contracts/configuration/compatibility/drift and observability/correlation/redaction suites across runtimes.
- **TEST-007:** Add CI command, scan, artifact provenance, deployment ordering, health verification, incompatible rollout, and rollback suites.
- **TEST-008:** Add static/runtime negative boundary tests proving no feature-owned behavior exists.

## Dependencies

- Docker Desktop or compatible Docker Engine/Compose for local development.
- Node.js 24 LTS, pnpm 10, Python 3.12, and uv 0.8, with repository-pinned exact patches.
- GitHub Actions for hosted CI.
- Container registry, production host, managed PostgreSQL, R2 account, secrets manager, domains, and telemetry destinations are deployment-time external decisions.

## Existing Feature Dependencies Satisfied

- **Exam Creation:** authentication/RBAC/tenant model; PostgreSQL/Prisma migration and private storage interfaces; Temporal client/runtime; versioned schema tooling; outbox/audit/idempotency; local parity; test/CI; observability; rollback foundation.
- **DOCX Ingestion:** authentication/RBAC/tenant contracts; private storage; PostgreSQL migrations; Temporal; ClamAV local connectivity; service identity; schema tooling; telemetry; test isolation; local parity. Parser sandbox and ingestion behavior remain feature-owned.
- **AI Processing:** authentication/RBAC/tenant model; PostgreSQL/outbox; Temporal; encrypted storage interface; schema tooling; provider-secret/configuration hooks; deterministic external-adapter test foundation; observability; migration/deployment/rollback. AI provider selection/calls/validation/cost remain feature-owned.

## Feature-Owned Dependencies Remaining

- **Exam Creation:** all workflow/Draft/Master/cap-request entities, endpoints, UI, preview, approval, feature permissions, retention, and acceptance tests.
- **DOCX Ingestion:** upload security policy, malware verdict handling, parser sandbox/job implementation, DOCX parsing/canonicalization, canonical assets/issues, feature workflows, retention/deduplication, and performance profile.
- **AI Processing:** provider adapter selection/invocation, prompts, Question JSON, grounding/domain validation, retry/repair/uncertain outcome, usage/cost/cap enforcement, processing entities/workflows, privacy allowlist, and performance profile.
- **Future features:** vector/RAG, mixing, and publishing remain entirely outside Foundation.

## Completion Checklist

- [x] Constitution check completed before implementation planning.
- [x] Related feature dependencies and ownership boundaries reconciled.
- [x] Non-user-facing status confirmed; Lyra review not required.
- [x] AC-001 through AC-028 each map to required tests.
- [ ] All AC-001 through AC-028 tests pass.
- [ ] Clean supported Windows and CI/Linux bootstrap succeeds.
- [ ] Local services/applications/workers become healthy without production credentials.
- [ ] Migration, authentication, tenancy, storage, Temporal, contracts, observability, security, test, CI, artifact, and rollback gates pass.
- [ ] No feature business behavior is implemented.
- [ ] Documentation and machine-readable readiness report are complete.
- [ ] Pulsar review status is `Approved`.
