# AI Processing Specification

## 1. Objective

Define the AI Processing engine boundary that consumes exactly one eligible, successful, compatible, versioned Canonical Document and produces an atomically persisted, validated, structured question result that Exam Creation can convert into a Draft Exam.

AI Processing supports `RAW_EXAM_EXTRACTION` and `KNOWLEDGE_BASED_GENERATION`. It owns request construction, provider interaction, response handling, structural/domain/grounding validation, bounded repair, candidate identities, result persistence, and terminal handoff. It never creates or mutates a Draft Exam or Master Exam.

## 2. Context

AI Processing is downstream of DOCX Ingestion and upstream of Exam Creation's Draft Exam creation. It implements SiroMix Constitution v1.1.0 requirements for canonical data, engine separation, untrusted AI output, versioned contracts, bounded and observable recovery, idempotency, privacy, local parity, and measurable cost.

It consumes only Canonical Document versions with terminal status `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`. It never reopens the original DOCX, reads DOCX XML or OMML, consumes temporary parser output/private source fragments, or changes canonical content. Formulas are consumed through normalized Presentation MathML. Binary assets are accessed only through authorized stable references.

**Specification Status:** Implementation Ready. The constitution check, neighboring-spec reconciliation, Lyra review, owner decisions OQ-001 through OQ-004, and Vega decisions VEGA-001 through VEGA-006 are complete.

**Post-Reconciliation Constitution Check:** Passed against Constitution v1.1.0. AI Processing consumes only canonical data, publishes only validated structured candidates, preserves Draft/Master ownership in Exam Creation, uses bounded/idempotent provider recovery, enforces tenant/privacy/cost controls, supports local parity and migration-safe contracts, and maps every acceptance criterion to required tests.

## 3. Related Specifications

- **Exam Creation:** `/specs/exam-creation/spec.md`, `tasks.md`, and `test-spec.md` define the two modes, Draft/Master lifecycle, retry/repair limits, regeneration behavior, authorization, retention, cost cap, and AI-to-Draft handoff requirements carried forward here.
- **DOCX Ingestion:** `/specs/docx-ingestion/spec.md`, `tasks.md`, and `test-spec.md` own the Canonical Document schema, statuses, issues, provenance, normalized Presentation MathML, and authorized asset references consumed here.
- **Constitution:** `/specs/constitution.md` governs engine boundaries, validated AI drafts, stable identities, privacy, reliability, testing, local parity, and migration safety.
- **Future Exam Creation implementation:** consumes validated Question JSON results and assigns persistent Draft and Master Exam identities.

Alignment resolutions:

- AI Processing assigns stable result-scoped candidate question IDs; Exam Creation owns persistent Draft and Master question identities and records their mapping to candidate IDs.
- Canonical warnings and provenance are copied or referenced without reclassification. An ingestion blocking error prevents request construction and provider invocation.
- The Question JSON Schema is owned and versioned by AI Processing; the Canonical Document schema remains owned by DOCX Ingestion.
- Repair is bounded correction of the original candidate response. Regeneration is a new authorized processing attempt and candidate and is orchestrated by Exam Creation.

## 4. User Roles

- **Teacher:** may initiate processing or regeneration through an authorized Exam Creation workflow and view its safe status/result.
- **Tenant Admin:** may inspect tenant-scoped operational metadata, retry eligible failures, cancel unapproved processing, and raise the workflow AI cost cap through an audited action; this role alone does not grant question editing or approval rights.
- **Platform support:** may view privacy-safe operational metadata by default; content access requires an explicit, time-limited, tenant-scoped, audited support grant.
- **Workflow service:** submits authorized, tenant-scoped processing requests and receives terminal handoff events.
- **AI worker/provider adapter:** operates under least-privilege service identity and may access only the request's authorized canonical content/assets and provider secret.

Authorization and tenant isolation are enforced server-side at command, persistence, asset, provider, result, retry, cancellation, and handoff boundaries.

## 5. Business Rules

