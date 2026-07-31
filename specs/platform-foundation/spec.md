# Platform Foundation Specification

## 1. Objective

Establish the minimum safe shared foundation required to begin implementing Exam Creation, DOCX Ingestion, and AI Processing without redefining authentication, tenancy, persistence, object storage, Temporal, contracts, configuration, observability, testing, or local operations.

This specification has two explicit completion levels:

1. **MVP Foundation Approved:** all requirements and acceptance criteria labeled **MVP Release Gate** are implemented, their mandatory tests pass, and Pulsar approves the MVP foundation.
2. **Production Ready:** the MVP foundation is approved and all separately labeled **Production Hardening** requirements have been completed and verified before production deployment.

Production Hardening is not a prerequisite for feature development or MVP Foundation approval.

## 2. Context

Exam Creation, DOCX Ingestion, and AI Processing require the same cross-cutting infrastructure. Platform Foundation supplies those shared primitives and interfaces while leaving feature entities, workflows, policies, retry decisions, retention, and user interfaces to their owning specifications.

The split in this revision prevents production-certification work from blocking safe MVP feature development. Tenant isolation, authentication, contract correctness, migration safety, deterministic processing, local development, security, and mandatory automated tests remain MVP release gates.

**Specification Status:** Implementation Ready.

**UX Status:** No Lyra review is required because Platform Foundation introduces no end-user or standalone administrative workflow.

**Constitution Check:** Passed against Constitution v1.1.0. The scope preserves contract-first boundaries, least privilege, tenant isolation, local-first development, deterministic processing, migration safety, and release-blocking correctness tests.

## 3. Related Specifications

- **Exam Creation:** depends on authentication/RBAC, tenancy, PostgreSQL/Prisma, private storage, Temporal, idempotency/outbox/audit primitives, versioned contracts, observability, local testing, and rollback foundations.
- **DOCX Ingestion:** depends on authenticated tenant commands, private object storage, PostgreSQL, Temporal-compatible workers, ClamAV connectivity, service identities, versioned contracts, and safe telemetry.
- **AI Processing:** depends on authentication/RBAC, tenant context, PostgreSQL/outbox, Temporal, private storage, schema tooling, provider configuration hooks, deterministic adapters, and safe telemetry.
- **Constitution:** `/specs/constitution.md` controls all conflicts.

Boundary rules:

