# Platform Foundation Specification

## 1. Objective

Establish the minimum shared repository, runtime, security, persistence, workflow, storage, contract, observability, testing, CI, and developer-experience foundation required to implement DOCX Ingestion, AI Processing, and Exam Creation without inventing cross-cutting architecture or duplicating feature behavior.

Platform Foundation succeeds when a developer can bootstrap and verify the complete local platform from a clean supported machine, shared infrastructure contracts behave consistently across environments, and feature teams can implement their approved specifications without redefining authentication, tenancy, storage, database, Temporal, configuration, telemetry, testing, or deployment primitives.

## 2. Context

The repository currently contains specifications but no application scaffold, dependency manifests, runtime configuration, migrations, containers, tests, or CI. The three implementation-ready feature specifications assume shared dependencies that do not yet exist.

Platform Foundation is a non-user-facing enabling feature governed by SiroMix Constitution v1.1.0, particularly contract-first boundaries, reliable/idempotent processing, least privilege, testable correctness, local-first development, production parity, versioned schemas, rollback safety, and MVP discipline.

Related feature behavior remains owned by its feature specification. Foundation supplies primitives and interfaces, not DOCX validation/canonicalization, AI requests or validation, Draft/Master lifecycle, mixing, or publishing.

**Specification Status:** Implementation Ready. No Lyra review is required because this feature introduces no end-user or standalone administrative workflow.

**Post-Design Constitution Check:** Passed against Constitution v1.1.0. The selected foundation is a modular monolith plus independently deployable workers, not premature microservices; preserves engine boundaries; externalizes configuration; supports local parity; and defines measurable, testable, migration-safe infrastructure contracts.

## 3. Related Specifications

- **Exam Creation:** `/specs/exam-creation/spec.md`, `tasks.md`, and `test-spec.md` depend on authentication/RBAC, tenancy, PostgreSQL migrations, private storage, Temporal orchestration, versioned validation contracts, observability, audit, local parity, and rollback.
- **DOCX Ingestion:** `/specs/docx-ingestion/spec.md`, `tasks.md`, and `test-spec.md` depend on authenticated commands, private object storage, PostgreSQL, Temporal-compatible workers, ClamAV connectivity, parser isolation, versioned schema tooling, telemetry, and tenant-safe lifecycle hooks.
- **AI Processing:** `/specs/ai-processing/spec.md`, `tasks.md`, and `test-spec.md` depend on authentication/RBAC, tenant context, PostgreSQL/outbox, Temporal, encrypted storage, schema tooling, provider-secret management, deterministic local adapters, telemetry, and deployment compatibility.
- **Constitution:** `/specs/constitution.md` is controlling for all conflicts.
- **Repository instructions:** `/AGENTS.md` fixes the approved technology families and SDD role boundaries.

Cross-spec resolutions:

- Foundation owns shared primitives; feature specs own business entities, workflows, states, limits, retry policies, and UI.
- Feature retry rules override foundation defaults only by becoming stricter or through an explicit approved specification.
- Foundation provides pgvector availability but no embeddings, indexes, retrieval, or RAG behavior.
- Foundation provides audit/outbox primitives but does not define feature audit-event meanings.
- Foundation provides object lifecycle hooks but feature specs define retention schedules and reference semantics.
- Foundation provides support-grant mechanics; feature specs define which content/actions a grant permits.

## 4. User Roles

Platform Foundation defines identity types and enforcement primitives:

- **Teacher:** interactive tenant member; receives only feature permissions explicitly granted by feature specifications.
- **Tenant Admin:** interactive tenant administrator; receives only tenant administration and feature permissions explicitly specified.
- **Platform support:** platform operator with no customer-content access by default; content access requires a current time-limited, tenant/resource/action-scoped support grant.
- **Workflow service:** non-human service identity allowed to start/query only registered workflow contracts.
- **Worker service:** non-human service identity allowed to poll assigned task queues and access only required database/storage/provider resources.
- **CI/deployment identity:** non-human identity restricted to build, migration, deployment, and verification operations for an environment.
- **Unauthenticated/unauthorized principal:** receives no tenant or private-resource access.

Foundation defines no feature permission such as upload, regenerate, approve, mix, or publish.

## 5. Business Rules