- **BR-001 — Eligible input:** One processing attempt consumes exactly one immutable Canonical Document version whose ingestion status is `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS`, whose schema version is supported, whose assets are available through authorized stable references, and whose issues permit downstream processing.
- **BR-002 — Canonical boundary:** AI Processing never opens the DOCX, consumes DOCX XML, OMML, temporary parser output, or private source fragments, and never modifies, recanonicalizes, or reinterprets the Canonical Document contract. It consumes normalized Presentation MathML and authorized stable asset references.
- **BR-003 — Exclusive mode:** Each request selects exactly one mode: `RAW_EXAM_EXTRACTION` or `KNOWLEDGE_BASED_GENERATION`.
- **BR-004 — Extraction:** Extraction preserves source meaning, question order, answer relationships, tables, formulas, media/asset references, and source provenance; it does not intentionally invent additional questions. Ambiguous or incomplete source questions are explicit warnings or blocking domain outcomes, never silently completed.
- **BR-005 — Generation:** Generation is grounded only in the supplied Canonical Document. It accepts one integer `requestedQuestionCount` from 5 through 50 inclusive, defaults to 15 when omitted by an authorized upstream request, and a valid result contains exactly that count.
- **BR-006 — MVP question type:** The only supported question type is `SINGLE_ANSWER_MULTIPLE_CHOICE`, with exactly four non-empty ordered options labeled `A`, `B`, `C`, and `D`, exactly one correct-answer label, and an optional explanation where the schema permits it.
- **BR-007 — Untrusted output:** Provider output remains untrusted until JSON parsing, the declared Question JSON Schema, domain validation, reference validation, and mode-specific extraction/grounding validation all succeed.
- **BR-008 — Identities:** AI Processing assigns an immutable processing-result ID and stable result-scoped candidate question IDs. Candidate order is represented by contiguous one-based ordinals. Exam Creation maps candidate IDs to its own persistent Draft/Master question identities.
- **BR-009 — Provenance:** Every question records one or more valid source-block references and, where used, table/formula/image/asset references. Extraction provenance identifies the source representation of the question and answer relationship; generation provenance identifies evidence sufficient to assess grounding.
- **BR-010 — Versioned request:** Every request declares request-schema version, Question JSON Schema version, canonical ID/version/schema version, mode/parameters, prompt-template identity/version, provider/model selection or policy-resolved identity, processing-attempt ID, workflow/tenant scope, correlation ID, idempotency key, and cost-cap context.
- **BR-011 — Provider identity:** The persisted result records actual provider, model, provider endpoint/configuration identity where non-secret, prompt-template identity/version, adapter version, and provider request identity where available.
- **BR-012 — Structural repair:** A structurally invalid original response may receive at most two repair attempts. Repair uses the same processing-attempt identity, retains parent-response lineage, is charged to the same cost cap, and cannot change mode, requested count, canonical version, or question type.
- **BR-013 — Domain invalidity:** Domain-invalid output remaining after any applicable repair stops automatic processing and recommends teacher-initiated regeneration. Domain or grounding failures are not concealed by repeated repair.
- **BR-014 — Regeneration:** Regeneration creates a new processing attempt, provider-call scope, result candidate, and candidate question IDs. It never overwrites a prior processing result, Draft Exam, or Master Exam.
- **BR-015 — Provider retry:** Eligible transient provider/infrastructure failures receive no more than three total provider attempts with bounded backoff. Permanent configuration, authorization, refusal, policy, schema-compatibility, domain, cancellation, and cost-cap failures do not use transient retry.
- **BR-016 — Cost cap:** The default workflow AI cap is USD 1 equivalent. Warn when committed plus reserved cost reaches 80%; count original calls, automatic retries, repairs, and uncertain-outcome reservations; block further AI calls at the cap. Only an authorized Tenant Admin may raise the cap before another attempt. The cap never blocks editing or approval of an already valid Draft.
- **BR-017 — Usage accounting:** Record input/output/cached/reasoning tokens when provided, provider-native billable units, latency, provider-reported cost where available, normalized USD-equivalent cost, pricing source/version/time, reservation/estimate/finalization state, and aggregation by call, attempt, result, and workflow. Missing final usage is explicit and conservatively accounted.
- **BR-018 — Idempotency:** Duplicate request, command, activity, retry, repair, persistence, or handoff delivery must not create duplicate logical attempts, provider calls where preventable, responses, results, questions, usage charges, audit events, or Draft handoffs.
- **BR-019 — Uncertain provider outcomes:** A timeout or lost acknowledgement after request transmission enters `PROVIDER_OUTCOME_UNCERTAIN`. The same provider request/idempotency token is queried or reconciled when supported. A new billable call is prohibited until the prior outcome is resolved, declared irrecoverable under an approved timeout policy, or explicitly authorized with a conservative cost reservation and audit event.
- **BR-020 — Raw response retention:** Raw provider responses are encrypted and access-restricted while needed for parsing/validation/repair. They are deleted after validated structured data and required diagnostic metadata are durably stored, subject to legal hold or stricter tenant/legal deletion. Failed raw payloads follow Exam Creation's seven-day failed-payload maximum unless an earlier rule applies.
- **BR-021 — Atomic result:** Only one terminal validated result for a processing attempt may be atomically persisted and published. Exam Creation receives no partial, schema-invalid, domain-invalid, cancelled, or failed candidate.
- **BR-022 — Cancellation:** Cancellation is durable and idempotent, stops not-yet-started provider calls and downstream stages, attempts provider cancellation where supported, preserves already committed provenance/usage, and never publishes a validated result after cancellation wins the atomic terminal-state race.
- **BR-023 — Recovery:** Worker restart resumes from the first incomplete eligible stage and reuses immutable completed stage artifacts. Bounded retry/repair counters, cost reservations, cancellation, uncertain outcomes, and handoff publication state survive restart.
- **BR-024 — Error taxonomy:** Every issue has a stable machine-readable code, taxonomy version, category, stage, severity (`INFO`, `WARNING`, `BLOCKING`), retryability, repairability, terminality, safe message key, affected references, and recommended action. Categories include `PROVIDER_INFRASTRUCTURE`, `STRUCTURAL_RESPONSE`, `DOMAIN_VALIDATION`, `GROUNDING_EXTRACTION_AMBIGUITY`, `UNSUPPORTED_CANONICAL_CONTENT`, `COST_CAP`, `AUTHORIZATION_TENANT`, `CANONICAL_COMPATIBILITY`, `CANCELLATION`, and `PERMANENT_FAILURE`.
- **BR-025 — Validation completeness:** Validation covers required fields; schema/version/type discriminators; A–D labels/order; four non-empty options; one valid correct answer; duplicate options/questions/IDs/ordinals; empty/malformed/unsupported questions; question-answer and explanation consistency; valid structured content, source-block and asset references; provenance/grounding; extraction fidelity; generation count; provider refusal/truncation; malformed JSON; schema mismatch; incomplete output; and cross-question identity/order consistency.
- **BR-026 — Canonical warnings:** Applicable canonical warnings and provenance are preserved in the result without changing their ingestion code, severity, or meaning. Unsupported canonical content that prevents faithful extraction or grounded generation blocks before provider invocation when detectable, or becomes an explicit blocking validation outcome.
- **BR-027 — Provider interface:** All environments use the same provider-neutral AI Provider Interface. Local/automated tests use a deterministic fake/local provider with contract-compatible success, refusal, truncation, malformed output, timeout, rate limit, uncertain outcome, usage, latency, and cost behavior. Production-provider integration tests are separately controlled and excluded from the deterministic main suite.
- **BR-028 — Backward compatibility:** Persisted request/result/error schemas use semantic versions and declared compatibility windows. Additive compatible changes do not reinterpret old results; breaking changes require a new major version, migration/dual-read plan, consumer readiness, rollback plan, and immutable preservation of prior meaning.