- Foundation owns shared primitives; feature specifications own feature behavior.
- Foundation registers only content-free smoke workflows and shared envelopes.
- Foundation-owned modules create no DOCX, canonical, AI, Draft/Master Exam, mixing, publishing, vector, or RAG behavior and must not import or re-export feature-owned contracts or implementations.
- The Foundation-owned `@siromix/contracts` package contains only the Foundation Envelope and other explicitly approved domain-neutral shared envelopes. Feature contracts belong to isolated feature-owned packages governed by their approved specifications.
- Approved feature implementation is permitted outside Foundation-owned modules. Each feature artifact must have one declared owning specification and package/module boundary; unowned feature behavior and cross-owner imports remain prohibited.
- DOCX Ingestion owns its Canonical Document schemas, compatibility policy, fixtures, TypeScript readers, and worker bindings in the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`. A generated Python binding may be emitted into the document worker only when it remains traceable to and conformance-tested against that package's authoritative schema.
- A feature may narrow shared retry/security rules; broadening requires an approved specification update.

For boundary enforcement, Foundation-owned surfaces are the domain-neutral `@siromix/contracts`, configuration, authentication, database shared primitives listed in MVP-BR-005, storage, workflow foundation, observability, testkit, minimal application/worker bootstrap, and Foundation lifecycle/CI/infrastructure tooling. Feature-owned modules may integrate with those surfaces through their public contracts but must not place feature schemas, exports, registrations, persistence models, workflows, or business rules inside them.

## 4. User Roles

- **Teacher:** tenant member; receives only feature permissions declared by feature specifications.
- **Tenant Admin:** tenant-scoped administrator; may provision/deactivate tenant memberships.
- **Platform support:** default-deny; customer access requires a scoped, approved, expiring support grant.
- **Workflow/worker service:** non-human, environment-scoped identity restricted to registered queues and required resources.
- **CI/deployment identity:** non-human identity restricted to build, migration, deployment, and verification operations.
- **Unauthenticated/unauthorized principal:** receives no tenant or private-resource access.

Foundation defines no upload, regenerate, approve, mix, publish, or other feature permission.

## 5. Business Rules

### 5.1 MVP Release Gate

- **MVP-BR-001 — Repository and runtime:** Use a pnpm monorepo with minimal Next.js web, NestJS API, Python worker, shared packages, Docker infrastructure, and documentation. Pin Node 24, pnpm 10, Python 3.12, uv 0.8, container images, and lockfiles.
- **MVP-BR-002 — Local operation:** Document one root workflow for bootstrap, development start, health, stop, migrations, tests, build, readiness, and guarded test reset. Local operation requires no production credential.
- **MVP-BR-003 — Local dependencies:** Docker Compose supplies PostgreSQL/pgvector, Temporal/Web UI, MinIO, and ClamAV. Application and worker health are named and machine-readable.
- **MVP-BR-004 — Configuration:** Every process validates typed configuration before work. Secrets remain external, browser-public values are allowlisted, insecure production configuration fails closed, and safe examples contain no real secret.
- **MVP-BR-005 — Shared persistence ownership:** Foundation owns only Tenant, UserIdentity, TenantMembership, RefreshSession, ServiceIdentity, SupportGrant, IdempotencyRecord, OutboxEnvelope, AuditEnvelope, and migration metadata primitives.
- **MVP-BR-006 — Tenant and transaction safety:** Tenant-owned access requires server-side tenant context. Cross-tenant access is non-disclosing. Shared transactions support optimistic concurrency, idempotency, outbox, append-only audit envelopes, UTC timestamps, and UUIDv7 identifiers.
- **MVP-BR-007 — Migration safety:** Migrations are ordered and immutable after shared use. Empty-database migration and current supported-state migration must pass. Destructive cleanup is separated and never runs automatically during rollback. Rollback uses compatible application rollback and forward correction.
- **MVP-BR-008 — Temporal foundation:** Queue names are versioned and environment/domain scoped. Foundation provides client/worker registration, bounded baseline activity retry, heartbeat, cancellation, replay testing, correlation, and a content-free smoke workflow only.
- **MVP-BR-009 — Authentication:** Interactive authentication uses tenant slug plus normalized email. Passwords use Argon2id with at least 19 MiB memory, two iterations, and parallelism one. Access tokens use Ed25519/EdDSA, required known `kid`, issuer/audience validation, and a maximum 15-minute lifetime.
- **MVP-BR-010 — Sessions and provisioning:** Refresh credentials contain at least 256 bits of entropy, are stored only as keyed hashes, rotate on use, expire after seven days inactivity or 30 days absolute, and revoke their family on confirmed reuse. Production provisioning is explicit, audited, idempotent, and contains no deterministic/default credential.
- **MVP-BR-011 — Authorization and support:** Role, tenant, resource, and action authorization is server-side. Support grants are approved, tenant/resource/action scoped, revocable, auditable, and no longer than four hours by default. Grants never permit cross-tenant or secret access.
- **MVP-BR-012 — Object storage:** A versioned streaming interface supports put, get-stream, head, delete, health, signed access, lifecycle tags, legal-hold hooks, and safe errors. MinIO and R2-compatible adapters use private buckets and opaque tenant-private keys. Signed access expires within five minutes.
- **MVP-BR-013 — Authoritative contract version:** The authoritative Foundation Envelope schema version is **`1.0`**. Current writers emit `1.0`; current readers accept `1.0` only. No `1.1` document is valid until an authoritative `1.1` schema and compatibility fixtures are approved. Before a future `1.1` writer is enabled, readers must accept both authoritative `1.0` and `1.1` schemas. Breaking majors require dual-reader rollout before new writes.
- **MVP-BR-014 — Contract generation:** JSON Schema is authoritative. Zod, Pydantic, OpenAPI, metadata, and fixtures are generated from or conformance-tested against the same schema. Drift or semantic disagreement blocks the release gate.
- **MVP-BR-015 — Observability and privacy:** Correlation/causation/trace context is represented consistently at shared boundaries. Structured Node/Python logging, safe errors, health, and audits redact prohibited content, credentials, signed URLs, and private object keys.
- **MVP-BR-016 — Deterministic testing:** Mandatory unit, contract, integration, Temporal, storage, authentication, migration-safety, frontend smoke, E2E smoke, security, build, and boundary tests run through documented commands. Mandatory integration tests fail rather than silently skip when their test profile is absent.
- **MVP-BR-017 — CI safety:** CI performs locked install, format, lint, typecheck, contract drift, unit, frontend, E2E, Python, integration, security, build, and artifact-metadata checks. Pull requests receive no production deployment secret and cannot promote production artifacts.
- **MVP-BR-018 — Boundaries and readiness:** Static/runtime checks reject feature-owned behavior, contracts, imports, re-exports, and registrations inside Foundation-owned modules while permitting implementation in isolated feature-owned packages governed by approved feature specifications. Checks also reject unowned feature artifacts and unauthorized cross-owner dependencies. A safe machine-readable readiness report identifies supported tools, dependencies, migrations, contract version, mandatory commands, and artifact commit.

### 5.2 Production Hardening

The following requirements are required before production deployment but do not block **MVP Foundation Approved**:

- **PH-BR-001 — Historical migration certification:** Exercise every retained historical database snapshot, partial/out-of-order migrations, lock contention, rolling old/new readers, and production-like forward correction.
- **PH-BR-002 — Full telemetry traversal:** Prove trace propagation and redaction through a complete HTTP → Temporal → database/outbox → storage → provider-adapter integration flow with actual captured telemetry.
- **PH-BR-003 — Exhaustive failure injection:** Inject every lifecycle failure point into every shared dependency and prove bounded recovery, preserved commits, and no duplication or leakage.
- **PH-BR-004 — Cross-platform certification:** Execute the complete lifecycle, including edge cases, on clean hosted Windows and Linux runners.
- **PH-BR-005 — Immutable artifact promotion:** Produce and verify content-addressed OCI images, SBOMs, provenance, container scans, migration/contract bundles, deployment verification, and unchanged promotion from a clean hosted commit.
- **PH-BR-006 — Production rollout certification:** Exercise partial rollout, traffic gating, application rollback, forward correction, deferred cleanup, and incompatible-version rejection in a production-like environment.
- **PH-BR-007 — Extended performance/reliability:** Repeat startup/restart and dependency-recovery profiles on release infrastructure and retain operational evidence.
- **PH-BR-008 — Operational readiness:** Finalize hosting, registry, managed PostgreSQL/R2, secrets manager, TLS/domains, telemetry destinations, scaling, backups, disaster recovery, and on-call procedures.

## 6. Functional Requirements

### 6.1 MVP Release Gate

- **MVP-FR-001:** A developer can install locked dependencies, build minimal applications/workers, start local dependencies and processes, inspect health, and stop them using documented root commands.
- **MVP-FR-002:** API/database/storage/workflow helpers require tenant context and return safe stable failures.
- **MVP-FR-003:** Authentication, refresh sessions, service identities, tenant provisioning, RBAC, and support grants enforce MVP-BR-009 through MVP-BR-011.
- **MVP-FR-004:** PostgreSQL/pgvector migrations and shared persistence primitives satisfy MVP-BR-005 through MVP-BR-007.
- **MVP-FR-005:** Temporal and storage adapters satisfy MVP-BR-008 and MVP-BR-012 using deterministic local services.
- **MVP-FR-006:** The Foundation Envelope `1.0` validates equivalently through JSON Schema, Zod, Pydantic, and OpenAPI fixtures; `1.1` and unsupported majors are rejected.
- **MVP-FR-007:** Safe observability utilities preserve correlation metadata while redacting prohibited keys and credential-like values in Node and Python.
- **MVP-FR-008:** Mandatory test commands, integration-profile enforcement, CI configuration, boundary checks, and readiness reporting satisfy MVP-BR-016 through MVP-BR-018.

### 6.2 Production Hardening

- **PH-FR-001:** Complete PH-BR-001 through PH-BR-008 with retained machine-readable evidence tied to the release commit.

## 7. Non-Functional Requirements

### 7.1 MVP Release Gate

- **MVP-NFR-001 — Security:** Least privilege, tenant isolation, secure secret handling, safe file/storage behavior, production TLS/cookie fail-closed policy, and privacy-safe diagnostics are mandatory.
- **MVP-NFR-002 — Determinism:** Locked installs, contract generation, tests, IDs/clocks, retries, and local adapters produce repeatable outcomes.
- **MVP-NFR-003 — Reliability:** Committed transaction/outbox/idempotency/session/workflow state survives retry or restart without duplicate logical effects.
- **MVP-NFR-004 — Maintainability:** Foundation-owned shared packages contain only domain-neutral interfaces, envelopes, and utilities and remain free of feature contracts, orchestration, and business rules. Feature-owned packages may contain their approved domain contracts and behavior but must not become undeclared shared dumping grounds.
- **MVP-NFR-005 — Local readiness:** Supported local Windows development and CI/Linux application architecture use the same contracts, migrations, queues, and adapters.

### 7.2 Production Hardening

- **PH-NFR-001:** Production certification evidence must be generated from a clean immutable commit and retained with the release.
- **PH-NFR-002:** Production operational targets, scaling, backups, recovery time, and on-call thresholds must be approved before deployment.

## 8. Data Requirements

### 8.1 MVP Release Gate

- Foundation persists only the shared models listed in MVP-BR-005.
- Every tenant-owned shared record carries tenant scope or an immutable tenant-scoped parent.
- IDs are UUIDv7; timestamps are timezone-aware UTC; mutable shared records use optimistic concurrency where applicable.
- Outbox and audit envelopes carry schema, owner/event, tenant, correlation, causation, and safe reference metadata.
- Object keys are opaque and tenant private.
- The authoritative Foundation Envelope schema is `1.0`; no persisted `1.1` envelope is valid under this revision.

### 8.2 Production Hardening

- Historical migration fixtures, artifact manifests, SBOMs, provenance, scan reports, deployment evidence, and operational reports are retained as release evidence rather than product-domain data.

## 9. User Experience Requirements

### 9.1 User Goals

No standalone user workflow is introduced. Feature teams receive predictable authenticated, tenant-safe, observable infrastructure.

### 9.2 Primary User Journey

Not applicable to end users. The developer journey is bootstrap → start → health → test/build → stop.

### 9.3 Alternative User Flows

Actionable diagnostics cover incompatible tools, unavailable Docker, unhealthy dependencies, invalid configuration, migration failure, and port collision.

### 9.4 Interaction Rules

Health and error output is safe and machine-readable. No secret or customer content is displayed.

### 9.5 Loading, Empty, Success, and Error States

Processes expose liveness/readiness. Unavailable required dependencies produce nonzero, classified outcomes.

### 9.6 Validation, Feedback, and Recovery

Startup fails before work on invalid configuration. Retryable dependency recovery does not mutate committed records manually.

### 9.7 Accessibility and Responsive Behavior

The minimal web shell and future shared components use semantic, keyboard-accessible foundations. Feature accessibility remains feature-owned.

### 9.8 UX Decisions

No end-user UX decision is introduced.

### 9.9 UX Open Questions

None.

## 10. Workflow / User Flow

```text
BOOTSTRAP
  -> VALIDATE_TOOLS_AND_CONFIGURATION
  -> START_LOCAL_DEPENDENCIES
  -> APPLY_SAFE_MIGRATIONS
  -> START_WEB_API_AND_WORKERS
  -> VERIFY_NAMED_READINESS
  -> RUN_MVP_TEST_GATES
  -> MVP_FOUNDATION_REVIEW