- **BR-001 — Repository model:** Use one pnpm workspace monorepo with `apps/web`, `apps/api`, `workers/document-ai`, `packages/contracts`, `packages/config`, `packages/database`, `packages/observability`, `packages/testkit`, `infra/docker`, and `docs`. Feature modules remain inside their owning application/worker boundary until an approved need justifies extraction.
- **BR-002 — Runtime baseline:** Use Node.js 24 LTS for Next.js/NestJS tooling, pnpm 10, Python 3.12, and `uv` 0.8. The repository pins an exact supported patch of each tool through committed tool metadata and lockfiles; clean bootstrap rejects a different major/minor line. Patch upgrades within these lines require a reviewed dependency-update change that updates the pins, locks, compatibility evidence, and readiness report.
- **BR-003 — Applications:** `apps/web` is Next.js with TypeScript, Tailwind CSS, and shadcn/ui; `apps/api` is NestJS with TypeScript, REST, Prisma, and Temporal Client; `workers/document-ai` is Python with Temporal Python SDK and Pydantic.
- **BR-004 — Dependency management:** JavaScript/TypeScript uses pnpm workspaces with one root `pnpm-lock.yaml`. Python uses `uv` with one committed lock for the worker workspace. Runtime dependencies may not be installed implicitly by startup scripts.
- **BR-005 — Naming/imports:** TypeScript uses strict mode, kebab-case folders, PascalCase exported types/classes, camelCase values, and workspace package imports rather than cross-application relative imports. Python uses snake_case modules/functions, PascalCase classes, and explicit package imports. Circular cross-package dependencies are prohibited.
- **BR-006 — Generated artifacts:** Contract-generated TypeScript/Python models, Prisma client output, API metadata, and test reports have declared source, command, owner, and output path. Generated files are either reproducibly committed by policy or ignored; the same artifact may not be partly hand-edited.
- **BR-007 — Local startup:** One documented root command starts required Docker services, applies/validates migrations, prepares deterministic local identities/data, and starts web, API, and registered workers. Start is idempotent and fails with actionable diagnostics when prerequisites are missing.
- **BR-008 — Local services:** Docker Compose supplies PostgreSQL with pgvector, Temporal, Temporal Web UI, MinIO, and ClamAV. Application processes may run on the host for fast development; CI may run them in containers. No production credential is required locally.
- **BR-009 — Environment parity:** Local, test, staging, and production use the same application contracts, migration mechanism, task-queue rules, configuration schema, storage interface, authentication token contract, telemetry schema, and health checks. Differences are external values/adapters, not source branches.
- **BR-010 — Database ownership:** PostgreSQL is the system database. Prisma schema/migrations and database client live in `packages/database`. Feature specs own feature tables and invariants; Foundation owns only shared identity/tenant/membership/service identity/support grant, idempotency, outbox, audit-envelope, and migration metadata primitives.
- **BR-011 — pgvector:** The extension is installed and health-checked in local/test and declared as a production database prerequisite. Foundation creates no vector column/index, embedding, retrieval, or RAG behavior.
- **BR-012 — Stable data conventions:** Persisted identifiers use RFC 9562 UUIDv7 consistently across TypeScript and Python. Random or deterministic test generators must preserve valid UUIDv7 layout and ordering semantics. Timestamps are timezone-aware UTC. Mutable shared records use optimistic concurrency. Money uses integer minor units or fixed-precision decimals with explicit currency.
- **BR-013 — Tenant enforcement:** Every tenant-owned database record includes tenant scope or an immutable parent that enforces it. Request/workflow/storage context carries tenant ID server-side. Repository/query helpers require tenant scope, and cross-tenant access is denied without existence disclosure.
- **BR-014 — Transactions/outbox:** Shared transaction helpers atomically persist domain changes and an outbox envelope. Consumers are idempotent and at-least-once safe. Foundation does not define feature event payload semantics.
- **BR-015 — Idempotency:** Shared idempotency primitives support tenant/operation/key scope, request hash, in-progress/completed/failed outcome, authoritative expiry, and replay. Feature specs define key scope and retention where stricter.
- **BR-016 — Migration safety:** Migrations are immutable after shared use, ordered, reviewed, tested from empty and prior supported state, backward compatible for rolling deployment, and separated from destructive cleanup. Production rollback uses application rollback plus forward corrective migration; down migrations are test aids only unless explicitly proven safe.
- **BR-017 — Temporal local/runtime:** Local Compose provides Temporal and Web UI. NestJS owns the client boundary. TypeScript and Python workers register through explicit modules with versioned workflow/activity contracts.
- **BR-018 — Task queues:** Queue names follow `siro-{environment}-{domain}-v{major}`. Each queue has one owning feature/domain and an allowlisted worker identity. Foundation provides a smoke-test queue only; it does not register feature workflows.
- **BR-019 — Retry foundation:** Workflows have no blind workflow-level retry. The shared activity baseline is exponential backoff with at most three total attempts, one-second initial interval, factor 2, and 30-second maximum interval. A feature must classify retryability and may narrow this; broader retries require an approved spec.
- **BR-020 — Workflow reliability:** Shared contracts carry workflow/attempt, tenant, correlation, causation, idempotency, schema, and deadline data. Workers support heartbeats for long activities, cancellation propagation, deterministic replay, privacy-safe tracing, and at-least-once delivery.
- **BR-021 — Authentication choice:** MVP authentication is a custom NestJS-owned JWT/session system so local development and production share the same contract without a required third-party identity service. Interactive login requires tenant slug plus normalized email; email uniqueness is enforced within a tenant, and the same email may belong to different tenants without linking their identities. Passwords use Argon2id with at least 19 MiB memory, two iterations, and parallelism one; stored hashes include parameters and are upgraded after successful authentication when policy increases. Access JWTs use EdDSA with Ed25519 keys, a required `kid`, and a 15-minute maximum lifetime. Verification accepts only the configured current signing key and explicitly retained previous verification keys during bounded rotation; algorithm substitution is rejected.
- **BR-021A — Refresh sessions and provisioning:** Refresh credentials are opaque 256-bit random values stored only as keyed hashes, rotate on every use, expire after seven days of inactivity and 30 days absolute, and revoke the complete token family on confirmed reuse. Foundation provides an idempotent, audited, server-side provisioning command/API: an authorized deployment identity creates the first tenant and Tenant Admin; thereafter a Tenant Admin may create/deactivate identities and Teacher/Tenant Admin memberships only within that tenant. Production provisioning requires explicit tenant and identity inputs and never uses deterministic/default credentials. Local/test bootstrap alone may create documented deterministic identities. No invitation, password-reset, MFA, SSO, email-delivery, or administration UI is included.
- **BR-022 — Browser token safety:** Refresh credentials use Secure, HttpOnly, SameSite cookies in non-local environments; access tokens are not persisted in browser local storage. CSRF protection applies to cookie-authenticated mutations. Local exceptions are explicit safe configuration, never production fallbacks.
- **BR-023 — Authorization:** NestJS guards/policies enforce role, tenant, resource, and action server-side. Next.js may hide unavailable actions but is never authoritative. Denials are privacy-safe and auditable when security-relevant.
- **BR-024 — Service authentication:** Workflow, worker, CI, and deployment identities use environment-scoped credentials with audience, issuer, scope, expiry, rotation, and revocation. Human tokens cannot substitute for worker credentials. Local deterministic service identities are test/development only.
- **BR-025 — Support grants:** A shared grant records tenant, resources/actions, support actor, approving Tenant Admin or authorized governance actor, reason, start/expiry, revocation, and audit references. Default duration is at most four hours unless a stricter feature rule applies. No grant permits cross-tenant access or secret access.
- **BR-026 — Object storage:** A versioned `ObjectStorage` interface supports put/get-stream/head/delete, authorized signed access, existence-safe errors, lifecycle tags, legal-hold hooks, and deterministic failure injection. MinIO is the local/test adapter; Cloudflare R2-compatible S3 is the production-target adapter.
- **BR-027 — Storage privacy:** Buckets/namespaces are private by default. Object keys use opaque tenant-private prefixes and stable object IDs, never filenames, user data, or raw content hashes. Signed access is single-purpose, least privilege, and expires in at most five minutes unless a feature specifies a stricter duration.
- **BR-028 — Storage lifecycle boundary:** Foundation exposes deletion, recoverable-state, reference-check, lifecycle, and legal-hold hooks. Feature owners define actual retention, recoverability, deduplication, and reference semantics. Storage adapters never infer feature deletion.
- **BR-029 — Configuration:** Every process validates typed configuration at startup and distinguishes required, optional-with-default, and forbidden values. Configuration errors fail before accepting work. `.env.example` contains names and safe examples only.
- **BR-030 — Secrets:** Secrets are supplied through environment/platform secret bindings, never committed, logged, exposed to the browser, embedded in images, or placed in contract fixtures. Secret values support rotation without source changes. CI secret scanning blocks release.
- **BR-031 — Operational configuration:** Any configuration affecting compatibility, security classification, retries, pricing, provider privacy, or deterministic output has an explicit version recorded by its owning feature. Foundation supplies the versioning mechanism only.
- **BR-032 — Shared contracts:** `packages/contracts` contains versioned JSON Schemas, OpenAPI-derived transport types, stable envelope types, compatibility metadata, and fixtures. It contains no feature orchestration or hidden business decisions.
- **BR-033 — Contract sources:** JSON Schema is authoritative for cross-runtime persisted/message contracts. Zod validates TypeScript boundaries and Pydantic validates Python boundaries against generated or conformance-tested models. Contract generation must be deterministic and drift-checked.
- **BR-034 — Compatibility:** Writers emit the current version. Readers support the current and immediately previous compatible minor where required by owning specs. Breaking majors require dual-read-before-write rollout, consumer readiness, migration plan, and rollback matrix.
- **BR-035 — Observability:** OpenTelemetry defines trace propagation and metrics; NestJS uses Pino structured logging and Python uses structlog. Correlation and causation propagate across HTTP, Temporal, database/outbox, storage, and provider adapters.
- **BR-036 — Telemetry privacy:** Ordinary logs, metrics, traces, errors, health responses, and audit envelopes never contain complete source/canonical content, prompts, questions, options, answers, raw provider responses, asset bytes, passwords/tokens/secrets, signed URLs, or sensitive object keys.
- **BR-037 — Audit foundation:** Shared audit envelopes record stable ID, tenant where applicable, actor/service, event type owned by a feature, target references, timestamp, correlation/causation, and minimal safe metadata. Audit records are append-only; feature specs define retention and content.
- **BR-038 — Health:** Each service exposes liveness and readiness separately. Readiness checks only dependencies required to accept that service's work and returns safe component status without credentials, topology secrets, or customer data.
- **BR-039 — Test foundation:** Jest supports TypeScript unit/integration tests, Testing Library supports components, Playwright supports browser E2E, and Pytest supports Python. Shared testkit supplies deterministic clocks/IDs, tenant fixtures, database isolation, MinIO/Temporal/provider fakes, failure injection, and sensitive-marker assertions.
- **BR-040 — Test isolation:** Automated tests never depend on production credentials or live production services. Parallel tests use isolated database schemas/databases, object prefixes, Temporal namespaces/task queues, and tenant IDs. Production-provider/infrastructure tests are separately gated.
- **BR-041 — Coverage/release gates:** Coverage is collected per application/package. Business-critical units target at least 90% where feature specs require it. Contract, migration, tenant isolation, authorization, security, idempotency, and redaction failures always block release regardless of aggregate coverage.
- **BR-042 — CI:** GitHub Actions runs deterministic install/lock verification, formatting, lint, type check, generated-contract drift, unit, contract, integration, workflow, migration, security/secret/dependency/container scans, builds, and smoke tests. Pull requests receive no deployment credentials by default.
- **BR-043 — Artifacts:** CI produces immutable, content-addressed OCI images for web, API, and workers plus migration and contract artifacts tied to one commit. The same validated artifacts are promoted; environment configuration is external.
- **BR-044 — Deployment:** Foundation defines container/runtime contracts for Railway, Render, Fly.io, Cloud Run, or VPS without selecting a production host. Deployment order is expand migrations, compatible API/workers, web, verification, then deferred cleanup. Rollback never runs destructive down migration automatically.
- **BR-045 — Developer commands:** Root commands cover `bootstrap`, `dev`, `stop`, `health`, `db:migrate`, `db:validate`, `test`, `test:integration`, `test:e2e`, `lint`, `typecheck`, `build`, `reset:test-data`, and `doctor`. Names map to documented non-interactive scripts.
- **BR-046 — Windows:** Native Windows PowerShell development is supported with Docker Desktop and pinned host runtimes. WSL is optional and not required. Scripts use cross-platform Node/Python entry points or provide equivalent PowerShell-safe wrappers.
- **BR-047 — Documentation:** Prerequisites, architecture map, commands, ports, environment variables, migrations, local identities, troubleshooting, data reset, CI gates, deployment artifacts, and rollback are documented and versioned with the code.