- **BR-029 — Extraction ambiguity threshold:** Extraction blocks when question text, exactly four options, exactly one correct-answer relationship, assessable meaning, required structured content, or required provenance cannot be determined reliably from the Canonical Document. It may produce a warning only when the complete supported question contract remains valid and the ambiguity cannot affect meaning, option interpretation, answer correctness, or required references.
- **BR-030 — Explanation policy:** Explanations are omitted by default. Extraction preserves a source explanation when present and valid; generation does not request or invent an explanation in the MVP. Teachers may add or edit an explanation later in the Draft Exam without invoking AI.
- **BR-031 — Provider capability and uncertain-outcome policy:** Each provider adapter publishes versioned capabilities for idempotency tokens, status lookup, cancellation, usage reporting, privacy controls, and asset input. Every provider call receives one stable dispatch ID. When outcome is uncertain, adapters with idempotency/status support reconcile the same call; adapters without safe reconciliation reserve the maximum estimated call cost and prohibit automatic redispatch. A replacement call requires an explicit authorized new processing attempt after the uncertain call is resolved or permanently closed through an audited operator decision.
- **BR-032 — Cost normalization:** A versioned pricing catalog records provider/model, billable units, USD rates, effective interval, source, and currency-conversion source/time when non-USD pricing applies. Before dispatch, reserve the conservative maximum estimated cost from measured input plus configured maximum output. Finalize from provider usage when available. Missing or uncertain usage retains the reservation as estimated cost and is never treated as zero; later adjustments are immutable and audited.
- **BR-033 — Provider privacy baseline:** Production may use only allowlisted provider/model/configuration combinations whose data sent, region, retention, training, abuse-monitoring, asset handling, deletion behavior, and subprocessors are documented and approved. No-training and zero-retention or the shortest available approved retention are required where supported. Send only the minimum required canonical blocks and referenced assets; provider configuration and privacy-policy versions are recorded per call.
- **BR-034 — Compatibility window:** During MVP, writers emit one current major/minor contract version. Readers accept the current compatible version and the immediately previous compatible minor version. A breaking major version requires new readers and dual-read deployment before new writes, explicit consumer readiness, migration/backfill where needed, and a tested rollback matrix. Old immutable results retain their original schema and meaning.
- **BR-035 — Deterministic grounding and fidelity:** Every question and correct answer must cite valid source blocks; every claim required to interpret the question, options, answer, or preserved explanation must be supported by those blocks or referenced canonical structures. Validators deterministically check reference closure, evidence presence, extraction order, answer relationships, hashes/identities, and table/formula/media linkage. Embeddings, external knowledge, semantic retrieval, and probabilistic validator calls are not used.
- **BR-036 — AI_PROCESSING_PROFILE_V1:** Qualification runs at least 100 valid attempts with up to four simultaneous workflows and both modes. It includes requested generation counts 5, 15, and 50; at least 20 generation attempts requesting 50 questions; at least 20 extraction attempts; at least 20 complex canonical inputs containing tables, formulas, or media; and documented warm/cold conditions. The approved production provider/model/region and pricing/privacy configuration are fixed in the report. Measure durable request acceptance through atomic validated-result availability; report excluded provider outages separately and do not use them to hide internal latency.
- **BR-037 — Admin cap-request boundary:** Exam Creation owns the user-facing Admin cap-increase request and its lifecycle. AI Processing does not notify users or approve requests; it enforces the currently authorized cap and accepts an idempotent, audited cap-change notification only after Exam Creation records an authorized Tenant Admin approval.

## 6. Functional Requirements

- **FR-001 — Validate request:** Authorize and validate the versioned tenant/workflow-scoped request, mode parameters, identities, idempotency/correlation data, supported schema versions, and cost-cap context before provider work.
- **FR-002 — Validate canonical eligibility:** Retrieve only the declared immutable canonical version, verify BR-001/BR-002 compatibility, issues, content hash, asset availability/authorization, and reject ingestion blockers or incompatible schemas without invoking AI.
- **FR-003 — Construct context:** Build deterministic mode-specific context from eligible canonical blocks, normalized Presentation MathML, stable structured-content references, and authorized asset descriptors/content only as contractually required. Record the context-construction version and input hash.
- **FR-004 — Construct prompt:** Build a provider-neutral prompt envelope from the versioned template, request, context, output-schema constraints, mode rules, provenance requirements, and safety/privacy configuration; record prompt hash and template identity without ordinary prompt logging.
- **FR-005 — Invoke provider:** Invoke the configured adapter with stable call identity, deadline, idempotency token where supported, cost reservation, cancellation propagation, and BR-015/BR-019 controls.
- **FR-006 — Capture response:** Durably record response identity, encrypted temporary raw payload reference, finish/refusal/truncation signals, usage/cost/latency metadata, call lineage, and outcome certainty before parsing.
- **FR-007 — Parse and structurally validate:** Parse JSON and validate against the requested Question JSON Schema; classify refusal, truncation, malformed JSON, schema mismatch, and incomplete response using BR-024.
- **FR-008 — Domain and grounding validation:** Enforce BR-004 through BR-009 and BR-025, including exact-count generation, extraction fidelity, evidence grounding, references, duplicates, consistency, identities, and ordering.
- **FR-009 — Repair:** When structurally eligible, run no more than two repairs under BR-012, validate each response from the beginning, and retain lineage, usage, cost, and diagnostics.
- **FR-010 — Persist validated result:** Atomically persist the terminal validated result, questions, provenance, warnings, validation outcomes, usage/cost, hashes, timestamps, and terminal status, then schedule raw-response deletion.
- **FR-011 — Handoff:** Publish an idempotent terminal handoff containing the validated processing-result ID, attempt/workflow/tenant scope, schema version, result hash, and availability metadata. Exam Creation retrieves the full authorized validated contract and creates its own Draft identities.
- **FR-012 — Retry/recover/cancel:** Implement Temporal-compatible workflows and activities for every stage with durable transitions, bounded retry/backoff, heartbeat/checkpoint recovery, cancellation, uncertain-outcome reconciliation, and at-least-once delivery safety.
- **FR-013 — Observe and audit:** Emit privacy-safe structured logs, metrics, traces, attempt/stage events, cost events, authorization/cap changes, cancellation, regeneration, repair, raw-response deletion, and handoff events with correlation.
- **FR-014 — Migrate and roll back:** Validate deployed request/result/error/provider-adapter compatibility, support declared readers during rollout, reject unsupported versions explicitly, and preserve rollback access to prior immutable results.

