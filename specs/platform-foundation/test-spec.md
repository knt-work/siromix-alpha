# Platform Foundation Test Specification

## Test Scope

Verify clean-machine project bootstrap, reproducible tools/dependencies, local runtime readiness, typed configuration, PostgreSQL/Prisma/pgvector, shared persistence primitives, Temporal foundations, authentication/RBAC/tenancy/service identities/support grants, storage adapters, contracts, observability/redaction, deterministic testing, CI, artifacts, deployment/rollback, Windows compatibility, failure recovery, and strict negative feature boundaries.

No feature business behavior is tested except negative ownership assertions and consumer-contract readiness.

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| AC-001 | Clean Windows/CI bootstrap creates locked buildable workspace | Bootstrap / Cross-platform | Pending |
| AC-002 | One local workflow starts all dependencies/apps/workers and reports readiness without production credentials | Local-parity / E2E | Pending |
| AC-003 | Repeated locked builds/generation are equivalent and drift is rejected | Determinism / Contract | Pending |
| AC-004 | Typed configuration and safe secret/example/rotation rules work | Unit / Security | Pending |
| AC-005 | Empty/prior migrations, pgvector, incompatibility, and rollback safety work | Migration / Integration | Pending |
| AC-006 | Tenant transactions, concurrency, idempotency, outbox, audit, conventions, and test isolation work | Unit / Integration | Pending |
| AC-007 | Temporal envelopes/queues/retries/heartbeat/cancel/tracing/replay/at-least-once foundations work without feature workflows | Workflow / Contract | Pending |
| AC-008 | Tenant-scoped login, cryptographic/session policy, provisioning, CSRF, service identities, and local-only deterministic identities work | Security / Integration | Pending |
| AC-009 | RBAC/tenant enforcement denies unauthorized/cross-tenant access without feature permissions or disclosure | Security / Integration | Pending |
| AC-010 | Support grants are scoped, approved, expiring/revocable, auditable, and default deny | Security / Time-based | Pending |
| AC-011 | MinIO/R2 adapters preserve private tenant-safe streaming/signed/lifecycle/failure contract parity | Storage Contract / Security | Pending |
| AC-012 | JSON Schema/Zod/Pydantic/OpenAPI generation/conformance/version/compatibility/drift works without business logic | Contract / Compatibility | Pending |
| AC-013 | Correlation/causation/trace context propagates across every shared boundary | Observability / Integration | Pending |
| AC-014 | All shared telemetry/CI surfaces redact prohibited data and secrets | Security / Observability | Pending |
| AC-015 | Safe liveness/readiness/health distinguishes and recovers dependency state | Integration / Recovery | Pending |
| AC-016 | Test frameworks/testkit/isolation/failure/coverage/gating execute deterministically | Test Infrastructure / Local-parity | Pending |
| AC-017 | GitHub Actions runs every required gate without untrusted deployment-secret exposure | CI / Security | Pending |
| AC-018 | Immutable content-addressed images/migration/contracts carry one-commit provenance and promote unchanged | Build / Artifact | Pending |
| AC-019 | Rollout order, version rejection, health verification, and non-destructive rollback preserve data/contracts | Deployment / Migration | Pending |
| AC-020 | All developer commands are documented and equivalent on Windows and CI/Linux | Developer E2E / Cross-platform | Pending |
| AC-021 | Reset is restricted to exact isolated test targets | Destructive-safety / Security | Pending |
| AC-022 | Twenty-run reference-profile startup evidence plus doctor/health timings meet defined thresholds | Performance | Pending |
| AC-023 | Failure injection across startup/shared dependencies is explicit, bounded, and loss/duplication safe | Fault Injection / Recovery | Pending |
| AC-024 | Password/JWT/key/session/provisioning/network/header/scan/identity security controls pass | Security / Integration | Pending |
| AC-025 | Static/runtime checks prove no feature business behavior exists | Boundary / Architecture | Pending |
| AC-026 | Consumer fixtures prove all declared existing feature dependencies are satisfied | Consumer Contract / Integration | Pending |
| AC-027 | Machine-readable readiness report is safe, complete, and versioned | Contract / Operations | Pending |
| AC-028 | New adapter/worker/contract registration leaves unrelated features/engines unchanged | Extensibility / Architecture | Pending |