## 6. Functional Requirements

- **FR-001 — Scaffold workspace:** Create the BR-001 layout, pinned tool metadata, dependency manifests/locks, strict language configuration, boundary rules, generated-output policy, and minimal buildable web/API/worker/package entry points.
- **FR-002 — Bootstrap locally:** Validate prerequisites, materialize safe local configuration, start Compose dependencies, wait on health, apply/validate migrations, seed deterministic local identities, and start application processes through documented root commands.
- **FR-003 — Compose dependencies:** Provide PostgreSQL/pgvector, Temporal/Web UI, MinIO, and ClamAV with pinned images, private/default-safe networking, persistent development volumes, health checks, and deterministic test profiles.
- **FR-004 — Configure applications:** Validate the same typed configuration schema per process and environment, expose safe `.env.example` files, reject forbidden/missing values, and support secret rotation/config versioning.
- **FR-005 — Provide persistence:** Provide Prisma client/migrations, tenant-aware transaction helpers, optimistic concurrency, idempotency, outbox, audit envelope, UUID/time/money conventions, test isolation, and pgvector readiness without feature tables.
- **FR-006 — Provide Temporal boundary:** Provide NestJS client, TypeScript/Python worker registration, versioned workflow/activity envelopes, task-queue helpers, retry/cancellation/heartbeat/tracing defaults, deterministic test environment, and a foundation smoke workflow only.
- **FR-007 — Provide authentication:** Implement the BR-021 through BR-025 identity/session, provisioning, RBAC/policy, tenant context, service identity, local seed identity, signing-key and refresh-session rotation/revocation, support-grant, CSRF, and audit primitives.
- **FR-008 — Provide object storage:** Implement versioned MinIO and R2-compatible adapters, private opaque keys, streaming operations, authorized signed access, lifecycle/legal-hold hooks, health, failure injection, and tenant isolation.
- **FR-009 — Provide shared contracts:** Establish authoritative JSON Schema/OpenAPI ownership, deterministic TypeScript/Python model generation or conformance, version metadata, fixtures, drift checks, compatibility tests, and consumer-test hooks.
- **FR-010 — Provide observability:** Establish structured logs, OpenTelemetry trace/metric propagation, safe errors, audit envelopes, health/readiness, local inspection, and redaction/sensitive-marker verification.
- **FR-011 — Provide test infrastructure:** Configure Jest, Testing Library, Playwright, Pytest, deterministic testkit, isolated dependencies, failure injection, coverage, and separately controlled production integration profiles.
- **FR-012 — Provide CI:** Implement GitHub Actions gates, locked/reproducible installs, caches that do not affect correctness, security scanning, migration checks, image builds, smoke tests, and artifact provenance.
- **FR-013 — Provide deployment contracts:** Build immutable OCI/migration/contract artifacts, define promotion inputs, migration/rollout/health verification order, environment binding, and non-destructive rollback.
- **FR-014 — Document developer operation:** Document prerequisites and every BR-045 command, clean-machine bootstrap, Windows usage, optional WSL, ports, local identities, troubleshooting, reset safety, CI, artifacts, and rollback.
- **FR-015 — Publish foundation readiness:** Produce a machine-verifiable foundation health/contract report showing supported runtime/tool versions, dependency health, migration state, contract drift state, test status, and artifact identities without sensitive values.