- **FR-015 — Enforce approved architecture decisions:** Apply BR-029 through BR-036 to ambiguity classification, explanation handling, provider dispatch/reconciliation, cost reservation/finalization, provider privacy, compatibility, grounding/fidelity, and performance qualification.
- **FR-016 — Consume cap changes:** Accept only an idempotent tenant/workflow-scoped cap-change notification backed by an authorized Exam Creation approval record; re-evaluate future AI-call eligibility without changing any prior usage, result, Draft, or audit record.

## 7. Non-Functional Requirements

- **NFR-001 — Reliability:** Durable status and stage history survive worker restart; no eligible transient provider call exceeds three total attempts and no structural response exceeds two repairs.
- **NFR-002 — Idempotency:** Temporal at-least-once delivery converges on one logical effect per idempotency scope and prevents duplicate billable calls where practical.
- **NFR-003 — Security:** Enforce least privilege, server-side authorization, tenant-aware queries/object access, TLS in transit, approved encryption at rest, isolated provider secrets, and audited privileged access.
- **NFR-004 — Privacy:** Ordinary logs, metrics, traces, and audit metadata contain no complete prompts, source/canonical content, questions, options, answers, explanations, raw provider responses, asset bytes, credentials, or signed URLs.
- **NFR-005 — Provider governance:** Document per provider/model what canonical data/assets are sent, geographic/retention behavior, training/abuse-monitoring settings, deletion controls, subprocessors where applicable, and approved privacy configuration before production enablement.
- **NFR-006 — Performance:** Under `AI_PROCESSING_PROFILE_V1`, 95% of valid attempts complete within five minutes from durable request acceptance to atomically available validated result, excluding declared provider outages. Report end-to-end and per-stage P50/P95/P99/max, queue time, provider latency, retries, repairs, question count, tokens, and cost.
- **NFR-007 — Availability:** Monthly AI Processing service availability target is 99.5%, excluding announced maintenance and declared upstream/provider outages; reliability reporting distinguishes internal, canonical-input, and provider causes.
- **NFR-008 — Local parity:** Local development uses the same request/result schemas, workflow/activity contracts, validation, persistence, migrations, and provider interface with deterministic contract-compatible provider behavior.
- **NFR-009 — Maintainability:** Adding a provider adapter must not change Canonical Document, Question JSON, Draft/Master, mixing, or publishing contracts.
- **NFR-010 — Compatibility/rollback:** Rollback never reinterprets or mutates prior requests/results; incompatible workers fail closed with a stable compatibility error.
- **NFR-011 — Testability:** Deterministic suites cover every durable stage, error category, retry/repair/cancellation/idempotency branch, and validation invariant without live-provider dependence.

- **NFR-012 — Provider portability:** Provider capability declarations and normalized call/response/usage/error contracts must permit replacement without changing Question JSON, canonical input, Draft, or cost-cap semantics. A provider lacking a required privacy control cannot be enabled in production.

## 8. Data Requirements

### 8.1 Versioned AI Processing Request

Required logical fields:

- `requestSchemaVersion`, `questionSchemaVersion`
- `processingAttemptId`, `tenantId`, `examCreationWorkflowId`
- `canonicalDocumentId`, `canonicalDocumentVersion`, `canonicalSchemaVersion`, `canonicalContentHash`
- `mode`
- `parameters.requestedQuestionCount` only for generation (default 15; 5–50); extraction has no generation count
- `promptTemplateId`, `promptTemplateVersion`
- provider/model selection or approved policy identifier
- `correlationId`, `idempotencyKey`, optional causation/regeneration predecessor IDs
- cost-cap currency, limit, committed amount, reserved amount, and authorization context
- requester/service identity, timestamps, deadline/cancellation scope

Unknown major versions, unsupported parameters, question-type selection, multiple canonical inputs, or tenant/workflow mismatches are rejected before provider invocation.

### 8.2 Versioned Question JSON Result

The AI Processing-owned schema must include:

- `schemaVersion`
- `processingResultId`, `processingAttemptId`
- `tenantId`, `examCreationWorkflowId`
- Canonical Document ID/version/schema version/content hash
- mode and normalized parameters
- prompt-template ID/version and prompt/context hashes
- actual provider, model, adapter, and non-secret configuration identities
- ordered `questions` with stable result-scoped `candidateQuestionId` and contiguous `ordinal`
- question type fixed to `SINGLE_ANSWER_MULTIPLE_CHOICE`
- question text plus supported structured-content references
- exactly four ordered options `{label: A|B|C|D, text, structuredContentReferences[]}`
- exactly one `correctAnswerLabel`
- optional explanation plus references/evidence when present
- per-question source-block provenance and supported table/formula/image/asset references
- result/question validation outcomes and preserved canonical warnings
- usage, latency, provider billable units, pricing version, and USD-equivalent cost metadata
- request, provider-call, response, validation, repair, persistence, and completion timestamps
- terminal status fixed to `VALIDATED`
- canonicalized `resultHash` and optional provider content hash for integrity/idempotency

The schema must prohibit unsupported question types, arbitrary embedded binaries, temporary paths, DOCX/OMML/private source fragments, provider secrets, and uncontrolled URLs.

### 8.3 Durable Entities

- **AIProcessingAttempt:** request/provenance identities, attempt sequence, mode/parameters, durable status/current stage, retry/repair counts, cost state, cancellation, errors/warnings, timestamps, and predecessor for regeneration.
- **ProviderCall:** stable call ID/idempotency token, adapter/provider/model, lineage/purpose (`ORIGINAL`, `TRANSIENT_RETRY`, `STRUCTURAL_REPAIR`), dispatch/certainty state, response identity, usage/cost/reservation, latency, timestamps, and safe diagnostics.
- **AIProcessingResult:** immutable terminal validated result metadata, schema/input/result hashes, status, warnings, usage/cost totals, raw-response deletion status, and atomic handoff publication state.
- **CandidateQuestion:** result-scoped stable ID, ordinal, structured question data, correct-answer relationship, explanation, provenance, references, validation outcomes, and content hash.
- **ProcessingIssue:** taxonomy version, code/category/stage/severity/retryability/repairability/terminality, affected stable references, safe message key, and recommended action.
- **ProcessingStageEvent/AuditEvent:** append-only transition/action identity, actor/service, correlation/causation, timestamp, and privacy-safe metadata.

