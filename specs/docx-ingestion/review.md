# DOCX Ingestion Review

## Review Summary

This re-review is limited to **DI-004 — Implement secure source validation and malware/package gates** and the ownership corrections requested in the prior review.

DI-004 now complies with the reconciled DOCX Ingestion and Platform Foundation boundaries. `DocxValidationStatus`, `DocxSourceValidationResult`, their Prisma Client, and their PostgreSQL migration are owned by `@siromix/docx-ingestion`; no DOCX persistence model or migration remains under Foundation-owned `packages/database`. The root generation, validation, and migration commands include both independently owned Prisma lifecycles, and the unified Foundation lifecycle invokes the root migration command.

The strengthened boundary test prohibits both DOCX persistence identifiers throughout every Foundation-owned root and positively verifies their declared feature-owned schema and migration. PostgreSQL integration continues to prove complete `VALID` and `BLOCKED` save/reload behavior, tenant-scoped reads, and rollback with no persisted row after an injected pre-commit failure. The semantic OPC, authorization, size/type, malware, archive, XML, and hashing gates remain intact.

## Spec Compliance

- **Compliant:** Authorization, exactly-one-file, DOCX type, inclusive 10 MiB size, streaming SHA-256, fail-closed malware, bounded archive/XML, and semantic OPC validation are implemented and tested.
- **Compliant:** Validation provenance and `VALID`/`BLOCKED` status are durably persisted in PostgreSQL through a DOCX Ingestion-owned Prisma schema, client, migration, and repository.
- **Compliant:** Tenant-scoped reads and transactional rollback prevent cross-tenant access and partial writes.
- **Compliant:** Foundation-owned schemas and migrations contain no DOCX feature model or enum.
- **Compliant:** Root database generation, validation, and migration commands include the Foundation and DOCX-owned Prisma lifecycles without transferring model ownership.
- **Deferred by approved task boundary:** Parser isolation remains DI-005, canonical cross-reference/atomic result persistence remains DI-008, and concrete ClamAV deployment/real EICAR coverage remains DI-012/SO-005.

## Acceptance Criteria Coverage

| Acceptance Criteria ID | Implemented | Tested | Notes |
|---|---|---|---|
| AC-001 | Yes for DI-004 | Yes | Authorized one-DOCX submission and inclusive 10 MiB limit are covered. |
| AC-002 | Yes for DI-004 | Yes | Semantic OPC and all pre-parser package protections are covered. |
| AC-003 | Yes for DI-004 | Yes | Complete validation provenance and status are durably persisted and reloaded through feature-owned PostgreSQL/Prisma persistence. |
| AC-023 | Yes for DI-004 archive/XML/asset scope | Yes | Exact resource and security-profile limits are covered. |
| AC-026 | Yes for the DI-004 gate | Yes | Timeout, signature freshness, scanner errors, and fail-closed outcomes are covered; concrete ClamAV/EICAR proof is assigned to DI-012/SO-005. |

## Test Results

Nova supplied the following completed validation evidence for the ownership correction:

- Clean isolated PostgreSQL schema migration plus focused DI-004 persistence integration — **passed**; exactly one DOCX feature migration was applied and the temporary schema was removed.
- Full PostgreSQL integration suite — **passed**, 7 tests including DI-004.
- `pnpm test` — **passed**, 51 tests.
- `pnpm contracts:check` — **passed**, 130 cross-runtime cases.
- Full Python suite — **passed**, 42 tests.
- Prisma Client generation and both Prisma schema validations — **passed**.
- Typecheck, lint, format, build, frontend, E2E, and security gates — **passed**.

Independently rerun during this review:

- `pnpm test` — **passed**, 51 tests, including the strengthened Foundation/feature ownership boundary.
- `pnpm typecheck` — **passed**.
- `pnpm db:validate` with a local non-sensitive PostgreSQL URL — **passed** for both `@siromix/database` and `@siromix/docx-ingestion` schemas. Running this command without `DATABASE_URL` first failed closed as expected; no database connection was needed for the successful schema validation.

## Identified Gaps

None within DI-004 scope.

## Implementation Outside Spec

None identified. DI-005 parser isolation, DI-008 canonical cross-reference/atomic result persistence, and DI-012 ClamAV deployment were not implemented.

## Complexity / Maintainability Notes

The DOCX persistence repository remains small and cohesive. Separate Prisma schemas make ownership explicit while the root lifecycle preserves one operational PostgreSQL migration path. The boundary regression test now protects both placement and dependency direction.

## Required Corrections

None.

## Approval Status

**Approved**

Review scope: **DI-004 only**. Prior DI-002 and DI-003 approvals remain unchanged.