## Clean-Machine and Bootstrap Tests

- Bootstrap from clean supported Windows PowerShell and CI/Linux environments using only documented prerequisites.
- Accept the pinned Node.js 24 LTS, pnpm 10, Python 3.12, and uv 0.8 lines and reject missing or incompatible tool lines, Docker, Compose, and unavailable daemon with actionable diagnostics.
- Verify exact workspace folders, strict configs, manifests, locks, minimal entry points, and root commands.
- Repeat install/build/generation and compare declared deterministic outputs.
- Verify WSL is optional and no command silently requires it.

## Local Startup and Health-Check Tests

- Start PostgreSQL/pgvector, Temporal/Web UI, MinIO, ClamAV, web, API, and workers from one documented root flow.
- Verify named liveness/readiness, safe URLs, dependency ordering, migration state, and local seed identities.
- Restart each dependency/application/worker independently and confirm correct readiness transitions and committed-state preservation.
- Run without production credentials and prove no production endpoint is contacted.
- Stop and restart idempotently without orphaned required processes or corrupt volumes.

## Configuration-Validation Tests

- Required, optional/default, forbidden, malformed, conflicting, environment-specific, and unknown configuration cases for every process.
- `.env.example` secret scanning and browser-public variable allowlist.
- Secret rotation/config reload or safe restart behavior without source changes.
- Operational configuration version hook and unsupported configuration rejection.
- Windows path/quoting/line-ending cases.

## Migration and Rollback Tests

- Migrate from empty database and every declared supported prior state.
- Verify pgvector extension presence and fail clearly when unavailable.
- Detect changed checksum, missing/out-of-order migration, partial application, incompatible application/schema, and lock/concurrency conflict.
- Exercise expand migration, compatible old/new readers, application rollback, forward correction, and deferred cleanup.
- Prove no automatic destructive down migration runs in deployment rollback.
- Validate migration artifact/commit provenance.

## Database Isolation and Transaction/Outbox Tests

- Tenant-required queries and transactions; cross-tenant attempts return non-disclosing denial.
- Optimistic-concurrency success/conflict, UTC timestamps, stable IDs, and money conventions.
- Idempotency first/in-progress/replay/hash mismatch/expiry/concurrent delivery.
- Atomic domain-placeholder change plus outbox envelope; failure before/after commit and duplicate publisher/consumer delivery.
- Append-only audit envelope and safe metadata.
- Parallel isolated test database/schema/prefix behavior and guarded reset.
- Assert no feature-owned table exists.

## Temporal Workflow/Activity Foundation Tests

- Versioned envelope and task-queue naming/ownership validation.
- TypeScript and Python worker registration, scoped identity, graceful shutdown, health, and wrong-queue denial.
- Baseline activity retry exact counts/backoff; stricter feature override; prohibited silent broadening.
- Heartbeat timeout, cancellation, deadline, correlation/tracing, duplicate activity delivery, worker restart, and at-least-once convergence.
- Deterministic replay and version compatibility.
- Foundation smoke workflow carries no feature payload or behavior.

## Object-Storage Adapter Contract Tests

- Run identical put/get-stream/head/delete, health, signed access, lifecycle/legal-hold hook, and failure cases against MinIO and R2-compatible contract fixtures.
- Private-by-default buckets, opaque tenant-private keys, no filenames/raw hashes, and existence-safe cross-tenant denial.
- Signed method/object/purpose scope and expiry at/below five minutes.
- Missing/corrupt object, interrupted stream, timeout, unavailable adapter, duplicate write, cleanup guard, and parity.
- Assert no canonical-asset, publishing-artifact, feature retention, or deduplication behavior.

## Authentication, RBAC, Service-Identity, Support-Grant, and Tenant Tests