Uniqueness constraints must enforce logical attempt, provider-call, candidate question, ordinal, terminal result, usage charge, audit side effect, and handoff idempotency scopes.

### 8.4 Status and Stage Model

Durable stages:

`REQUEST_VALIDATION`, `CANONICAL_ELIGIBILITY_VALIDATION`, `CONTEXT_CONSTRUCTION`, `PROMPT_CONSTRUCTION`, `PROVIDER_INVOCATION`, `RESPONSE_CAPTURE`, `JSON_PARSING`, `JSON_SCHEMA_VALIDATION`, `DOMAIN_GROUNDING_VALIDATION`, `BOUNDED_REPAIR`, `FINAL_RESULT_PERSISTENCE`, `EXAM_CREATION_HANDOFF`.

Non-terminal controls include `PENDING`, `RUNNING`, `WAITING_BACKOFF`, `PROVIDER_OUTCOME_UNCERTAIN`, and `CANCELLING`. Terminal attempt statuses are `VALIDATED`, `FAILED_PERMANENT`, or `CANCELLED`. A structurally/domain-invalid candidate is diagnostic stage output, never a published terminal result.

### 8.5 Error and Warning Taxonomy

Code families:

| Family | Meaning | Automatic action |
|---|---|---|
| `AIP-PROV-*` | Provider/infrastructure transient or permanent failures | Retry only explicitly transient cases, max three total provider attempts |
| `AIP-STR-*` | Refusal/truncation/malformed JSON/schema/incomplete structural response | Repair only eligible structural cases, max two after original |
| `AIP-DOM-*` | Unsupported type, option/answer/duplicate/identity/order/domain invalidity | Block; recommend regeneration when applicable |
| `AIP-GRD-*` | Unsupported claim, weak/missing provenance, extraction ambiguity/fidelity failure | Warn only when result remains valid; otherwise block |
| `AIP-CAN-*` | Ineligible, blocked, unavailable, or incompatible Canonical Document/content | No provider call; permanent until input/compatibility changes |
| `AIP-COST-*` | 80% warning, cap/reservation rejection, missing cost finalization | Warn or block new call as specified |
| `AIP-AUTH-*` | Authorization, service identity, support grant, or tenant mismatch | Permanent for the request; audit |
| `AIP-CANCEL-*` | Cancellation requested/completed/race outcome | Stop safely; no handoff after cancellation wins |
| `AIP-PERM-*` | Non-recoverable internal/configuration/migration/persistence failure | Terminal failure; operator action |

Exact codes and message keys are additive and versioned; changing category, retryability, or meaning is a breaking taxonomy change.

### 8.6 Approved Architecture Decision Records

- **AD-AIP-001 — Uncertain outcomes:** Stable dispatch identity, capability-aware reconciliation, no automatic redispatch without certainty, conservative reservation, and explicit audited closure.
- **AD-AIP-002 — Cost normalization:** Versioned pricing catalog, pre-dispatch conservative reservation, provider-usage finalization, non-zero missing-usage treatment, and immutable adjustments.
- **AD-AIP-003 — Provider privacy:** Approved provider/model/configuration allowlist, minimum data transfer, no-training and minimum-retention posture, and versioned privacy provenance.
- **AD-AIP-004 — Compatibility:** Current plus immediately previous compatible minor reads; dual-read-before-write for breaking majors; immutable old results and tested rollback.
- **AD-AIP-005 — Grounding/fidelity:** Deterministic canonical evidence and reference validation only; no embeddings, broader RAG, external knowledge, or validator AI calls.
- **AD-AIP-006 — Admin cap request:** Exam Creation owns requests, recipient delivery, and authorization; AI Processing consumes only approved cap changes.

## 9. User Experience Requirements

AI Processing has no standalone UI and owns no Draft editing, candidate comparison, approval, or Exam Creation navigation behavior. Lyra's UX review is complete for AI-processing status, recovery, cost-cap, cancellation, accessibility, and responsive semantics. Exam Creation remains the presentation owner and Orion must reconcile the confirmed behavior with its tasks and test specification.

### 9.1 User Goals

- Know whether question processing is active, complete, cancelled, or needs action.
- Understand whether retry, regeneration, administrator action, or support is recommended.
- Trust that invalid output cannot silently become a Draft Exam.

### 9.2 Primary User Journey

1. Exam Creation submits an authorized request and shows a three-stage teacher-facing tracker: **Preparing questions → Checking questions → Draft ready**.
2. While request preparation, context construction, prompt construction, provider invocation, response capture, retry, or uncertain-provider-outcome reconciliation is active, the tracker shows **Preparing questions**.
3. During parsing, schema validation, domain/grounding validation, and final validation, the tracker shows **Checking questions**. When bounded structural repair is active, the current status changes to **Correcting generated questions** without presenting repair as teacher editing or regeneration.
4. After one validated result is atomically available, the tracker reaches **Draft ready**. Exam Creation automatically opens Review & Edit and announces that the Draft is ready.
5. Exam Creation, not AI Processing, converts the validated result into a Draft Exam and owns all subsequent editing, warning acknowledgement, preview, and approval behavior.

### 9.3 Alternative User Flows

- Automatic transient retry or structural repair occurs within approved bounds.
- Teacher-initiated regeneration submits a new processing attempt.
- At 80% of the cost cap, the teacher may continue within the remaining allowance after seeing a non-blocking notice near the processing action.
- At the cap, the teacher may submit an in-product request for a Tenant Admin to increase the cap. The existing Draft, when one exists, remains available.
- An authorized user may request cancellation after confirming that provider cost may already have been incurred and that no Draft may be produced.
- Returning to an in-progress workflow reads durable state rather than restarting.

### 9.4 Interaction Rules