## 7. Non-Functional Requirements

- **NFR-001 — Bootstrap performance:** The reference developer profile is Windows 11, an x86-64 CPU with at least eight logical cores, 16 GiB host RAM, SSD storage, and Docker Desktop allocated at least four CPU cores and 8 GiB RAM. With dependencies/images cached, Docker running, service volumes retained, and all SiroMix services initially stopped, measure 20 independent `dev` starts using the documented readiness endpoint; at least 19 must reach all required ready states within five minutes. Record individual durations, tool/image versions, and median/P95 calculation. First-run download time is measured and reported separately and does not count toward this target.
- **NFR-002 — Command responsiveness:** `doctor` reports local prerequisite/configuration problems within 30 seconds excluding Docker daemon startup; `health` reports current service/dependency readiness within 10 seconds.
- **NFR-003 — Reliability:** Restarting any application, worker, or local dependency preserves committed data and converges to correct readiness without manual record repair.
- **NFR-004 — Security:** Apply least privilege, private networking/storage, strong password hashing, short-lived/revocable credentials, CSRF protection, safe headers, validated input/config, dependency/container/secret scanning, and auditable security actions.
- **NFR-005 — Privacy:** Shared primitives and telemetry are content-agnostic and pass sensitive-marker redaction tests across Node, Python, workflow, storage, database, errors, and CI output.
- **NFR-006 — Portability:** Supported Windows PowerShell and CI/Linux workflows expose equivalent commands/contracts. WSL is optional. Host-specific paths never enter persisted contracts.
- **NFR-007 — Determinism:** Locked dependencies, pinned images/tool majors, deterministic generators, controlled clocks/IDs, and isolated test resources produce repeatable results.
- **NFR-008 — Compatibility:** Shared contracts, migrations, task queues, storage interface, auth tokens, and telemetry follow declared version/compatibility rules and fail explicitly when unsupported.
- **NFR-009 — Maintainability:** Boundary linting and dependency rules prevent feature business logic from moving into shared packages and prevent applications from importing each other's internals.
- **NFR-010 — Scalability:** API and workers remain stateless between requests/tasks except durable external state; multiple replicas may run without local-memory correctness dependencies.
- **NFR-011 — Availability target support:** Foundation exposes measurements needed for downstream 99.5% service calculations but does not redefine feature outage/exclusion rules.
- **NFR-012 — Recovery:** Database, Temporal, storage, migration, outbox, and configuration failures produce bounded, diagnosable, idempotent recovery paths without silent data loss.

