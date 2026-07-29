# DOCX Ingestion Test Specification

## Test Scope

Verify secure one-DOCX validation, isolated parsing, deterministic canonical transformation, asset extraction, schema validation, blocker/warning classification, immutable persistence/reuse, idempotent retry/recovery, authorization/privacy, retention, local parity, performance, and handoff boundaries.

AI question behavior, Draft/Master lifecycle, mixing, and publishing are excluded except for negative boundary tests.

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Required Test | Test Type | Status |
|---|---|---|---|
| AC-001 | Exactly one authorized DOCX through 10 MiB succeeds with no page limit; invalid selections fail inline without clearing Setup | Unit / Integration / UX Contract | Pending |
| AC-002 | All type/package/malware/archive/XML protections run pre-parser and active/external content never executes/fetches | Security / Integration | Pending |
| AC-003 | Stable source identity/hash/provenance/private reference persist with privacy-safe logs | Integration | Pending |
| AC-004 | Identical canonicalization tuples produce equivalent canonical output | Golden / Determinism | Pending |
| AC-005 | Duplicate commands/activities create one logical result and side effects | Workflow / Integration | Pending |
| AC-006 | Reuse requires every eligibility condition and otherwise reprocesses explicitly | Unit / Integration | Pending |
| AC-007 | Golden fixtures preserve all required structures, order, nesting, and relationships | Golden / Contract | Pending |
| AC-008 | Blocks/assets have stable identity/provenance and exclude prohibited payloads/paths/URLs | Contract / Security | Pending |
| AC-009 | Blockers fail; warnings continue and persist with confirmed count/first/expand behavior | Unit / Golden / Workflow / UX Contract | Pending |
| AC-010 | Schema and cross-reference validator rejects every malformed contract class | Unit / Contract | Pending |
| AC-011 | Consumers receive only atomically persisted successful terminal versions | Integration / Contract | Pending |
| AC-012 | Transient canonicalization stops after three total attempts; permanent failures do not auto-retry | Workflow | Pending |
| AC-013 | Retry/restart resumes safely and duplicate delivery preserves valid work without duplication | Workflow / Integration | Pending |
| AC-014 | Atomic cancellation and server-timed 30-second idempotent Undo/resumption handle every race/expiry/outcome | Workflow / Integration / UX Contract | Pending |
| AC-015 | Roles, tenants, service identities, private assets, and support grants enforce least privilege | Security / Integration | Pending |
| AC-016 | Logs/metrics/traces/issues/audit omit all prohibited sensitive content | Security / Integration | Pending |
| AC-017 | Exact retention, recovery, legal-hold, tenant/legal deletion, and asset-reference rules work | Time-based / Integration | Pending |
| AC-018 | Local substitutes execute success and meaningful failure paths without production credentials | Local-parity / E2E | Pending |
| AC-019 | Fresh inputs through 10 MiB meet 60-second P95 and required reporting under PERFORMANCE_PROFILE_V1 | Performance | Pending |
| AC-020 | Upgrades create immutable linked versions; consumer incompatibility and rollback are explicit | Contract / Migration | Pending |
| AC-021 | Handoff supports every confirmed tracker, warning, failure, technical-detail, reuse, responsive, accessibility, and AI-transition behavior | Contract / Integration / Accessibility | Pending |
| AC-022 | Calls or mutations outside ingestion ownership are impossible | Boundary / Integration | Pending |
| AC-023 | Exact SECURITY_PROFILE_V1 and parser sandbox boundaries are enforced | Security / Boundary / Integration | Pending |
| AC-024 | MathML normalization, linear aid, private OMML provenance, blockers, and downstream isolation work | Golden / Contract / Security | Pending |
| AC-025 | Every supported/warning/blocking/ambiguous shape family and relationship is classified correctly | Golden / Contract | Pending |
| AC-026 | ClamAV production/local contract, limits, freshness, fail-closed behavior, and EICAR integration work | Security / Integration / Local-parity | Pending |
| AC-027 | Tenant-scoped physical deduplication preserves semantic identity, isolation, and lifecycle | Integration / Security / Retention | Pending |
| AC-028 | PERFORMANCE_PROFILE_V1 sample/workload/reporting/SLO and separate stress/reuse rules work | Performance | Pending |