- Tenant-slug-plus-normalized-email login, tenant-local email uniqueness, permitted same-email identities in separate tenants, non-disclosing invalid/locked identity behavior, and timing-safe failure.
- Argon2id password creation/verification uses at least 19 MiB memory, two iterations, and parallelism one; successful login upgrades an outdated hash policy.
- Access JWT issuer/audience/tenant/subject/role/scope/expiry/signature validation, Ed25519/EdDSA-only enforcement, required known `kid`, 15-minute maximum lifetime, current/previous verification-key rotation, and algorithm-substitution rejection.
- Refresh credentials have at least 256 bits of entropy, are stored only as keyed hashes, rotate on every use, expire after seven days inactivity or 30 days absolute, revoke the family on confirmed reuse, and handle concurrent refresh/logout safely.
- Production provisioning permits an authorized deployment identity to idempotently create the first tenant/Tenant Admin and a tenant-scoped Tenant Admin to create/deactivate only that tenant's Teacher/Admin memberships; verify audit, authorization, cross-tenant denial, and rejection of deterministic/default production credentials.
- Secure/HttpOnly/SameSite production cookie, no localStorage access token, CSRF, CORS/origin, and secure headers.
- Teacher, Tenant Admin, platform support, workflow service, worker, CI, deployment, unauthorized, wrong-audience, and revoked identities.
- Server-side tenant/resource/action enforcement and non-disclosing cross-tenant denial.
- Support grant approval, four-hour maximum default, scope, expiry, revocation, audit, cross-tenant/secret denial, and no feature permission invention.
- Deterministic local identities are unavailable in production mode.

## Contract Versioning and Compatibility Tests

- Authoritative JSON Schema fixtures validate equally through TypeScript/Zod and Python/Pydantic boundaries.
- Deterministic generation/conformance and committed/ignored output policy.
- Current writer, current/previous-compatible-minor readers, unsupported version, additive change, breaking-major dual-read readiness, and rollback matrix.
- OpenAPI transport drift and consumer fixtures for all three existing features.
- Static checks prohibit orchestration/business rules in shared contracts.

## Logging, Metrics, Tracing, Audit, and Redaction Tests

- Correlation/causation/trace propagation through HTTP, Temporal, database/outbox, storage, and provider fake.
- Node/Python structured field/schema consistency and safe exception serialization.
- Inject sensitive markers into source-like content, prompts, questions, answers, raw responses, asset bytes, passwords/tokens/secrets, signed URLs, object keys, database errors, workflow errors, and CI commands; assert absence from telemetry/output.
- Telemetry exporter outage never blocks core correctness and is reported safely.
- Liveness/readiness responses and audit envelopes contain only allowlisted safe fields.

## Secret and Security-Configuration Tests

- Repository/image/build-log secret scanning.
- Least-privilege Compose networks, ports, database/storage/Temporal users, and worker/service scopes.
- Production TLS-required and insecure-cookie/config fail-closed behavior.
- Dependency/container scan gates with documented severity thresholds and suppression metadata/expiry.
- Malicious configuration/log injection and unsafe error-path tests.
- SBOM/provenance generation and integrity.

## Deterministic Local-Adapter Parity Tests

- Database, Temporal, MinIO/R2 contract adapter, authentication, clock/ID, provider fake, and telemetry substitutes expose production-compatible normalized contracts and meaningful failures.
- No local-only branch changes persisted schema, authorization, task behavior, or error taxonomy.
- Production integration profiles are opt-in, credential-gated, isolated, and excluded from deterministic main tests.

## CI Command and Build Tests

- Run format, lint, typecheck, generated drift, unit, contract, integration, workflow, migration, security, build, smoke, and scan commands in clean CI.
- Verify lockfile-frozen install, cache-independent correctness, artifact checksums, commit provenance, and no dirty generated output.
- Pull-request jobs receive no production deployment secrets and cannot publish production artifacts.
- Failure in any mandatory correctness/security gate blocks artifact promotion.

## Windows-Compatible Developer-Workflow Tests

- Execute bootstrap, dev, stop, health, doctor, migrations, tests, build, and guarded reset in PowerShell.
- Paths with spaces, quoting, CRLF/LF, Ctrl+C shutdown, Docker Desktop not running, port collisions, and long-path diagnostics.
- Verify equivalent observable outcomes in CI/Linux.
- Optional WSL path works only as documented and is not a prerequisite.

