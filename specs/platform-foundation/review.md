# Platform Foundation Review

## Review Summary

Final review date: 2026-07-30

Reviewed branch: `spec-004-platform-foundation`

Constitution: v1.1.0

### MVP Approval Status

**Approved**

MVP-AC-001 through MVP-AC-018 are implemented and have passing mapped evidence.
Every mandatory MVP command passed. The mandatory Docker integration suite executed
all six tests with no failures or skips, and the integration command correctly
failed when its explicit test profile was absent.

The authoritative Foundation Envelope issue is resolved: JSON Schema, generated
Zod, generated Pydantic, OpenAPI, manifest metadata, fixtures, writers, and readers
consistently use `1.0`. TypeScript and Python regression tests explicitly reject
`1.1` and unsupported major `2.0`.

No unresolved Constitution violation, neighboring-spec conflict, feature-boundary
violation, or genuine MVP blocker was identified.

### Production Readiness Status

**Not Production Ready — non-blocking for MVP**

PH-AC-001 through PH-AC-007 remain deferred as explicitly permitted by the updated
specification. They do not block MVP Foundation approval.

## Spec Compliance

The implementation supplies the minimum shared authentication, tenant isolation,
persistence, migration, Temporal, object-storage, contract, configuration,
observability, testing, local-lifecycle, CI, security, readiness, and rollback
primitives required to begin Exam Creation, DOCX Ingestion, and AI Processing.

The implementation preserves the Foundation boundary. Static and runtime checks
found no Foundation-owned DOCX parsing, canonicalization, AI processing,
Draft/Master Exam behavior, mixing, publishing, vector/RAG behavior, feature
permission, feature workflow, or feature user interface.

The documented root lifecycle successfully started PostgreSQL/pgvector, Temporal,
Temporal UI, MinIO, ClamAV, web, API, the Python worker, and the TypeScript worker;
health reported every required component ready; stop completed successfully. Stale
application process-state is recovered without weakening duplicate-start safety.

No conflict with the Constitution or the Exam Creation, DOCX Ingestion, or AI
Processing specifications was identified.

## Authoritative Contract-Version Verification

- `packages/contracts/schemas/envelope-1.0.json` declares `schemaVersion` as the
  constant `1.0`.
- Generated TypeScript validates with `z.literal("1.0")`.
- Generated Pydantic validates with `Literal["1.0"]`.
- The generated manifest lists only `1.0` in `supportedReaderVersions`.
- OpenAPI and the valid/consumer fixtures reference `1.0`.
- TypeScript tests accept `1.0` and reject `1.1`, `2.0`, and unknown fields.
- Python tests accept `1.0` and reject `1.1`, `2.0`, and unknown fields.
- `pnpm contracts:check` passed with no drift.

MVP-AC-010 is fully compliant.

## MVP Acceptance-Criteria Coverage

| Acceptance Criterion | Implemented | Tested | Evidence |
|---|---|---|---|
| MVP-AC-001 | Yes | Yes | Locked workspace, pinned tools, deterministic generation, minimal loads, and build passed. |
| MVP-AC-002 | Yes | Yes | Root lifecycle started all required services/apps/workers; health was ready; PostgreSQL and dependency integration passed. |
| MVP-AC-003 | Yes | Yes | Typed configuration, unknown/conflicting input, secret/example, browser boundary, and production fail-closed tests passed. |
| MVP-AC-004 | Yes | Yes | Empty/current migration, pgvector, ordering/checksum, destructive-cleanup rejection, and rollback contracts passed. |
| MVP-AC-005 | Yes | Yes | Tenant transaction, concurrency, idempotency, outbox, audit, conventions, and reset isolation tests passed. |
| MVP-AC-006 | Yes | Yes | Real Temporal queue, retry, heartbeat, cancellation, replay, duplicate delivery, restart, and negative registration tests passed. |
| MVP-AC-007 | Yes | Yes | Password, JWT, refresh/session, provisioning, CSRF/cookie, local identity, and persistence-backed authentication tests passed. |
| MVP-AC-008 | Yes | Yes | RBAC, tenant, service identity, support-grant, unauthorized, and cross-tenant denial tests passed. |
| MVP-AC-009 | Yes | Yes | MinIO/R2-compatible streaming, head/delete, signing, lifecycle/hold hook, health, error, and tenant-denial tests passed. |
| MVP-AC-010 | Yes | Yes | Authoritative `1.0` contract is aligned across all representations; `1.1` and unsupported majors are rejected; drift passed. |
| MVP-AC-011 | Yes | Yes | Node and Python correlation/redaction tests passed, including prohibited keys and credential-like values. |
| MVP-AC-012 | Yes | Yes | Safe named health and dependency readiness/recovery behavior passed. |
| MVP-AC-013 | Yes | Yes | Node, frontend coverage, E2E, Python, Docker integration, security, contract, and build commands all passed without skips. |
| MVP-AC-014 | Yes | Yes | CI required-gate and pull-request permission/secret/promotion contracts passed. |
| MVP-AC-015 | Yes | Yes | Exact isolated test-reset guard and rejection cases passed. |
| MVP-AC-016 | Yes | Yes | Static/runtime feature-boundary inventory and content-free frontend/E2E shell passed. |
| MVP-AC-017 | Yes | Yes | Exam Creation, DOCX Ingestion, and AI Processing consumer fixtures passed. |
| MVP-AC-018 | Yes | Yes | Safe versioned readiness report includes tools, dependencies, migrations, contract, commands, platforms, profile, and commit. |