## Unit Tests

- Validate one-file, DOCX-only, inclusive 10 MiB, no-page-limit, metadata, and authorization rules.
- Validate stable status transitions, terminal-outcome exclusivity per attempt, and the explicit `CANCELLED -> RESUMING` workflow transition.
- Validate deterministic normalization and stable ID derivation/allocation rules.
- Validate all canonical block-family invariants, ordinals, nesting, relationships, and source locators.
- Validate asset metadata/reference and prohibited-payload rules.
- Validate every stable issue code and BR-016/BR-017 severity; ambiguous cases block.
- Validate reuse tuple eligibility and every mismatch reason.
- Validate retry classification/count/backoff eligibility and cancellation transitions.
- Validate cancellation/Undo authorization, latest-event freshness, server-time 30-second boundary, atomic completion race, idempotency scope, and first-incomplete-stage selection.
- Validate schema-version compatibility and immutable version/predecessor rules.
- Validate retention deadlines, legal holds, reference-safe asset deletion, and restore eligibility.
- Validate every exact SECURITY_PROFILE_V1 boundary and configuration-version identity.
- Validate deterministic Presentation MathML normalization and formula severity.
- Validate BR-030 shape-family and relationship severity.
- Validate tenant-scoped physical asset keying without semantic-record collapse.

## Contract Tests

- Validate minimal and maximal valid Canonical Document fixtures.
- Reject missing/duplicate IDs, invalid version/status, ordinal gaps/duplicates, broken parents, cycles where prohibited, broken relationships, missing assets, invalid issue severity/downstream flag, unknown block types, arbitrary payloads, and prohibited URLs/paths/binaries.
- Verify each block family contract: heading, paragraph, list/item, table/row/cell/span, image, formula, and shape.
- Verify formula contracts contain normalized Presentation MathML, optional normalized linear/LaTeX, private source-fragment reference, conversion status, and no raw OMML dependency.
- Verify handoff never includes temporary parser output or DOCX XML structures.
- Verify consumers explicitly accept supported schema versions and reject unsupported ones.
- Verify issue/error/status codes remain backward compatible within their declared version.

## Golden Document Tests

- Minimal text document.
- Multi-level headings and paragraphs preserving order.
- Ordered/unordered nested lists with continuation.
- Tables with merged cells, nested paragraphs/lists, and reading order.
- Inline/floating images with captions/adjacent labels and duplicate bytes at distinct semantic locations.
- Supported formulas and formula fallback/blocker fixtures.
- Supported shapes, grouped/positioned relationships, text boxes, and unsupported shape fixtures.
- SmartArt, charts/diagrams, ink, OLE, ActiveX/content parts, connectors, decorative shapes, unreadable text, and ambiguous shape fixtures.
- Mixed document containing all supported families and adjacent-element relationships.
- Presentation-only styling/decorative loss warning fixture.
- Meaning-affecting missing/broken relationship and unsupported-element blocker fixtures.
- Empty meaningful-content fixture.

Each golden fixture is canonicalized repeatedly and across worker restart to verify deterministic equivalent output.

## Integration Tests

- Stream private source, hash it, validate it, persist source/attempt/canonical/block/asset/issue/audit records, and retrieve authorized output.
- Fail atomically at each persistence/storage boundary so consumers never observe success with missing data/assets.
- Verify asset object and metadata consistency, content hash, tenant scoping, authorized access, and deletion reference counts.
- Verify same-tenant cross-workflow physical deduplication and distinct semantic references; prohibit all cross-tenant sharing/match observation.
- Verify reuse with complete matching tuple/assets and reprocessing for each mismatch/missing-asset condition.
- Verify correlation and version provenance across command, workflow, parser, storage, database, and handoff.
- Verify stable cancellation event, authoritative timestamps, preserved-stage set, one logical resume attempt/outcome, and immutable cancel/resume audit trail.
- Verify duplicate and concurrent cancel/Undo API delivery converges without duplicate attempts, audit side effects, or handoff.
- Verify migration/recanonicalization creates a linked immutable version and leaves prior output unchanged.
- Verify local object storage/database/workflow/parser/malware interfaces preserve production contracts and failure semantics.