## 8. Data Requirements

Foundation may persist only these shared logical primitives:

- **Tenant:** stable ID, immutable slug/identity, display metadata, status, timestamps, and concurrency value.
- **UserIdentity:** stable ID, normalized login identity, password hash/algorithm metadata, status, security timestamps, and no feature profile data.
- **TenantMembership:** tenant/user, role set limited to shared role vocabulary, status, timestamps, and uniqueness.
- **RefreshSession:** stable ID, user/tenant, hashed token family, expiry, rotation/revocation/reuse-detection metadata, client-safe context, and timestamps.
- **ServiceIdentity:** stable ID, environment, audience/scopes, credential version/status, rotation/revocation, and timestamps.
- **SupportGrant:** stable ID, tenant, support actor, approver, resource/action scope, reason, start/expiry/revocation, and audit references.
- **IdempotencyRecord:** tenant where applicable, operation/key, request hash, status, safe response reference, authoritative expiry, timestamps, and uniqueness.
- **OutboxEnvelope:** stable ID, tenant where applicable, owner/event type/version, payload reference or minimal payload, correlation/causation, state, attempts, availability time, and timestamps.
- **AuditEnvelope:** append-only identity, tenant where applicable, actor/service, feature-owned event type, target references, safe metadata, correlation/causation, and UTC timestamp.
- **MigrationMetadata:** migration identity/checksum, application state/time, artifact/commit identity, and compatibility metadata where not supplied by Prisma.