- Expose safe stage/status, warning/error code, retryability, preserved-work statement, and recommended action; internal prompts/content remain hidden.
- Never present repair as teacher editing or regeneration.
- Never imply that a failed/invalid candidate is a Draft Exam.
- During an uncertain provider outcome, continue to show **Preparing questions**. Do not expose technical uncertainty or offer retry while reconciliation prevents a safe new provider call; authorized technical details may retain the safe internal status.
- When grounding ambiguity or domain invalidity prevents a validated result, state that no Draft was created and emphasize **Regenerate questions** as the primary recovery action.
- The 80% cost notice is non-blocking, appears near the action that would consume additional AI allowance, and shows the remaining allowance.
- At the cap, further AI actions are blocked and the primary action is **Request an Admin cap increase**. Submitting it creates one in-product request to authorized Tenant Admins and confirms submission without implying approval. Duplicate submission must not create duplicate active requests.
- Cost-cap states must state that an existing valid Draft remains available for editing and approval.
- Before cancellation, show a confirmation that provider cost may already have been incurred and no Draft may be produced. Cancelling must not be presented as deletion.
- Exam Creation owns exact screen layout and supporting wording while preserving these confirmed labels, state distinctions, and primary actions.

### 9.5 Loading, Empty, Success, and Error States

- Named durable status replaces a generic indefinite state.
- Empty/incomplete results are blocking and produce no handoff.
- Success means the immutable result is validated and atomically available. **Draft ready** must not appear before that point.
- When a valid result contains non-blocking AI warnings, show a warning summary at Draft ready and preserve the detailed warnings in Review & Edit.
- When processing fails, keep the three-stage tracker visible, mark the failed stage, and show one recovery card beneath it rather than replacing the complete view.
- The recovery card states whether a Draft was created, identifies preserved work, and emphasizes exactly one taxonomy-appropriate recovery action.
- Exhausted retry/repair, domain invalidity, cancellation, incompatibility, authorization, and cap rejection have distinct safe outcomes.

### 9.6 Validation, Feedback, and Recovery

- Input errors are returned before provider invocation where possible.
- Recovery guidance reflects taxonomy: retry transient infrastructure, regenerate domain-invalid output, replace/reprocess incompatible input through its owner, request Admin cap action, or contact support for permanent configuration failure.
- Recovery never claims that an uncertain provider outcome is safe to retry until reconciliation permits it.
- A submitted Admin cap-increase request exposes a confirmed sent state and prevents accidental duplicate submission while the same request remains active.
- Cancellation confirmation occurs before the cancellation command is submitted; cancellation completion or failure is then reported using the durable outcome.

### 9.7 Accessibility and Responsive Behavior

The handoff/status contract supplies semantic status, severity, safe message key/text, affected reference where safe, and recommended action so Exam Creation can present accessible, non-color-only feedback.

- Stage changes, **Correcting generated questions**, Draft readiness, warnings, cancellation outcomes, cap warnings, and Admin-request confirmation must be programmatically announceable without excessive repetition.
- Current, completed, and failed tracker states must not rely on color, animation, or position alone.
- When the failure recovery card appears, focus moves to its heading.
- On narrow screens, the three stages stack vertically and preserve their current, completed, and failed semantics without horizontal scrolling.
- Cancellation confirmation and Admin-request controls must be keyboard operable, clearly labeled, and retain visible focus.

### 9.8 UX Decisions

| Decision ID | Decision | Confirmed Behavior | Notes |
|---|---|---|---|
| UXD-001 | Processing stages | Show **Preparing questions → Checking questions → Draft ready** | Exam Creation owns presentation |
| UXD-002 | Automatic repair | Show **Correcting generated questions** while bounded repair is active | Do not present repair as editing or regeneration |
| UXD-003 | Grounding/domain failure | State that no Draft was created and emphasize **Regenerate questions** | Applies when regeneration is the taxonomy-approved recovery |
| UXD-004 | Uncertain provider outcome | Continue showing **Preparing questions** without additional teacher-facing explanation | Do not offer unsafe retry |
| UXD-005 | 80% cost warning | Show a non-blocking notice near the AI action with remaining allowance | Existing Draft remains usable |
| UXD-006 | Cost-cap recovery | Offer **Request an Admin cap increase** | Further AI calls remain blocked |
| UXD-007 | Successful completion | Automatically open Review & Edit and announce Draft readiness | Only after atomic validated-result availability |
| UXD-008 | Successful result with warnings | Show a summary at Draft ready and preserve details in Review & Edit | Existing warning acknowledgement rules remain owned by Exam Creation |
| UXD-009 | Cancellation | Require confirmation explaining possible incurred cost and that no Draft may be produced | Cancellation is not deletion |
| UXD-010 | Processing failure | Retain the tracker, mark the failed stage, and show one recovery card beneath it | Preserve one primary action |
| UXD-011 | Narrow-screen tracker | Stack stages vertically and preserve completed/current/failed state | No horizontal scrolling |
| UXD-012 | Admin cap request | Send one in-product request to authorized Tenant Admins and confirm submission | Product/workflow ownership requires Orion and Vega reconciliation |

No standalone AI Processing UI is introduced. Exam Creation continues to own all layout, Draft editing, candidate comparison, warning acknowledgement, and approval behavior.

### 9.9 UX Open Questions

No unresolved high-impact UX question remains. UXD-012 is reconciled through BR-037, AD-AIP-006, and the Exam Creation-owned cap-request lifecycle.

## 10. Workflow / User Flow

```text
REQUEST_VALIDATION
  -> CANONICAL_ELIGIBILITY_VALIDATION
  -> CONTEXT_CONSTRUCTION
  -> PROMPT_CONSTRUCTION
  -> PROVIDER_INVOCATION
  -> RESPONSE_CAPTURE
  -> JSON_PARSING
  -> JSON_SCHEMA_VALIDATION
  -> DOMAIN_GROUNDING_VALIDATION
  -> FINAL_RESULT_PERSISTENCE
  -> EXAM_CREATION_HANDOFF
  -> VALIDATED
```