```

Production deployment adds the non-blocking hardening flow:

```text
MVP_FOUNDATION_APPROVED
  -> COMPLETE_PRODUCTION_HARDENING
  -> BUILD_IMMUTABLE_ARTIFACTS
  -> CERTIFY_ROLLOUT_AND_ROLLBACK
  -> PRODUCTION_READY_REVIEW
```

## 11. Acceptance Criteria

### 11.1 MVP Release Gate

- **MVP-AC-001:** The pinned monorepo installs reproducibly and minimal web, API, TypeScript packages, and Python worker build or load through documented commands.
- **MVP-AC-002:** The documented local workflow starts PostgreSQL/pgvector, Temporal/Web UI, MinIO, ClamAV, web, API, and registered workers without production credentials and reports safe named readiness.
- **MVP-AC-003:** Typed configuration rejects missing, unknown, conflicting, forbidden, and insecure production values before work; examples and browser configuration expose no secret.
- **MVP-AC-004:** Empty/current-supported migrations, pgvector readiness, migration ordering/checksum protection, destructive-cleanup rejection, and non-destructive rollback rules pass the MVP migration tests.
- **MVP-AC-005:** Tenant transactions, optimistic concurrency, idempotency, outbox, audit envelopes, UTC/UUIDv7 conventions, and isolated reset safety pass without feature-owned tables.
- **MVP-AC-006:** Temporal foundations prove queue ownership, versioned envelopes, bounded retry, heartbeat, cancellation, replay, duplicate delivery, restart recovery, and no feature workflow registration.
- **MVP-AC-007:** Authentication and sessions prove tenant-local login, Argon2id policy/upgrade, Ed25519/EdDSA token enforcement, key selection, refresh rotation/reuse/expiry/revocation, CSRF/cookie safety, audited provisioning, and local-only deterministic identities.
- **MVP-AC-008:** RBAC, tenant enforcement, service identities, and support grants deny unauthorized/cross-tenant/secret access without disclosure.
- **MVP-AC-009:** MinIO and R2-compatible adapters satisfy private tenant-safe streaming, head/delete, signed-access expiry, lifecycle/legal-hold hook, health, and safe-error parity.
- **MVP-AC-010:** JSON Schema `1.0`, generated/conformance-tested Zod and Pydantic, OpenAPI, metadata, and fixtures validate equivalently; writers emit and readers accept `1.0`; `1.1` and unsupported majors fail; drift blocks the gate.
- **MVP-AC-011:** Correlation/causation/trace carriers and Node/Python redaction utilities preserve safe fields and remove prohibited content, secrets, signed URLs, private object keys, and credential-like values.
- **MVP-AC-012:** Liveness/readiness distinguishes service/dependency state, exposes no sensitive data, and recovers after dependency return.
- **MVP-AC-013:** Node, Jest/Testing Library coverage, Playwright smoke, Pytest, deterministic testkit, mandatory integration, Temporal, storage, authentication, migration-safety, security, and build commands pass; mandatory integration cannot silently skip.
- **MVP-AC-014:** CI configuration enforces locked install, format, lint, typecheck, contract drift, unit, frontend, E2E, Python, integration, security, build, and artifact-metadata gates without exposing production deployment secrets to pull requests.
- **MVP-AC-015:** Reset rejects every non-test or non-isolated target and never deletes development/production data.
- **MVP-AC-016:** Static/runtime boundaries prove no DOCX, canonical, AI, Draft/Master Exam, cap-request, mixing, publishing, vector, or RAG behavior, contract, import, re-export, or registration exists in Foundation-owned modules; approved feature artifacts are accepted only in their declared owner packages/modules, and unowned or unauthorized cross-owner artifacts fail.
- **MVP-AC-017:** Consumer fixtures show that Exam Creation, DOCX Ingestion, and AI Processing can consume the declared shared authentication, tenancy, persistence, Temporal, storage, contract, configuration, observability, test, and rollback primitives.
- **MVP-AC-018:** Safe machine-readable readiness identifies supported tools, dependencies, migrations, authoritative contract version, mandatory test commands, supported platforms, and artifact commit.

### 11.2 Production Hardening

Production Hardening criteria are non-blocking for MVP Foundation approval:

- **PH-AC-001:** Every retained historical database snapshot and incompatible/partial/concurrent migration scenario passes production-like rollout and forward-correction tests.
- **PH-AC-002:** Actual captured telemetry proves end-to-end trace propagation and prohibited-content redaction across HTTP, Temporal, database/outbox, storage, provider adapter, audits, health, and CI output.
- **PH-AC-003:** Exhaustive failure injection across all shared dependencies proves bounded recovery, preserved committed state, no duplicate effect, and no leakage.
- **PH-AC-004:** Clean hosted Windows and Linux runners execute the complete documented lifecycle and edge-case matrix.
- **PH-AC-005:** A clean hosted commit produces scanned content-addressed images, SBOMs, provenance, migration/contract bundles, deployment verification, and unchanged promotion evidence.
- **PH-AC-006:** Production-like partial rollout, health gating, rollback, forward correction, incompatible-version rejection, and deferred cleanup pass.
- **PH-AC-007:** Release infrastructure satisfies the approved performance, restart, backup, recovery, and operational-readiness targets.

## 12. Error Cases

### 12.1 MVP Release Gate

- Missing/incompatible tools, Docker/Compose unavailable, port collision, invalid configuration, or unhealthy dependency.
- Missing pgvector, migration checksum/order violation, destructive migration, incompatible current schema, or migration lock failure.
- Missing tenant, cross-tenant access, optimistic conflict, idempotency mismatch/concurrency, outbox acknowledgement failure, or unsafe audit metadata.
- Wrong Temporal queue/identity/version, retry broadening, cancellation/replay failure, or duplicate delivery.
- Invalid/locked identity, weak/outdated password hash, JWT algorithm/`kid`/issuer/audience/expiry failure, refresh reuse/expiry/revocation, CSRF/origin failure, unauthorized provisioning, or invalid support grant.
- Missing/corrupt/private storage object, cross-tenant storage access, invalid signed access, interrupted stream, or unavailable adapter.
- Contract drift, schema/runtime disagreement, unsupported `1.1` or major version, unknown field, or invalid fixture.
- Secret/private-content leakage, unsafe health/error output, mandatory integration skip, unsafe reset, or feature-boundary violation.

### 12.2 Production Hardening

- Historical/partial migration incompatibility, telemetry traversal loss, exhaustive dependency fault, clean-runner divergence, artifact/provenance mismatch, scan failure, rollout failure, or operational-readiness failure.

Every MVP error fails safely and preserves committed valid state.

## 13. Out of Scope

- Feature-owned DOCX, canonicalization, AI, exam lifecycle, mixing, publishing, vector/RAG, screens, tables, permissions, workflows, retry policies, retention, and tests.
- Production vendor selection, deployment, customer migration, billing, email, password reset, MFA, SSO, invitations, and identity-administration UI.
- Production Hardening completion as a prerequisite for MVP feature development.

## 14. Open Questions

No question blocks MVP Foundation implementation or approval.

Production hosting, managed services, registry, domains/TLS, secrets manager, telemetry destinations, scaling, backup/recovery, and on-call decisions remain Production Hardening decisions required before production deployment.