Foundation must not persist source documents, canonical blocks/assets/issues, AI attempts/results/questions/cost records, Exam workflows/Drafts/Masters, permutation/answer matrices, templates, or published artifacts.

Shared contract envelopes require:

- `schemaVersion`
- stable message/request/event ID
- tenant ID where applicable
- actor/service identity
- correlation and causation IDs
- idempotency key where applicable
- occurred/requested timestamp in UTC
- payload type/version owned by the feature
- safe trace metadata

## 9. User Experience Requirements

Platform Foundation is non-user-facing. It introduces no product screen, Teacher journey, or Tenant Admin workflow. Developer commands and diagnostics are developer experience, not Lyra-owned product UX.

### 9.1 User Goals

- Developers can bootstrap, run, test, diagnose, and stop the platform predictably.
- Feature implementers can rely on stable shared interfaces without understanding adapter internals.
- Operators can verify health and artifact/migration compatibility without accessing customer content.

### 9.2 Primary User Journey

1. Install documented supported prerequisites.
2. Clone the repository and run `bootstrap`.
3. Run `dev`; dependencies become healthy, migrations validate/apply, local identities seed, and applications/workers become ready.
4. Run `health` and the deterministic test commands.
5. Implement a feature only inside its approved boundary using shared contracts.

### 9.3 Alternative User Flows

- Run only dependency services for tests.
- Diagnose configuration/tool/Docker failures with `doctor`.
- Reset isolated test data without deleting development or production data.
- Run CI-equivalent checks locally.
- Use optional WSL while preserving the same commands/contracts.

### 9.4 Interaction Rules

- Commands are non-interactive by default in CI and explain any required confirmation locally.
- Destructive reset commands require an explicit test-environment guard and exact target display.
- Diagnostics identify the failing prerequisite/dependency and remediation without exposing secrets.

### 9.5 Loading, Empty, Success, and Error States

- Startup reports named dependency/application readiness rather than a generic wait.
- Success identifies ready services, applied migration state, and safe local URLs.
- Failure exits nonzero, names the failing check, and leaves already committed data intact.
- An empty database is migrated and seeded only with deterministic local/test foundation identities.

### 9.6 Validation, Feedback, and Recovery

- Validate tools and configuration before starting expensive services where possible.
- Retry only startup readiness probes, not permanent configuration/migration failures.
- State which services remain safe and which command recovers the failure.

### 9.7 Accessibility and Responsive Behavior

CLI output uses text/symbols in addition to color, supports `NO_COLOR`, and remains readable in standard PowerShell and CI logs. Web UIs supplied by dependencies are not customized by Foundation.

### 9.8 UX Decisions

- No product UI or standalone administration UI is introduced.
- Developer commands are the only direct interaction surface.
- Lyra review is not required.

### 9.9 UX Open Questions

No UX question remains.

## 10. Workflow / User Flow

Bootstrap:

```text
CHECK_PREREQUISITES
  -> VALIDATE_CONFIGURATION
  -> INSTALL_LOCKED_DEPENDENCIES
  -> START_DEPENDENCIES
  -> WAIT_FOR_HEALTH
  -> APPLY_AND_VALIDATE_MIGRATIONS
  -> SEED_LOCAL_FOUNDATION_IDENTITIES
  -> START_APPLICATIONS_AND_WORKERS
  -> VERIFY_READINESS
```

Deployment:

```text
VERIFY_ARTIFACTS_AND_CONFIGURATION
  -> APPLY_EXPAND_MIGRATIONS
  -> DEPLOY_COMPATIBLE_API_AND_WORKERS
  -> DEPLOY_WEB
  -> VERIFY_HEALTH_CONTRACTS
  -> ENABLE_TRAFFIC
  -> DEFER_CLEANUP_MIGRATIONS
```

Rollback stops or replaces application artifacts, preserves committed data, and uses a forward corrective migration when required. It never automatically runs a destructive down migration.

