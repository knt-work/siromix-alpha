# DOCX Ingestion Specification

## 1. Objective

Securely accept exactly one DOCX source for an exam-creation workflow and transform it once into a deterministic, reusable, versioned Canonical Document with separately stored assets, explicit warnings/errors, complete provenance, and a stable handoff contract for Exam Creation and future AI Processing.

The feature succeeds when downstream systems can consume canonical data without opening DOCX internals and when unsupported, unsafe, or meaning-affecting source conditions never cause silent loss.

## 2. Context

DOCX Ingestion is the format-boundary upstream of Exam Creation and AI Processing. It owns safe source validation, DOCX package parsing, canonical transformation, asset extraction/storage, Canonical Document validation, persistence/reuse, and ingestion-result publication.

It also owns the Canonical Document contract boundary in the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`. Foundation's `@siromix/contracts` remains limited to domain-neutral Foundation envelopes and must not contain, import, or re-export DOCX Ingestion contracts.

It implements SiroMix Constitution v1.1.0 principles for canonical data, parse-once reuse, stable identity, versioned contracts, no silent data loss, durable/idempotent processing, least privilege, local parity, and testable correctness.

Exam Creation remains the lifecycle orchestrator and decides whether an ingestion result permits AI processing according to the severity contract defined here. AI Processing consumes only a successful Canonical Document version; it does not inspect the DOCX or parser output.

**Specification Status:** Implementation Ready. The constitution check, Exam Creation and AI Processing boundary reconciliation, Lyra review, and architecture/security decisions are complete.

**Post-Reconciliation Constitution Check:** Passed against Constitution v1.1.0. DOCX Ingestion remains the sole Canonical Document owner; downstream AI consumes only successful compatible versions and never DOCX internals; security, deterministic reuse, no-silent-loss, tenant isolation, retention, local parity, and atomic handoff rules remain intact.

## 3. Related Specifications

- **Exam Creation:** `/specs/exam-creation/spec.md` is the only current neighboring feature specification. Its one-source, canonicalization, upload security, ingestion blocker/warning, retry, retention, authorization, observability, local-parity, performance, and handoff requirements constrain this feature.
- **AI Processing (future):** will consume the versioned Canonical Document contract and must not depend on DOCX internals, temporary parser output, or private binary payloads.
- **Mixing and Publishing (future):** do not consume ingestion output directly for their core behavior.
- **Constitution:** is the governing authority for conflicts.

Alignment resolution:

- Exam Creation's one-DOCX-per-workflow rule is preserved.
- Exam Creation's 10 MB, no-page-limit, security, blocker/warning, three-attempt canonicalization, retention, authorization, observability, and P95 requirements are adopted without weakening.
- Ingestion warnings are classified here; Exam Creation owns their teacher-facing presentation and later approval acknowledgement.
- Canonical schema ownership is assigned exclusively to DOCX Ingestion. Exam Creation and AI Processing are consumers.

## 4. User Roles

- **Teacher:** may submit and view ingestion status/results only for an authorized tenant workflow; does not control parser behavior or bypass blockers.
- **Tenant Admin:** may view tenant-scoped status/audit metadata, retry eligible failed ingestion, cancel an unapproved workflow, and perform authorized deletion; may not bypass security or integrity validation.
- **Platform support:** may view operational metadata only by default. Source, canonical content, or assets require an explicit, time-limited, tenant-scoped, audited support grant.
- **System worker:** processes authorized ingestion commands under least-privilege service identity.

Authorization and tenant isolation must be enforced server-side and in storage access.

## 5. Business Rules

- **BR-001:** Each ingestion workflow accepts exactly one source file and only the DOCX format. Multiple files, replacement within the same workflow, source merging, and non-DOCX formats are rejected.
- **BR-002:** The source must be no larger than 10 MiB (10,485,760 bytes), presented to users as the existing 10 MB product limit. No page-count limit applies.
- **BR-003:** Before parsing, validate filename extension, declared MIME type, detected type, ZIP/DOCX package structure, required package parts/relationships, malware result, archive entry count, expanded size, compression behavior, and configured decompression-safety limits.
- **BR-004:** Reject corrupt, truncated, encrypted/password-protected, macro-enabled, disguised, malware-positive, path-traversing, external-entity/unsafe-reference, decompression-bomb, or otherwise unsafe packages.
- **BR-005:** Untrusted packages must be inspected and parsed in an isolated, resource-bounded environment. No embedded executable content, external relationship, macro, or active content may execute or be fetched.
- **BR-006:** A source version receives a SHA-256 content hash or equivalently collision-resistant approved hash before canonicalization. The hash, byte size, validation result, tenant, and source identity are recorded.
- **BR-007:** Canonicalization must be deterministic for the tuple `(source content hash, parser identity/version, Canonical Document schema version, canonicalization configuration version)`.
- **BR-008:** Repeating an ingestion command with the same idempotency scope and tuple must return or converge on the same logical Canonical Document version and assets without duplicate durable records.
- **BR-009:** A previously successful canonical result may be reused only when the source hash, parser identity/version, schema version, canonicalization configuration version, tenant/security scope, and required asset availability match. Reuse is recorded as an audit/provenance event.
- **BR-010:** A parser, schema, or canonicalization-configuration change creates or selects a new Canonical Document version; it never silently mutates a prior version.
- **BR-011:** Canonicalization preserves document semantic order and meaningful structure, including headings, paragraphs, lists, tables, images, formulas, shapes, notes/labels where supported, and relationships between adjacent elements.
- **BR-012:** Every canonical block has a stable identifier within its Canonical Document version, explicit type, ordinal position, normalized content appropriate to its type, source locator/provenance, relationship references, and validation status.
- **BR-013:** Binary assets are extracted, content-hashed, stored privately outside the Canonical Document payload, and referenced by stable asset identifiers. Duplicate bytes within the authorized scope may reuse storage without collapsing distinct semantic references.
- **BR-014:** The Canonical Document must never contain temporary filesystem paths, uncontrolled embedded binary payloads, signed URLs, credentials, or renderer-specific pagination.
- **BR-015:** Unsupported or lossy content must produce a machine-readable issue with stable code, severity, source locator, affected block/asset where known, human-safe summary, and whether downstream processing is permitted.
- **BR-016:** A **blocking error** prevents successful Canonical Document handoff when: source/security validation fails; a valid canonical schema cannot be produced; meaningful source content is absent; semantic order cannot be preserved; required images, tables, formulas, shapes, or relationships are missing/broken; or unsupported/lost content could affect a question, answer, or interpretation.
- **BR-017:** A **non-blocking warning** permits successful handoff only when the condition affects presentation or decorative content and cannot change educational meaning, question interpretation, answer correctness, or required relationship structure.
- **BR-018:** Ambiguous severity defaults to blocking. No parser fallback may silently downgrade or omit an issue.
- **BR-019:** Canonicalization transient infrastructure failures receive at most three total attempts with backoff. Permanent source/security/schema/business failures are not automatically retried. Every attempt is durably recorded.
- **BR-020:** Cancellation stops future eligible work but does not erase committed provenance, audit, retention-controlled records, or valid completed-stage output. A retry or resume continues from the first incomplete eligible stage and reuses successful valid prior stages.
- **BR-021:** Original DOCX and Canonical Document versions are retained while the related exam exists, followed by a 30-day recoverable deletion period. Temporary files and failed processing payloads are deleted after 7 days. Failed-attempt metadata is retained for 1 year. Security, authorization, retry, reuse, cancellation, deletion, and support-access audit events are retained for 7 years. Tenant/legal deletion and documented legal hold override normal schedules.
- **BR-022:** Core downstream queries and processing must not require reopening the DOCX. A successful handoff consists of persisted canonical data, stable asset references, issues, status, and provenance.
- **BR-023:** An accepted Tenant Admin cancellation creates one stable cancellation event, records the server-side cancellation timestamp, transitions the non-terminal ingestion workflow to `CANCELLED`, and prevents successful downstream handoff until a later resume completes. The UI offers Undo for exactly 30 seconds from the committed server timestamp.
- **BR-024:** Undo is an authorized idempotent resume command scoped to the stable cancellation event. Repeated or concurrent Undo delivery creates at most one logical resume attempt, records one logical resume outcome, transitions through `RESUMING`, and reuses all committed valid stage output. Undo does not delete or rewrite the cancellation audit event.
- **BR-025:** `undoExpiresAt` equals the committed cancellation timestamp plus 30 seconds. Undo is accepted only when the referenced cancellation is the workflow's latest effective cancellation, the workflow has not already resumed or reached another terminal result, the caller remains an authorized Tenant Admin, and authoritative server time is strictly earlier than `undoExpiresAt`. At or after expiry, stale, unauthorized, or duplicate-completed Undo returns an explicit non-destructive outcome.
- **BR-026:** Cancellation and stage completion use optimistic concurrency or an equivalent atomic state check. If successful terminal completion commits first, cancellation is rejected as already completed and no Undo is offered. If cancellation commits first, no success handoff is published; an in-flight stage may finish only as preserved reusable work for a later resume.
- **BR-027 — SECURITY_PROFILE_V1:** A package may contain at most 2,000 ZIP entries, expand to at most 100 MiB total, and have at most a 100:1 compression ratio per entry and in aggregate. Nested archives are rejected. Internal paths are limited to 512 characters. Each XML part is limited to 20 MiB, depth 64, and 250,000 nodes; the package is limited to 1,000,000 XML nodes. DTDs, entity declarations/resolution, XInclude, and external access are disabled and rejected. Each binary asset is limited to 10 MiB.
- **BR-028 — Parser isolation:** Each parser job runs with no network, at most 1 vCPU, 512 MiB memory, 30 CPU seconds, 45 wall-clock seconds, 128 MiB temporary storage, and 64 processes. Exceeding any limit is a blocking, non-retryable source/resource-policy result unless an infrastructure fault independently caused the breach.
- **BR-029 — Formulas:** The canonical primary formula representation is deterministic normalized Presentation MathML. A normalized linear/LaTeX representation may be included as a derived aid. Original OMML is stored privately through a stable source-fragment reference and is never a downstream dependency. Failed or ambiguous meaning-preserving conversion blocks; demonstrably decorative-only loss may warn.
- **BR-030 — Shapes:** MVP supports text boxes, simple shapes with text, lines/arrows, supported connectors, pictures, and groups/canvases only when every child and deterministic reading/relationship order are supported. Decorative-only shapes warn. SmartArt, meaning-bearing charts/diagrams, ink, OLE, ActiveX/content parts, unsupported groups, unreadable text, or lost meaningful relationships block. Ambiguity blocks.
- **BR-031 — Malware:** Production scanning uses ClamAV `clamd` through `INSTREAM`, preferably over a Unix socket; no unauthenticated/unencrypted clamd TCP endpoint may be exposed to an untrusted network. `StreamMaxLength` is 12 MiB, scan timeout is 10 seconds, signatures are maintained with `freshclam` and must be no older than 24 hours. Unknown, unavailable, timeout, error, or stale-signature verdicts fail closed. Local development uses containerized ClamAV through the same adapter; deterministic fakes are test-only and a real ClamAV/EICAR integration test is mandatory.
- **BR-032 — Asset deduplication:** Physical asset bytes may deduplicate across workflows only inside one tenant using a tenant-scoped HMAC of the SHA-256 bytes or equivalent tenant-private content key. Every semantic occurrence retains a distinct CanonicalAsset record/reference. Cross-tenant deduplication and observable match behavior are prohibited. Encryption, reference counting, retention, recovery, deletion, and legal holds remain tenant-scoped.
- **BR-033 — PERFORMANCE_PROFILE_V1:** Qualification uses four workers at 1 vCPU/512 MiB each, four simultaneous fresh ingestions, sustained arrivals no greater than four per minute, and at least 100 fresh samples: at least 20 between 8–10 MiB, at least 20 mixed-complexity, and at least 20% with assets. Measure durable `RECEIVED` through atomically available terminal canonical result including normal queue time and every ingestion stage. Fresh P95 must be at most 60 seconds; report end-to-end P50/P95/P99/max and per-stage P50/P95. Reuse is reported separately. An eight-concurrent stress test protects correctness but is outside the 60-second SLO.

## 6. Functional Requirements

- **FR-001 — Accept command:** Accept an authorized, tenant-scoped ingestion command containing workflow/source identifiers, private object reference, expected source metadata, correlation ID, and idempotency key.
- **FR-002 — Validate source:** Apply BR-001 through BR-005 plus SECURITY_PROFILE_V1 and the malware contract before canonicalization. Persist a durable validation result and reject unsafe/invalid sources without invoking the parser.
- **FR-003 — Hash source:** Stream and record the source content hash and byte count without exposing content in logs.
- **FR-004 — Resolve reuse:** Before parsing, evaluate BR-009 reuse eligibility. Return the existing successful result when eligible; otherwise record why reprocessing is required.
- **FR-005 — Parse package:** Read DOCX package parts and relationships under BR-028 isolation without executing or fetching active/external content. Temporary parser output remains internal and is never a downstream contract.
- **FR-006 — Transform canonically:** Convert supported elements into ordered canonical blocks, preserve nesting and adjacency relationships, apply BR-029 formula and BR-030 shape rules, and generate explicit issues for every unsupported/lossy condition.
- **FR-007 — Extract assets:** Extract supported binary assets, validate their type/size/hash, store/deduplicate them under BR-032, and bind distinct stable semantic asset references to canonical blocks.
- **FR-008 — Validate contract:** Validate the complete result against the versioned Canonical Document schema plus cross-reference, ordinal, relationship, asset, and semantic-integrity rules.
- **FR-009 — Classify outcome:** Produce exactly one terminal outcome: `SUCCEEDED`, `SUCCEEDED_WITH_WARNINGS`, `FAILED_PERMANENT`, or `CANCELLED`. Retryable failures use durable non-terminal state until attempts are exhausted, then become `FAILED_PERMANENT`.
- **FR-010 — Persist atomically:** Persist the Canonical Document version, block records, asset metadata/references, issue set, provenance, status, and reuse information so consumers never observe a falsely successful partial result.
- **FR-011 — Publish handoff:** Notify Exam Creation of terminal status and expose the successful Canonical Document version identifier, schema version, issues, and provenance. AI Processing may receive only `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` results.
- **FR-012 — Retry/cancel/undo:** Enforce BR-019, BR-020, and BR-023 through BR-026 for retries, cancellation, and Undo. Return stable cancellation ID, authoritative cancellation/expiry timestamps, Undo eligibility, idempotent resume outcome, current status, and preserved-stage information without relying on client time.
- **FR-013 — Observe/audit:** Emit privacy-safe structured logs, stage metrics, trace/correlation identifiers, attempt records, and audit events without full source text, extracted educational content, answers, raw XML, or binary payloads.
- **FR-014 — Retain/delete:** Apply BR-021 schedules, recoverable deletion, legal hold, tenant/legal deletion, and referentially safe deletion of source, canonical, and asset records.
- **FR-015 — Retrieve result:** Permit authorized consumers to retrieve a Canonical Document version and authorized asset access references without exposing storage credentials or cross-tenant data.

## 7. Non-Functional Requirements

- **NFR-001 Security:** Apply least privilege, tenant-aware authorization, isolated/resource-bounded parsing, malware checks, safe archive/XML processing, private storage, encryption in transit/at rest, and auditable access.
- **NFR-002 Privacy:** Logs, metrics, traces, and routine audit details must not contain full documents, canonical content, raw XML, extracted images, answers, secrets, or signed URLs.
- **NFR-003 Determinism:** Identical BR-007 tuples must produce semantically and byte-canonically equivalent contract output apart from explicitly excluded runtime metadata such as timestamps and attempt identifiers.
- **NFR-004 Idempotency:** Duplicate commands or activity deliveries must not create duplicate logical source, Canonical Document, block, asset, issue, attempt, or audit-side-effect records.
- **NFR-005 Performance:** Under PERFORMANCE_PROFILE_V1, fresh valid DOCX files up to 10 MiB reach a validated atomically available terminal canonical result within 60 seconds at P95, excluding a declared infrastructure incident. Required percentiles and per-stage metrics follow BR-033.
- **NFR-006 Availability/Recovery:** Durable stage state survives worker restart. Successful stages are reused after recovery and no consumer receives success before atomic persistence completes.
- **NFR-007 Compatibility:** Persisted and cross-component contracts are versioned and migration-aware. Consumers declare supported schema versions, and unsupported versions fail explicitly.
- **NFR-008 Local parity:** Local development uses contract-compatible workflow, parser, containerized ClamAV, database, and object-storage interfaces and can simulate blocking, warning, retry, cancellation, scanner, and storage failures without production credentials. A deterministic malware fake is limited to automated tests.
- **NFR-009 Scalability:** Processing is asynchronous and horizontally distributable by workflow/source ID without relying on local process memory or shared temporary paths.
- **NFR-010 Maintainability:** A new parser implementation may replace the current parser behind the same versioned contract without changes to AI, mixing, publishing, or Draft/Master domain models.
- **NFR-011 Rollback:** Deployment rollback does not mutate or reinterpret prior Canonical Document versions; incompatible workers must reject unsupported schema/configuration versions.
- **NFR-012 Accessibility:** Exam Creation receives stable, teacher-safe issue summaries and statuses sufficient for accessible presentation; ingestion does not own UI layout.

## 8. Data Requirements

### 8.1 Logical Entities

- **SourceDocumentVersion:** stable ID, workflow/tenant IDs, private object key, original filename, declared/detected type, byte size, content hash, validation result, malware result/reference, created actor/time, retention state, and legal-hold state.
- **IngestionAttempt:** stable ID and sequence, source ID, idempotency/correlation identifiers, parser/schema/configuration versions, current/terminal status, stage timestamps, retry/resume classification, cancellation-event/resumed-from references where applicable, failure/outcome code, worker identity/version, reuse decision, and privacy-safe metrics.
- **CanonicalDocumentVersion:** stable ID and version, tenant/workflow/source IDs, source hash, schema version, parser identity/version, configuration version, ordered block references, root relationships, issue references, asset references, terminal status, provenance, created time, retention state, and prior-version/migration relation where applicable.
- **CanonicalBlock:** stable ID within the document version, block type, ordinal, parent/container reference, normalized type-specific content, source locator, relationship references, issue references, and validation status.
- **CanonicalAsset:** stable semantic asset ID, tenant scope, content hash, tenant-private physical content key, media type, byte size, dimensions/metadata where safely derivable, private object key, validation status, source relationship locator, retention/legal-hold state, and tenant-scoped reference count/links.
- **IngestionIssue:** stable ID/code, severity (`BLOCKING_ERROR` or `WARNING`), category, safe summary, source locator, affected block/asset, downstream-permitted flag, and parser/schema/configuration versions.
- **IngestionAuditEvent:** stable ID, tenant/workflow/source/canonical/attempt references, cancellation/resume references where applicable, event type, actor/service identity, authoritative server timestamp, correlation ID, and minimal non-sensitive metadata.

### 8.2 Canonical Document Contract

The authoritative JSON Schema, compatibility metadata, TypeScript readers, and contract fixtures must live in the workspace package `@siromix/docx-ingestion-contracts` at `packages/docx-ingestion-contracts`. TypeScript consumers import `@siromix/docx-ingestion-contracts` directly rather than through `@siromix/contracts`. A Python binding may be generated into the document worker only when generation provenance and conformance tests trace it to the authoritative feature-owned schema; the worker copy is not a second source of truth.

The persisted and handoff contract must contain:

- `schemaVersion`
- `canonicalDocumentId` and `canonicalDocumentVersion`
- `tenantId`, `workflowId`, and `sourceDocumentVersionId`
- `sourceContentHash`
- `parserIdentity` and `parserVersion`
- `canonicalizationConfigVersion`
- `status`
- ordered `blocks`
- stable `assetReferences`
- stable `relationships`
- `issues`
- `provenance`, including ingestion attempt and creation time

Required block families:

- `heading`: level and inline content
- `paragraph`: inline content and paragraph semantics
- `list`: ordered/unordered type, nesting, and item relationships
- `table`: rows, cells, spans, nested supported blocks, and reading order
- `image`: stable asset reference, alternative/description metadata when present, and placement relationship
- `formula`: normalized Presentation MathML, optional normalized linear/LaTeX representation, stable private OMML source-fragment reference, conversion status, source locator, and issues
- `shape`: supported shape family, semantic/textual content, stable related assets where needed, and deterministic placement/group/connector relationships

The schema must support explicit extension points without permitting unvalidated arbitrary payloads. Unknown block types or schema fields are not silently ignored by consumers.

### 8.3 Identity, Versioning, and Migration

- Source, attempt, Canonical Document, block, asset, issue, and audit identifiers are stable and opaque.
- Ordinals express semantic order; stable IDs express identity. Reordering must not be inferred from storage row order.
- Canonical versions are immutable after terminal persistence.
- Schema versions follow documented compatibility rules. A breaking representation change requires a new schema version.
- Migration/recanonicalization creates a new Canonical Document version linked to its predecessor and retains original provenance.
- Consumers must explicitly support or reject a schema version; hidden fallback conversion is prohibited.

### 8.4 Storage and Retention

- Original DOCX and binary assets are private object-storage objects; canonical structured data and metadata are persisted through approved repositories.
- Original OMML source fragments are private provenance objects; downstream consumers use normalized MathML/linear data and never depend on OMML.
- Physical asset storage may deduplicate only within a tenant while preserving distinct immutable semantic asset records and preventing observable cross-tenant matches.
- Temporary files use isolated storage, are never treated as authoritative, and are removed on stage completion or within the 7-day failed-payload limit.
- Asset deletion must respect all live references, recoverable-deletion windows, tenant scope, and legal holds.
- Retention follows BR-021 and remains aligned with Exam Creation.

## 9. User Experience Requirements

DOCX Ingestion has no standalone authoring UI. Exam Creation presents its status and issues.

### 9.1 User Goals

- Know whether the source is being checked, read, converted, or is ready.
- Understand whether a failure requires replacing the DOCX or retrying later.
- Know that completed work remains safe during retry.

### 9.2 Primary User Journey

1. Exam Creation submits one authorized DOCX.
2. Exam Creation displays a compact five-stage tracker: **Checking file → Reading document → Preparing content → Validating content → Ready**. The tracker identifies the current stage and completed stages.
3. On success, Exam Creation keeps the completed ingestion tracker visible and shows the next AI-processing status beneath it while continuing with the exact Canonical Document version.
4. On warning, Exam Creation displays a warning summary below the completed tracker, continues only because `downstreamPermitted` is true, and preserves the warnings for Review & Edit and Approval.
5. On failure, Exam Creation marks the failed tracker stage and shows one concise error card below the tracker containing preserved-work information and one emphasized recommended recovery action supplied by the outcome mapping.

### 9.3 Alternative User Flows

- Eligible transient failure retries automatically and resumes from the first failed stage.
- Authorized user returns later while processing continues.
- Tenant Admin triggers an eligible retry or cancels an unapproved workflow.
- After immediate cancellation, the Tenant Admin may use **Undo** until the server-provided 30-second expiry to request safe idempotent resumption from preserved valid work.
- Eligible identical input reuses a successful canonical result and reports reuse without pretending parsing ran again.

### 9.4 Interaction Rules

- Teacher-facing stages use safe language; technical identifiers and provenance are optional details.
- Attempt ID, parser version, issue code, correlation ID, and other safe provenance appear in a collapsed **Technical details** section beneath the relevant status, warning, or error information for authorized users.
- The compact tracker uses the five confirmed teacher-facing labels and must not expose internal workflow-state names as its primary labels.
- The tracker shows stage state only. It does not display percentages, elapsed time, or remaining-time estimates.
- Security errors do not expose scanner signatures, archive internals, filesystem paths, or exploitable diagnostic detail.
- Blocking errors never offer “continue anyway.”
- A blocking error keeps the five-stage tracker visible, marks the failed stage, and uses one error card below the tracker rather than replacing the screen or opening a modal.
- Warnings identify affected source location/content when safe and possible.
- Non-blocking warnings appear in a summary directly below the completed tracker and remain accessible during later Review & Edit and Approval steps.
- When multiple warnings exist, the summary shows the total warning count and first warning, plus **View all warnings** to expand the complete list.
- Retry is offered only for retryable outcomes; source replacement is recommended for permanent source failures.
- A reused result shows the subtle note **Previously processed document reused** below the completed tracker; detailed reuse provenance remains in Technical details.

### 9.5 Loading, Empty, Success, and Error States

- Indeterminate generic loading does not replace named durable stage status.
- Empty meaningful content is a blocking error.
- Success identifies whether warnings exist and whether an existing canonical result was reused.
- Reuse is not presented as a new parsing run or as a prominent success interruption.
- When AI Processing begins automatically, the completed ingestion tracker remains visible and the AI status appears beneath it.
- Technical details are collapsed by default and do not compete with the current stage, warning summary, or primary recovery action.
- Warning success does not interrupt downstream processing with a dialog.
- Retry exhaustion becomes a permanent failure with preserved-work information.
- The error card emphasizes exactly one primary recovery action, such as **Replace DOCX** for a permanent source failure or **Retry** for an eligible transient failure.

### 9.6 Validation, Feedback, and Recovery

- File-size/type/package failures are reported before parsing.
- File failures detectable during Setup, such as wrong type or exceeding the user-facing 10 MB limit (10 MiB enforced), appear inline beneath the upload field and preserve entered exam metadata and mode selection.
- Issue codes remain stable for support and tests; teacher summaries remain safe and actionable.
- Recovery never implies that completed valid stages will rerun when they are reusable.
- Cancellation and deletion are distinct; cancellation does not promise data deletion.
- Tenant Admin cancellation acts immediately without a confirmation dialog and displays **Undo** until the authoritative 30-second server expiry. Undo must disable while its request is pending, communicate whether processing resumed successfully, tolerate repeated delivery without duplicate work, and must not imply deleted data was restored. After expiry, the UI removes Undo and recovery uses the normal eligible retry/resume path.

### 9.7 Accessibility and Responsive Behavior

- Status and issue data supplied to Exam Creation include semantic severity, concise label, detailed safe message, affected-item reference where possible, and recommended action.
- Meaning must not depend on color, animation, or visual position.
- Progress changes must be announceable without excessive repeated notifications.
- When a blocking Processing failure appears, keyboard focus moves to the error-card heading so the message and recovery action are announced in context.
- On narrow screens, the five stages stack vertically and retain visible current/completed status without horizontal scrolling.

### 9.8 UX Decisions

- No standalone ingestion UI is introduced.
- Exam Creation owns presentation; Ingestion owns stable status/issue semantics.
- Ingestion progress appears as a compact five-stage tracker: Checking file, Reading document, Preparing content, Validating content, and Ready.
- Immediate file-check errors appear inline beneath the upload field without clearing Setup data.
- The tracker does not show percentage or time estimates.
- On narrow screens, tracker stages stack vertically.
- Authorized users can expand a collapsed Technical details section beneath status or error information.
- Reused canonical content is identified by a subtle completed-state note with provenance in Technical details.
- The completed ingestion tracker remains visible when the next AI-processing status appears beneath it.
- Tenant Admin cancellation is immediate and offers Undo for 30 seconds for safe resumption; cancellation remains distinct from deletion.
- Non-blocking warnings appear below the completed tracker, do not stop downstream processing, and remain visible through Review & Edit and Approval.
- Multiple-warning summaries show the count and first warning by default, with View all warnings expanding the complete list.
- Blocking failures mark the failed tracker stage and show one concise error card below it with preserved-work information and one emphasized recovery action.
- Blocking failure moves keyboard focus to the error-card heading.
- Blocking errors cannot be overridden.
- Presentation-only warnings permit downstream processing.

### 9.9 UX Open Questions

No unresolved high-impact ingestion UX question exists. Lyra may review issue wording when the Exam Creation interface is designed.

## 10. Workflow / User Flow

```text
RECEIVED
  -> VALIDATING_SOURCE
  -> HASHING_SOURCE
  -> CHECKING_REUSE
  -> PARSING_PACKAGE
  -> TRANSFORMING_CANONICAL
  -> EXTRACTING_ASSETS
  -> VALIDATING_CANONICAL
  -> PERSISTING_RESULT
  -> SUCCEEDED | SUCCEEDED_WITH_WARNINGS