Structural failure may enter `BOUNDED_REPAIR` and return to `RESPONSE_CAPTURE` no more than twice. Eligible provider failures enter `WAITING_BACKOFF` and return to `PROVIDER_INVOCATION` within the three-total-attempt limit. Unacknowledged transmission enters `PROVIDER_OUTCOME_UNCERTAIN` and must reconcile before any new billable call. Cancellation may occur from any non-terminal stage and competes atomically with validated-result publication.

Teacher-facing status mapping:

```text
Preparing questions
  -> Checking questions
      -> Correcting generated questions -> Checking questions (when bounded repair occurs)
  -> Draft ready
  -> Review & Edit
```

An uncertain provider outcome remains under **Preparing questions** while reconciliation is active. A terminal failure retains the tracker, marks the affected teacher-facing stage, and shows one recovery card. **Draft ready** transitions automatically to Review & Edit only after the validated result and handoff are atomically available.

Boundary distinctions:

- **Canonical input eligibility:** verifies status, schema compatibility, issues, immutable version/hash, and authorized assets.
- **AI request construction:** validates mode and builds deterministic context/prompt from canonical data.
- **Provider adapter:** translates the provider-neutral envelope, invokes/cancels/reconciles, and normalizes response/usage metadata.
- **Provider response handling:** captures raw response/refusal/truncation and outcome certainty.
- **Structural validation:** JSON parsing and Question JSON Schema validation.
- **Domain/grounding validation:** educational contract invariants, references, fidelity, evidence, count, identities, and ordering.
- **Repair:** bounded structural correction inside the same attempt.
- **Regeneration:** a new externally authorized attempt/candidate, not a repair.
- **Validated-result persistence:** atomic immutable storage and hashing after every validation passes.
- **Draft handoff:** idempotent publication to Exam Creation; AI Processing creates no Draft.

## 11. Acceptance Criteria

- **AC-001:** Only an authorized, tenant-matched, versioned request with one eligible `SUCCEEDED` or `SUCCEEDED_WITH_WARNINGS` Canonical Document can start; blockers, missing assets, mismatches, or incompatible schemas invoke no provider.
- **AC-002:** AI Processing never reads DOCX/ZIP/XML/OMML/private parser fragments, modifies canonical data, or accesses binary assets except through authorized stable references; normalized Presentation MathML is the formula input.
- **AC-003:** Request, prompt, context, attempt, provider/model, schema, canonical, workflow/tenant, correlation/idempotency, mode, parameter, and cost-cap identities are validated and durably traceable.
- **AC-004:** Extraction preserves source meaning/order/answer relationships/structured references/provenance, adds no intentional questions, preserves a valid source explanation when present, blocks every BR-029 answer-integrity/meaning ambiguity, and warns only when the complete question remains valid and unaffected.
- **AC-005:** Generation defaults to 15, accepts only integers 5–50, is grounded only in the supplied canonical version, and validates exactly the requested count with no unsupported claims.
- **AC-006:** Every validated question is the sole supported type and has exactly ordered non-empty A–D options, one correct label, consistent text/answer/explanation, and only valid structured content/asset references; generation omits explanations by default and never asks the provider to invent them.
- **AC-007:** Required-field, empty, malformed, unsupported, duplicate question/option, answer inconsistency, explanation inconsistency, broken-reference, provenance, grounding, fidelity, identity, ordinal, and ordering failures are detected through deterministic canonical evidence/reference checks without embeddings, external knowledge, broader RAG, or validator AI calls.
- **AC-008:** Provider refusal/truncation, malformed JSON, schema mismatch, incomplete response, unknown fields prohibited by schema, and unsupported question types cannot produce a handoff.
- **AC-009:** A structurally eligible invalid original response receives at most two repair attempts, each revalidated from parsing onward with complete lineage/usage/cost; ineligible structural failures do not repair.
- **AC-010:** Domain-invalid output after repair stops automatic processing, states that no Draft was created, and emphasizes **Regenerate questions**; regeneration creates a distinct attempt/result/candidate identity and overwrites nothing.
- **AC-011:** Transient provider/infrastructure failures use bounded backoff and no more than three total provider attempts; permanent failures do not retry automatically.
- **AC-012:** Duplicate delivery across every stage converges on one logical attempt/call/response/result/question/usage/audit/handoff and avoids preventable duplicate billing.
- **AC-013:** Every provider call has one stable dispatch ID and capability record; uncertain outcomes reconcile the same call where supported, otherwise retain the maximum estimated reservation and prohibit automatic redispatch until audited resolution/permanent closure and an explicit authorized new attempt; the tracker remains at **Preparing questions** and exposes no unsafe retry action.
- **AC-014:** The default USD 1 equivalent workflow cap warns at 80% through a non-blocking notice near the AI action showing remaining allowance, includes retries/repairs/uncertain reservations, and blocks further AI calls at the cap; Exam Creation owns the idempotent **Request an Admin cap increase** lifecycle, AI Processing accepts only an approved authorized cap-change notification, and the cap never blocks existing valid Draft editing/approval.
- **AC-015:** Usage reporting uses the effective versioned pricing catalog, reserves conservative maximum estimated cost before dispatch, captures available token/provider units, latency, currency conversion, estimate/final/adjustment state, and USD-equivalent cost at call/attempt/result/workflow scope, and retains the estimate rather than silently treating missing usage as zero.
- **AC-016:** Every durable stage, retry, repair, cancellation, uncertain outcome, persistence, and handoff transition survives restart and follows Temporal-compatible at-least-once-safe contracts.
- **AC-017:** Cancellation requires confirmation that provider cost may already have been incurred and no Draft may be produced; after confirmation it is durable/idempotent, remains distinct from deletion, prevents future eligible work and handoff when it wins the terminal race, preserves committed provenance/usage, and recovers safely from worker interruption.
- **AC-018:** Validated-result persistence and handoff are atomic/idempotent: Exam Creation receives one complete immutable validated result or none, never a partial/failed/cancelled result.
- **AC-019:** Question JSON contains every Section 8.2 field, stable result-scoped candidate question identities and contiguous ordering; Exam Creation can map them to independently owned persistent Draft/Master identities.
- **AC-020:** The versioned taxonomy represents every required category with stable machine-readable semantics, and every failure/warning exposes stage, severity, retry/repair/terminal flags, safe message, affected references, and recommended action sufficient to retain the three-stage tracker, mark the failed stage, and show one recovery card beneath it.
- **AC-021:** Canonical warnings/provenance are preserved without reclassification, unsupported canonical content blocks or warns according to whether faithful extraction/grounded generation remains valid, and a successful result with non-blocking warnings shows a summary at Draft ready while preserving details in Review & Edit.
- **AC-022:** Tenant isolation, roles/service identities/support grants, authorization, TLS, at-rest encryption, secret isolation, audited privileged actions, provider allowlisting, minimum-data transfer, and approved no-training/minimum-retention settings protect requests, canonical access, provider calls, responses, results, and handoffs.
- **AC-023:** Ordinary logs/metrics/traces/audits contain no complete prompts, source content, questions, options, answers, explanations, raw responses, asset bytes, secrets, signed URLs, or cross-tenant identifiers/content leakage.
- **AC-024:** Raw provider responses are access-restricted and deleted after validated data/diagnostics persist, with failed-payload maximum, tenant/legal deletion, stricter obligation, and legal-hold behavior enforced.
- **AC-025:** The same AI Provider Interface supports deterministic local success and contract-compatible failure/usage/cost simulation; controlled production integration tests do not make the main suite nondeterministic.
- **AC-026:** Writers emit the current contract version; readers accept it and the immediately previous compatible minor version; unsupported versions fail explicitly, breaking majors deploy dual readers before new writes, and migration/rollback preserves immutable prior meaning.
- **AC-027:** At least 100 `AI_PROCESSING_PROFILE_V1` attempts with up to four simultaneous workflows, both modes, required 5/15/50 and complex-input distributions, and fixed provider/model/region/pricing/privacy configuration measure the five-minute P95 and 99.5% availability with required per-stage/provider/retry/repair/question/token/cost distributions and provider/upstream exclusions reported separately.
- **AC-028:** Fault injection at every durable stage and persistence/publication boundary proves safe retry, recovery, cancellation, idempotency, cost accounting, no partial handoff, and no sensitive leakage.
- **AC-029:** Exam Creation presents **Preparing questions → Checking questions → Draft ready**, temporarily shows **Correcting generated questions** during repair, automatically opens Review & Edit only after atomic validated-result availability, announces relevant states accessibly, and on narrow screens stacks the tracker vertically while preserving completed/current/failed semantics without horizontal scrolling.