## 11. Acceptance Criteria

- **AC-001:** A clean supported Windows PowerShell or CI/Linux machine can run documented bootstrap commands and produce the complete BR-001 workspace with locked reproducible dependencies and buildable minimal web/API/worker applications.
- **AC-002:** One root local workflow starts PostgreSQL/pgvector, Temporal/Web UI, MinIO, ClamAV, web, API, and registered workers without production credentials and reports named readiness.
- **AC-003:** Pinned tools/images, lock verification, deterministic generation, and boundary rules make repeated bootstrap/build runs equivalent and reject dependency or generated-contract drift.
- **AC-004:** Typed configuration validates required/optional/forbidden values before work, safe examples contain no secrets, environment differences remain external, and secret values rotate without source changes.
- **AC-005:** Empty and supported-prior databases migrate successfully, pgvector readiness is verified, destructive/changed migrations fail, and rollback preserves data through compatible application rollback/forward correction.
- **AC-006:** Shared persistence provides tenant-safe transactions, optimistic concurrency, idempotency, outbox, audit envelopes, UTC/stable-ID conventions, and parallel test isolation without feature-owned tables.
- **AC-007:** Temporal client/worker foundations support versioned envelopes, queue ownership, baseline retries, heartbeat, cancellation, correlation/tracing, deterministic replay/testing, and at-least-once safety without registering a feature workflow.
- **AC-008:** Custom authentication enforces tenant-slug-plus-normalized-email login, tenant-local email uniqueness, the specified Argon2id policy, Ed25519/EdDSA access tokens with `kid` and 15-minute maximum lifetime, bounded signing-key rotation, rotating/revocable refresh families with seven-day inactivity and 30-day absolute expiry, CSRF protection, scoped service identities, audited production provisioning, and deterministic identities only in local/test.
- **AC-009:** RBAC/tenant policies deny unauthorized and cross-tenant access server-side without existence disclosure; feature permissions remain absent until feature implementation.
- **AC-010:** Time-limited support grants are scoped, approved, expiring/revocable, auditable, default-deny, and cannot grant cross-tenant or secret access.
- **AC-011:** MinIO and R2-compatible adapters satisfy the same versioned streaming/storage contract, private opaque-key, tenant-isolation, five-minute signed-access, lifecycle/legal-hold hook, health, and failure semantics.
- **AC-012:** Shared JSON Schema, Zod, Pydantic, OpenAPI, fixtures, version metadata, generation/conformance, current-plus-previous-compatible-minor, and drift checks work without shared feature business logic.
- **AC-013:** Correlation/causation and OpenTelemetry context propagate across HTTP, Temporal, database/outbox, storage, and provider-adapter test boundaries.
- **AC-014:** Logs, metrics, traces, health/errors, audit envelopes, and CI output pass prohibited-content/secret/signed-URL/object-key redaction tests in Node and Python.
- **AC-015:** Liveness/readiness and `health` distinguish service/dependency state, expose no sensitive data, and recover correctly after dependency restart.
- **AC-016:** Jest, Testing Library, Playwright, Pytest, deterministic testkit, isolated dependencies, failure injection, coverage, and production-integration gating execute through documented commands.
- **AC-017:** GitHub Actions enforces format, lint, type, contract drift, unit, integration, workflow, migration, security, secret/dependency/container scan, build, and smoke gates without exposing deployment secrets to untrusted pull requests.
- **AC-018:** CI produces immutable content-addressed web/API/worker OCI images plus migration/contract artifacts tied to one commit and promotes the same validated artifacts with external configuration.
- **AC-019:** Deployment ordering, health verification, incompatible-version rejection, and non-destructive rollback preserve data and contract meaning across supported prior state.
- **AC-020:** `bootstrap`, `dev`, `stop`, `health`, `doctor`, migration, test, build, reset, and troubleshooting workflows are documented, non-interactive where required, and equivalent on supported Windows and CI/Linux.
- **AC-021:** Reset commands cannot target development/production accidentally and require exact isolated-test target validation before deletion.
- **AC-022:** On the NFR-001 reference profile, at least 19 of 20 cached local starts reach readiness within five minutes with reproducible evidence; `doctor` meets 30 seconds, `health` meets 10 seconds, and first-run downloads are reported separately.
- **AC-023:** Database, Temporal, storage, configuration, migration, and startup failure injection produces explicit classification, safe partial-state handling, bounded recovery, and no silent loss/duplication.
- **AC-024:** Security tests verify TLS/secure-cookie production policy, the minimum Argon2id parameters and hash upgrade, Ed25519 algorithm and `kid` enforcement, signing-key and refresh-family expiry/rotation/reuse detection/revocation, production provisioning authorization/audit/no-default-credential rules, least-privilege networks/identities, safe headers, dependency/container/secret scans, and privacy-safe diagnostics.
- **AC-025:** Static and runtime boundary tests prove Foundation implements no DOCX validation/parsing/canonicalization/assets, AI calls/Question JSON/repair/cost enforcement, Exam workflow/Draft/Master/cap-request behavior, mixing, or publishing.
- **AC-026:** Foundation satisfies the authentication/RBAC/tenant, PostgreSQL/Prisma migration, outbox/audit, Temporal, private object-storage, schema tooling, provider-secret/configuration, observability, local-parity, test, CI, and rollback dependencies referenced by the three existing feature specs.
- **AC-027:** Foundation readiness reporting is machine-verifiable, content-safe, and identifies supported runtime/tools, dependency health, migration/contract state, tests, and artifact versions.
- **AC-028:** A new provider, storage adapter, worker, or feature contract can be registered through the documented interface without changing unrelated engine or feature code.