## Workflow Tests

- Full success and success-with-warning paths.
- Each permanent pre-parser/source/security failure invokes no parser.
- Each blocking canonical failure publishes no successful handoff.
- Transient failure at each eligible stage retries with backoff and stops after three total attempts.
- Permanent and business/schema failures never auto-retry.
- Retry resumes the first eligible failed stage and reuses prior valid stage output.
- Duplicate command/activity deliveries do not duplicate logical data or audit side effects.
- Worker interruption/restart at every stage resumes durably.
- Cancellation before/during each eligible stage stops future work and successful handoff, preserves valid committed stage output, and remains distinct from deletion.
- Undo just before `undoExpiresAt` succeeds when otherwise eligible; Undo exactly at or after expiry is rejected non-destructively; client clock never determines eligibility.
- Duplicate/concurrent Undo creates one logical resume attempt and reuses all valid completed stages.
- Expired, stale, unauthorized, wrong-cancellation, already-resumed, and duplicate-completed Undo returns explicit non-destructive outcomes.
- Successful completion winning the atomic race rejects cancellation with no Undo; cancellation winning the race prevents handoff until resumed.
- Worker interruption during cancellation or resumption recovers to one durable outcome.
- Eligible reuse short-circuits parsing after all eligibility/asset checks and records reuse provenance.

## Security Tests

- Fake extension/MIME/signature, malformed ZIP/DOCX, missing required parts, corruption/truncation, encryption/password, macro-enabled content, and disguised package.
- Malware-positive/quarantined source and scanner failure behavior.
- ClamAV INSTREAM with 12 MiB limit, 10-second timeout, fresh/stale signature boundary, unknown/error/unavailable fail-closed behavior, safe Unix-socket connectivity, and real EICAR detection.
- Zip Slip/path traversal, excessive entry count, expansion/compression bomb, nested archive abuse, oversized asset, XML external entity, entity expansion, excessive XML depth/nodes, external relationship fetch attempt, and resource exhaustion.
- Parser isolation prevents network fetch, active content execution, host-path escape, unauthorized filesystem access, and cross-job temporary-file access.
- Teacher/Admin/support/service role authorization and cross-tenant attempts for submit/status/result/retry/cancel/delete/asset access.
- Support grant missing, expired, wrong tenant/resource, or used outside its allowed action.
- Log/metric/trace/audit/issue injection checks prove no full source, canonical content, raw XML, image bytes, answers, secrets, object keys where sensitive, or signed URLs leak.

## UX Contract and Accessibility Tests

- Exam Creation renders exactly five teacher-facing ingestion stages: Checking file, Reading document, Preparing content, Validating content, and Ready.
- Tracker exposes current/completed/failed semantics without percentage, elapsed-time, or remaining-time estimates and without internal workflow names as primary labels.
- Narrow-screen contract supports a vertical tracker without horizontal scrolling or loss of current/completed state.
- Immediate wrong-type/over-10-MB errors bind to the upload field and preserve valid Setup metadata and mode selection.
- Non-blocking warnings appear below the completed tracker, do not interrupt AI handoff, persist through Review & Edit and Approval, and show count plus first warning with View all warnings for multiple issues.
- Blocking failure retains the tracker, marks the failed stage, moves focus to the error-card heading, supplies preserved-work text, and emphasizes exactly one permitted recovery action without a continue override.
- Technical details are collapsed by default and expose only authorized safe attempt, parser, issue, correlation, and provenance data.
- Reuse displays the subtle Previously processed document reused note and does not imply a new parse.
- Completed ingestion remains visible while subsequent AI-processing status appears beneath it.
- Immediate cancellation exposes Undo until `undoExpiresAt`; the control disables while pending and presents resumed, expired, stale, unauthorized, duplicate-completed, and failed outcomes accessibly.
- Status, severity, selection, completion, failure, and warning meaning remain perceivable without color, animation, or visual position alone.

## Retention and Recovery Tests