```

Eligible stages may enter `FAILED_RETRYABLE` before the third total canonicalization attempt. Permanent/security/business/schema failures enter `FAILED_PERMANENT`. An authorized cancellation enters `CANCELLED`. Reuse may transition from `CHECKING_REUSE` directly to a successful terminal result after eligibility and asset-availability checks.

Cancellation/resumption subflow:

```text
NON_TERMINAL
  -> CANCELLED
      -> UNDO_REQUESTED (within server-provided 30-second window)
      -> RESUMING
      -> first incomplete eligible stage
```

Cancellation and successful completion compete through an atomic state check. A committed successful result cannot be cancelled. A committed cancellation prevents handoff until a valid resume completes. Duplicate cancellation or Undo delivery converges on the existing logical cancellation/resume outcome.

Stage ownership:

- **Upload/source validation:** source safety and eligibility; no parser call on failure.
- **DOCX package parsing:** internal package/relationship reading only.
- **Canonical transformation:** ordered semantic conversion and issue generation.
- **Asset extraction/storage:** private, validated, stable binary references.
- **Canonical schema validation:** structural and cross-reference correctness plus blocker/warning classification.
- **Persistence/reuse:** immutable version storage, atomic success, hash/version eligibility.
- **Handoff:** terminal status and versioned contract to Exam Creation/AI Processing.

## 11. Acceptance Criteria

- **AC-001:** Exactly one DOCX up to and including 10 MiB (10,485,760 bytes) is accepted per authorized workflow; no page limit is applied. Immediate file-check errors appear inline beneath the upload field without clearing valid Setup metadata or mode selection.
- **AC-002:** Extension/type/package/malware/archive/XML checks run before parsing and reject every BR-004 unsafe condition without executing or fetching active content.
- **AC-003:** An accepted source receives stable identity, content hash, tenant/workflow provenance, durable validation status, and private storage reference without sensitive log exposure.
- **AC-004:** Identical BR-007 tuples produce semantically and byte-canonically equivalent canonical output except excluded runtime metadata.
- **AC-005:** Duplicate commands and activity delivery converge on one logical result without duplicate source, canonical, block, asset, issue, attempt side effect, or audit event.
- **AC-006:** Eligible prior results are reused only under all BR-009 conditions; mismatched or missing assets/parser/schema/configuration/security scope force explicit reprocessing.
- **AC-007:** Ordered golden fixtures preserve headings, paragraphs, nested lists, tables/cell spans, images, formulas, shapes, nested supported content, and adjacency/containment relationships.
- **AC-008:** Every canonical block and asset has stable identity, explicit order/relationship metadata, source provenance, validation state, and no temporary path, signed URL, credential, or uncontrolled binary payload.
- **AC-009:** Meaning-affecting loss and every BR-016 condition produce a blocking terminal failure; presentation-only loss produces a machine-readable warning and successful permitted handoff; ambiguous severity blocks. Non-blocking warnings appear below the completed tracker, persist through review/approval, and when multiple exist show their count and first warning with View all warnings.
- **AC-010:** Canonical contract validation rejects invalid schema versions, duplicate/missing block IDs, broken ordinals/parents/relationships, missing assets, invalid issue severity, and unknown unsupported payloads.
- **AC-011:** Consumers receive only atomically persisted `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` Canonical Document versions and cannot consume partial/retryable/permanent/cancelled output.
- **AC-012:** Transient canonicalization infrastructure failure stops after three total attempts with backoff and attempt history; permanent failures do not retry automatically.
- **AC-013:** Retry resumes the first eligible failed stage and reuses valid prior stages; restart recovery and duplicate delivery do not corrupt or duplicate data.
- **AC-014:** Tenant Admin cancellation acts immediately through an atomic state check, creates one stable audited cancellation event, stops future eligible work and successful handoff, preserves reusable committed work, remains distinct from deletion, and exposes Undo until the authoritative 30-second server expiry. Authorized duplicate/concurrent Undo requests converge on one logical resume attempt from the first incomplete eligible stage; expired, stale, unauthorized, already-resumed, and completion-race outcomes are explicit and non-destructive.
- **AC-015:** Teacher, Tenant Admin, platform support, service identities, tenant isolation, private object access, and support grants enforce Section 4 and produce privacy-safe audit evidence.
- **AC-016:** Logs, metrics, traces, issue summaries, and audit records omit full documents, canonical educational content, raw XML, binary assets, answers, secrets, and signed URLs.
- **AC-017:** Retention, recoverable deletion, temporary cleanup, failed-attempt retention, seven-year audit retention, tenant/legal deletion, legal hold, and reference-safe asset deletion follow BR-021.
- **AC-018:** Local contract-compatible dependencies run success, warning, blocker, retry, reuse, restart, cancellation, storage failure, retention, and deletion paths without production credentials.
- **AC-019:** Under PERFORMANCE_PROFILE_V1, fresh valid supported DOCX files up to 10 MiB meet the 60-second P95 terminal-canonicalization target and expose all required distributions and stage metrics.
- **AC-020:** Parser, schema, or configuration upgrade creates an immutable linked Canonical Document version; unsupported consumer versions fail explicitly and rollback never reinterprets prior versions.
- **AC-021:** Exam Creation receives stable status data sufficient to render the stage-only compact five-stage tracker horizontally or vertically by screen width, mark a failed stage, move focus to the error-card heading, expose one recovery action, show collapsed Technical details, identify reuse subtly, preserve the completed tracker above later AI status, and present persistent non-blocking warnings without interrupting downstream processing. Terminal status, Canonical Document version, issues, provenance, and recommended recovery mapping are included. Future AI Processing receives only successful versioned canonical data and stable authorized asset references.
- **AC-022:** Ingestion performs no AI call, question extraction/generation, Question JSON validation, Draft/Master mutation, mixing, or publishing behavior. Its contracts remain isolated in `@siromix/docx-ingestion-contracts`; Foundation's `@siromix/contracts` neither contains nor re-exports them, and consumers depend on the declared feature package directly.
- **AC-023:** Every SECURITY_PROFILE_V1 byte/count/ratio/path/XML/asset boundary and BR-028 CPU/memory/time/storage/PID/network constraint is enforced at the exact boundary without partial handoff or sensitive diagnostics.
- **AC-024:** Formula fixtures produce deterministic normalized Presentation MathML and optional derived linear data with private OMML provenance; failed or ambiguous meaning-preserving conversion blocks and downstream contracts contain no OMML dependency.
- **AC-025:** Each BR-030 supported, warning, blocking, grouped, connector, ambiguous, and meaning-bearing shape case produces the specified canonical relationship and severity.
- **AC-026:** ClamAV production/local adapters enforce INSTREAM, 12 MiB stream limit, 10-second timeout, 24-hour signature freshness, fail-closed outcomes, safe connectivity, and mandatory real ClamAV/EICAR integration behavior.
- **AC-027:** Same-tenant identical bytes reuse physical storage while retaining distinct semantic references; different tenants never share or observe physical identity, and reference-count/retention/recovery/legal-hold races preserve all live data.
- **AC-028:** PERFORMANCE_PROFILE_V1 executes at least 100 qualifying fresh samples and reports the required distributions; fresh P95 is at most 60 seconds, reuse is separate, and eight-concurrent stress preserves correctness without claiming the SLO.

## 12. Error Cases

- Missing, multiple, non-DOCX, over-10-MB, extension/MIME/signature mismatch, corrupt, truncated, encrypted, password-protected, macro-enabled, or disguised source.
- Immediate upload-field validation failure must not clear valid exam metadata or mode selection.
- Malware-positive, path traversal, unsafe external relationship/entity, excessive archive entries, expansion/decompression bomb, resource exhaustion, or isolation failure.
- Object-storage read/write failure, missing source/object, hash mismatch, asset corruption, or unavailable reused asset.
- Missing/invalid required DOCX package parts, relationships, content types, numbering, styles, media, formulas, shapes, or XML.
- Empty meaningful content, lost semantic order, broken adjacency/containment, unsupported meaning-affecting content, or ambiguous severity.
- Duplicate/missing identifiers, invalid ordinals, cycles where prohibited, broken relationships, invalid asset references, unknown schema/block type, or schema validation failure.
- Worker interruption, stage timeout, transient database/storage failure, retry exhaustion, duplicate command/activity, stale cancellation, or unauthorized retry.
- Cancellation races with successful completion; duplicate cancellation; Undo is duplicated, pending, stale, expired, unauthorized, references the wrong/latest cancellation, arrives after resume, or fails during resumption.
- Cross-tenant access, unauthorized support content access, expired support grant, leaked sensitive diagnostics, or unsafe signed-access behavior.
- Premature/late deletion, orphaned live asset, failed temporary cleanup, legal-hold bypass, or recoverable deletion that cannot be restored.
- Performance target breach or missing stage metrics.
- Any SECURITY_PROFILE_V1 or parser-container limit exceeded, disabled feature encountered, or forbidden network attempt.
- Formula conversion failure/ambiguity, missing private OMML provenance, or OMML leaked as a downstream dependency.
- Unsupported/meaning-bearing shape loss or incorrectly downgraded shape warning.
- ClamAV unavailable/error/timeout/stale signatures, unsafe TCP exposure, or test fake used as a production/local integration substitute.
- Cross-tenant asset deduplication/match disclosure, incorrect semantic-reference collapse, or premature shared-byte deletion.

Every failure preserves committed valid data, emits a stable safe code, classifies retryability, and avoids silent loss or duplication.

## 13. Out of Scope

- AI prompts, model/provider calls, question extraction, question generation, embeddings, or RAG.
- Question JSON schema/domain validation, Draft Exam creation/editing, Master Exam approval/versioning, or answer correctness.
- Mixing, permutation/answer matrices, exam-code generation, or question-order permutation.
- Publishing, templates, previews, final DOCX/PDF/HTML/ZIP rendering, or pagination.
- OCR, scanned-document interpretation, non-DOCX formats, multiple-file ingestion, source merging, or batch ingestion.
- Teacher question editor UI or standalone ingestion administration UI.
- Renderer-specific layout reconstruction beyond semantic structure and source relationships required by the canonical contract.

## 14. Open Questions

No unresolved product, UX, security-profile, or architecture-contract question remains for the DOCX Ingestion MVP.