## 12. Error Cases

- Missing/unsupported Node, pnpm, Python, uv, Docker, Compose, or required host capability.
- Docker daemon unavailable; port collision; image pull failure; unhealthy PostgreSQL, Temporal, MinIO, or ClamAV.
- Missing, malformed, forbidden, inconsistent, or secret-bearing configuration/example.
- Lockfile mismatch, unpinned dependency/image, generated-contract drift, circular/boundary import, or non-reproducible build.
- Database unavailable, pgvector missing, migration checksum/order conflict, partial migration, incompatible schema, unsafe rollback, or wrong test reset target.
- Duplicate/stale idempotency record, outbox publish interruption, optimistic-concurrency conflict, or cross-tenant transaction.
- Temporal unavailable, wrong namespace/queue, unauthorized worker, nondeterministic replay, heartbeat loss, cancellation failure, duplicate activity delivery, or retry-policy broadening.
- Invalid tenant slug/login, cross-tenant identity collision, password-hash failure, weak/outdated hash, unsupported JWT algorithm, missing/unknown `kid`, expired access token, expired/reused/revoked refresh token, CSRF failure, wrong issuer/audience/scope, unauthorized provisioning, default production credential, compromised service credential, or session/key rotation race.
- Unauthorized/cross-tenant action, missing/expired/revoked/overbroad support grant, or existence disclosure.
- Object storage unavailable, wrong tenant/prefix, missing/corrupt object, expired/overbroad signed access, lifecycle/legal-hold hook failure, or MinIO/R2 contract divergence.
- Missing trace/correlation context, telemetry exporter outage, sensitive marker leakage, unsafe error, or readiness response disclosure.
- Test resource collision, live production dependency invocation, nondeterministic fake, coverage/gate bypass, or secret exposure in CI.
- Artifact provenance mismatch, incompatible rollout, failed health verification, deployment configuration mismatch, or destructive rollback attempt.
- Windows path/quoting/line-ending failure, WSL-only command, destructive reset ambiguity, or non-actionable bootstrap failure.

Every failure returns a stable safe classification where programmatic handling applies, exits or transitions explicitly, preserves committed data, and identifies the supported recovery action.

## 13. Out of Scope

- DOCX upload validation, malware policy ownership, parsing, canonicalization, Canonical Document models, canonical assets, or ingestion workflows.
- AI provider invocation, prompts, Question JSON, grounding, repair, token/cost accounting, AI cap enforcement, or processing workflows.
- Exam Creation workflow, metadata, Draft/Master models, editing, approval, preview, candidate comparison, or Admin cap-request lifecycle.
- Question Bank, vector ingestion, embeddings, semantic retrieval, or RAG; pgvector availability alone is in scope.
- Mixing algorithms, permutation/answer matrices, exam codes, publishing, templates, rendering, exports, or generated exam artifacts.
- Production host, managed database vendor, DNS zone, domain, registry vendor, Sentry project, AI provider/model, or secrets-manager vendor selection.
- Production deployment, customer migration, operational on-call process, billing, subscription, email delivery, password reset, MFA, SSO, invitation delivery, or identity-administration UI. The server-side identity provisioning boundary in BR-021A remains in scope.
- Feature-specific retention, audit-event meanings, task queues, retry limits, business permissions, tables, APIs, screens, or tests.

## 14. Open Questions

No question blocks implementation of the local/shared foundation.

External production decisions deferred to deployment planning:

- Select the production hosting target and container registry.
- Select the managed PostgreSQL/pgvector provider.
- Confirm the R2 account/bucket, Cloudflare DNS/TLS bindings, production secrets manager, and telemetry/Sentry destinations.
- Confirm production domains, allowed origins, certificate management, and service scaling.
- Decide whether password reset, MFA, SSO, invitations, or transactional email require later feature specifications.

These are external configuration or future product decisions and must be approved before production deployment, not before Foundation implementation.