## Failure Injection Tests

Inject failure before startup, during side effect, before commit, after commit/before acknowledgement, during retry, and during shutdown for:

- configuration validation
- PostgreSQL connection/migration/transaction
- pgvector readiness
- idempotency acquisition/replay
- outbox persistence/publish/acknowledgement
- Temporal client/server/worker/activity
- MinIO/object stream/signed access
- authentication/session rotation
- telemetry exporter
- image build/artifact generation
- health verification and deployment rollout

Each case asserts stable classification, bounded recovery, preserved committed state, no duplicate effect, safe output, and supported next action.

## Deployment Artifact, Rollout, and Rollback Tests

- Build content-addressed web/API/worker images, migration bundle, contract bundle, SBOM, and provenance from one commit.
- Promote unchanged artifacts under different external configuration.
- Reject mismatched artifact/config/schema/task-queue/contract versions.
- Apply expand-first order, verify health, simulate partial rollout, roll back application artifact, and forward-correct migration.
- Prove cleanup migrations are deferred and destructive rollback is never automatic.

## Performance and Reliability Tests

- On the NFR-001 Windows reference profile, capture 20 independent cached starts from stopped SiroMix services with retained volumes and assert at least 19 reach readiness within five minutes; record every duration, median/P95, and tool/image versions.
- Verify the reference profile has at least eight logical CPU cores, 16 GiB host RAM, SSD storage, and Docker Desktop allocation of four CPU cores and 8 GiB RAM, or mark the performance run ineligible rather than reporting a pass.
- Measure `doctor` and `health` independently against their 30-second and 10-second limits.
- Report first-run dependency/image download timing separately and exclude it from cached-start results.
- Restart each application, worker, and shared dependency and verify committed data survives and readiness converges without manual repair.

## Boundary Tests

- Static import/schema/table/route/workflow/task-queue scan rejects DOCX, canonical, AI, Question JSON, Exam/Draft/Master/cap-request, mixing, or publishing implementation.
- Runtime route/workflow/storage/database inventories contain only Foundation-owned primitives.
- Shared packages contain envelopes/interfaces/utilities, not feature retry policy, retention, authorization decisions, validation rules, or orchestration.
- Consumer fixture registration adds no dependency from unrelated engines.

## Error Case Tests

- Every Section 12 case produces the specified safe failure behavior and recovery.
- Unknown startup/shared-infrastructure failures fail closed, report a correlation ID, and expose no secret/customer content.
- Recovery after dependency return converges without manual record mutation.

## Test Data

- Synthetic two-tenant users/memberships and Teacher/Admin/support/service/CI/deployment identities.
- Clock-controlled access/refresh tokens, support grants, idempotency records, outbox/audit envelopes, and migration states.
- Versioned shared-envelope and three-feature consumer fixtures.
- MinIO/R2-compatible object fixtures with opaque keys and sensitive markers.
- Deterministic Temporal workflow/activity and failure fixtures.
- Configuration matrices for local/test/staging/production and Windows/CI.
- Clean/prior/incompatible database snapshots.
- Fake secret, signed URL, content, question/answer, prompt, and raw-response markers for redaction.
- Artifact/provenance/SBOM and rollout compatibility fixtures.

All fixtures are synthetic, non-sensitive, deterministic, and tenant isolated.

## Completion Criteria

- AC-001 through AC-028 each have at least one implemented, passing mapped test.
- Clean Windows and CI/Linux bootstrap/start/health/test/build workflows pass.
- Mandatory migration, persistence, Temporal, storage, auth/RBAC/tenant, contracts, observability/redaction, security, local-parity, CI, artifact, deployment, rollback, and boundary suites pass.
- No production credential or live production dependency is required by deterministic tests.
- No feature-owned table, endpoint, workflow, task queue, storage behavior, or business rule exists.
- Required correctness, security, privacy, tenant-isolation, migration, contract, idempotency, and destructive-safety tests are release-blocking.
- Machine-readable readiness report confirms supported tools, dependencies, migrations, contracts, tests, and artifacts without sensitive values.
- Every confirmed foundation defect gains a regression test.