- Original source/canonical lifetime and 30-day recoverable deletion.
- Temporary and failed processing payload removal within 7 days.
- Failed-attempt metadata retained for 1 year.
- Required audit events retained for 7 years.
- Tenant/legal deletion earlier than normal policy.
- Legal hold suppresses deletion and its removal safely resumes policy.
- Asset with live references is retained; last-reference deletion follows recovery/hold rules.
- Cancellation does not trigger deletion.

## Performance Tests

- Run four 1-vCPU/512-MiB workers with four simultaneous fresh ingestions and sustained arrivals no greater than four/minute.
- Complete at least 100 fresh samples, including at least 20 at 8–10 MiB, 20 mixed-complexity, and 20% with assets.
- Measure durable RECEIVED to atomically available terminal result including queue, scan, hash, reuse check, parse, transform, asset storage, validation, persistence, and handoff.
- Report end-to-end P50/P95/P99/max and per-stage P50/P95.
- Confirm terminal result within 60 seconds at P95 and identify stage contributions.
- Confirm metrics omit sensitive content and distinguish parsing, transformation, asset storage, validation, persistence, retry, and reuse.
- Confirm reuse performance is measured separately and not used to hide fresh-canonicalization target failure.
- Run eight-concurrent stress separately; require correctness/isolation/resource safety without applying or claiming the 60-second SLO.

## Error Case Tests

- Every error listed in Section 12 maps to a stable code, safe message, retryability, terminal/non-terminal status, preserved-work statement, and recommended action.
- Storage/database/worker/malware dependency outages classify transient versus permanent behavior correctly.
- Hash mismatch, missing reused asset, incompatible schema, stale cancel/retry/Undo, expired or unauthorized Undo, resume failure, cancellation/completion race, retention failure, and performance-metric absence are explicit.
- No error path silently drops a supported or unsupported source element.

## Test Data

- Synthetic, non-sensitive DOCX golden fixtures for every required block family and relationship.
- Boundary files at 0 meaningful content, just under 10 MiB, exactly 10 MiB, and one byte over 10 MiB.
- Exact/boundary-plus-one fixtures for 2,000 ZIP entries, 100 MiB expansion, 100:1 ratios, 512-character paths, 20 MiB XML parts, depth 64, 250,000 nodes/part, 1,000,000 nodes/package, 10 MiB assets, 30 CPU seconds, 45 wall seconds, 128 MiB temp, and 64 PIDs.
- Formula normalization/private-OMML fixtures and every BR-030 shape family/severity fixture.
- ClamAV clean/EICAR/stale/unavailable/timeout fixtures.
- Same-tenant/different-workflow and cross-tenant asset-deduplication fixtures.
- Corrupt, encrypted, macro-enabled, fake-type, malware-test, archive/XML attack, unsafe relationship, and resource-limit fixtures.
- Versioned valid/invalid Canonical Document contracts and consumer compatibility fixtures.
- Same-hash/different-parser/schema/config/security-scope and missing-asset reuse fixtures.
- Two-tenant role/service/support-grant fixtures.
- Clock-controlled retention/legal-hold fixtures.
- Server-clock-controlled cancellation/Undo fixtures at pre-expiry, exact-expiry, and post-expiry boundaries plus duplicate/concurrent delivery.
- Fault-injection fixtures for every stage and persistence boundary.

## Completion Criteria

- AC-001 through AC-028 each have at least one implemented, passing mapped test.
- Mandatory unit, contract, golden, integration, workflow, security, retention, recovery, local-parity, migration, boundary, and performance suites pass.
- Canonical transformation and severity logic reach at least 90% unit coverage where practical, with no untested security, integrity, idempotency, or handoff branch.
- Determinism tests pass across repeated runs and worker restart.
- No consumer can receive partial/failed/cancelled canonical output.
- No sensitive-content leakage test fails.
- P95 is reported under PERFORMANCE_PROFILE_V1 and meets 60 seconds for fresh valid canonicalization through 10 MiB.
- Every confirmed defect affecting semantic order, assets, relationships, severity, reuse, isolation, or tenant access gains a regression fixture.
- All confirmed Lyra UX contract and accessibility tests pass.
- Required correctness/security tests are release-blocking and cannot be skipped.