## Test Results

Pulsar reran the required MVP suite on 2026-07-30:

| Command | Result |
|---|---|
| `node scripts/foundation.mjs dev` | Passed |
| `node scripts/foundation.mjs health` | Passed — all required infrastructure services and applications/workers ready |
| `pnpm test` | Passed — 41 passed, 0 failed |
| `pnpm test:frontend` | Passed — 1 suite/1 test; 100% statements, branches, functions, and lines |
| `pnpm test:e2e` | Passed — 1 passed |
| `uvx --from uv==0.8.14 uv run --frozen --project workers/document-ai python -m pytest workers/document-ai/tests` | Passed — 6 passed |
| `SIROMIX_ENV=test`, `SIROMIX_INTEGRATION=1`, then `pnpm test:integration` | Passed — 6 passed, 0 failed, 0 skipped |
| `pnpm test:integration` without the explicit profile | Expected failure — exit 1 with `INTEGRATION_PROFILE_REQUIRED` |
| `pnpm format` | Passed |
| `pnpm lint` | Passed |
| `pnpm typecheck` | Passed |
| `pnpm contracts:check` | Passed |
| `pnpm security:scan` | Passed |
| `pnpm build` | Passed |
| `git diff --check` | Passed |
| `node scripts/foundation.mjs stop` | Passed |

The production build emitted non-fatal Next.js warnings about project references,
ESLint plugin detection, and a future `allowedDevOrigins` requirement. None conflicts
with an MVP acceptance criterion.

Temporal emitted expected warning logs from deliberately injected retry,
cancellation, and heartbeat-timeout scenarios. The workflow integration test passed.

## Genuine MVP Blockers

None.

## Remaining Production Hardening Backlog

The following work remains required before **Production Ready** and is explicitly
non-blocking for **MVP Foundation Approved**:

| Production criterion | Remaining certification |
|---|---|
| PH-AC-001 | Historical, missing, partial, out-of-order, incompatible, and concurrent migration certification plus production-like rolling readers and forward correction |
| PH-AC-002 | Captured end-to-end trace propagation and prohibited-content redaction through all real operational boundaries |
| PH-AC-003 | Exhaustive real-dependency failure injection across every shared dependency and lifecycle point |
| PH-AC-004 | Complete lifecycle and edge-case certification on clean hosted Windows and Linux runners |
| PH-AC-005 | Hosted content-addressed OCI images, SBOMs, provenance, scans, migration/contract bundles, and unchanged promotion evidence |
| PH-AC-006 | Production-like partial rollout, traffic/health gating, rollback, forward correction, incompatible-version rejection, and deferred cleanup |
| PH-AC-007 | Approved production performance, restart, backup/restore, disaster recovery, scaling, and operational/on-call readiness |

## Implementation Outside Spec

None identified.

## Complexity / Maintainability Notes

The contract generator now has one authoritative version interpretation across
TypeScript and Python. Lifecycle stale-state recovery is small and preserves the
existing duplicate-start guard. No unnecessary MVP expansion or speculative
production-hardening implementation was identified.

## Required Corrections

None for MVP Foundation.

Production Hardening remains tracked separately and must be completed before
production deployment.

## Approval Status

**Approved**

**MVP Foundation:** Approved.

**Production Hardening:** Deferred and non-blocking for MVP. **Production Ready is
not approved.**