## 12. Error Cases

- Missing/invalid request fields, unsupported request/result/taxonomy version, invalid mode parameter, multiple canonical inputs, or mismatched workflow/tenant.
- Canonical status not successful, ingestion blocker, incompatible schema, changed hash/version, missing/unauthorized asset, invalid provenance, or unsupported meaning-bearing canonical content.
- Provider timeout, throttling, outage, unavailable model, invalid credentials/configuration, refusal, safety/policy rejection, truncation, unavailable usage, or uncertain transmission outcome.
- Empty response, malformed JSON, schema mismatch, incomplete output, prohibited unknown content, or repair exhaustion.
- Zero/duplicate/unsupported questions; duplicate/gapped identities/ordinals; wrong count; invalid A–D labels/order/count; empty/duplicate options; zero/multiple/invalid correct answers; inconsistent question/answer/explanation.
- Broken table/formula/image/media/asset/source-block reference; missing provenance; unsupported generation claim; extraction invention, reordering, answer drift, ambiguity, or incomplete source question.
- Cost warning/cap reached, insufficient reservation, missing pricing data, unauthorized cap increase, or accounting finalization failure.
- The 80% notice omits remaining allowance, a cap state hides existing Draft access, an Admin request is duplicated/not confirmed/misdirected, or the interface implies that request submission raised the cap.
- Duplicate/concurrent command/activity/handoff; idempotency collision; worker restart; persistence failure; handoff publication failure; cancellation/result race.
- Cancellation is submitted without confirmation, is presented as deletion, omits possible incurred cost/no-Draft consequences, or reports success before the durable cancellation outcome.
- The tracker advances to Draft ready before atomic availability, fails to open Review & Edit after success, hides warnings, removes the tracker on failure, exposes unsafe retry during an uncertain provider outcome, or loses stage semantics on narrow screens.
- Authorization denial, tenant mismatch, expired support grant, secret exposure attempt, cross-tenant asset access, or privacy/log-redaction failure.
- Raw-response deletion failure, premature deletion, retention overrun, legal-hold bypass, or tenant/legal deletion conflict.
- Migration incompatibility, rollback reader mismatch, unsupported provider-adapter contract, or permanent configuration failure.

Every error maps to the versioned taxonomy, preserves committed valid work and usage, and never silently publishes or duplicates a result.

## 13. Out of Scope

- DOCX upload, malware scanning, parsing, canonicalization, asset extraction, or Canonical Document schema ownership.
- Opening original DOCX, DOCX XML, OMML, temporary parser output, or private source fragments.
- Teacher Draft editing/autosave, Draft Exam lifecycle ownership, candidate comparison UI, Master Exam approval/versioning, or persistent Draft/Master identity allocation.
- Question-bank retrieval, vector ingestion, embeddings, semantic retrieval, or broader RAG.
- Mixing, permutation generation, publishing, preview rendering, DOCX/PDF generation, or ZIP packaging.
- Provider-specific prompt optimization beyond the versioned provider-neutral contract.
- Model training, fine-tuning, or evaluation-platform development.
- Question types other than fixed four-option single-answer multiple choice.
- Multi-document processing, source merging, OCR, or scanned-document interpretation.

## 14. Open Questions

No unresolved product, UX, or architecture question remains for the AI Processing MVP.

Resolved decisions:

- OQ-001 is resolved by BR-029.
- OQ-002 is resolved by BR-030.
- OQ-003 is resolved by BR-036.
- OQ-004 is resolved by BR-037 and the Exam Creation cap-request lifecycle.
- VEGA-001 through VEGA-006 are resolved by BR-031 through BR-037 and AD-AIP-001 through AD-AIP-006.
