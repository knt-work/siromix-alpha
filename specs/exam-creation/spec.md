# Exam Creation Specification

## 1. Objective

Enable an authorized teacher to create an exam from one DOCX source by choosing either raw-exam extraction or knowledge-based question generation, reviewing a canonicalized and validated AI-produced Draft Exam, editing it without rerunning AI, and explicitly approving it as a versioned Master Exam.

The feature is successful when no uploaded or AI-produced content becomes official without deterministic canonicalization, automated validation, and teacher approval.

## 2. Context

Exam Creation is the MVP lifecycle and orchestration boundary connecting upload, canonicalization, AI-assisted draft creation, teacher editing, and approval. It establishes the domain states and contracts that later feature specifications must refine without moving responsibilities across engine boundaries.

No neighboring feature specifications exist at the time this specification is created. The later DOCX Ingestion, AI Processing, Mixing Engine, and Publishing Engine specifications must reference this specification and preserve its lifecycle, ownership, provenance, and versioning rules.

The feature complies with SiroMix Constitution v1.1.0, especially canonical data as the system of record, engine separation, validated AI drafts, explicit human approval, versioned official data, observable/idempotent processing, private-data handling, testable correctness, and the one-DOCX MVP boundary.

**Specification Status:** Implementation Ready. The constitution check, DOCX Ingestion and AI Processing reconciliation, Lyra review, and Admin cap-request ownership decision are complete.

**Post-Reconciliation Constitution Check:** Passed against Constitution v1.1.0. Canonical-data ownership, AI/Draft/Master separation, explicit approval, stable identity/versioning, bounded/idempotent processing, tenant isolation, privacy-safe observability, cost control, local parity, migration safety, and test traceability remain intact.

## 3. Related Specifications

- **DOCX Ingestion (future):** owns safe DOCX parsing, asset extraction, unsupported-element reporting, and production of a versioned Canonical Document. It does not create questions, Draft Exams, or Master Exams.
- **AI Processing (future):** owns mode-specific prompts, provider calls, structured response contracts, repair/regeneration policy, and production of validated question data. It does not approve official exams.
- **Mixing Engine (future):** consumes an approved Master Exam version and owns deterministic question-order permutation plus persisted permutation and answer matrices. It does not accept Draft Exams or modify content.
- **Publishing Engine (future):** renders approved business data and stored matrices through versioned templates. It does not parse source DOCX files, call AI, correct content, or approve exams.
- **Constitution:** defines all controlling architecture and product invariants.

Until the related specifications are approved, their detailed contracts, limits, retry counts, and implementation designs remain open. This feature defines only the minimum integration obligations they must satisfy.

## 4. User Roles

- **Teacher:** creates an exam within an authorized tenant, reviews warnings and draft content, edits the Draft Exam, explicitly approves it, and may submit one active in-product request for a Tenant Admin to raise the workflow AI cost cap.
- **Tenant Admin:** may view tenant workflows, processing status, audit history, and tenant-scoped pending AI cost-cap requests; approve or reject a current request; retry failed processing; cancel unapproved workflows; perform authorized deletion; and manage teacher access through the authorization system. An Admin may not edit Draft content, change correct answers, acknowledge teacher-review warnings, or approve a Master Exam unless the user also holds the Teacher role.
- **Platform support:** may access operational metadata only by default. Access to document or exam content requires an explicit, time-limited, audited support grant.
- **Unauthorized user:** may not upload, view, modify, process, or approve exam-creation data.

All role and tenant checks must be enforced server-side.

## 5. Business Rules

- **BR-001:** One exam-creation workflow accepts exactly one DOCX source file. Replacing a source after processing has produced a Draft creates a new linked exam-creation workflow and candidate; it does not attach a second DOCX to or mutate the original workflow.
- **BR-002:** The teacher must choose exactly one source mode: `RAW_EXAM_EXTRACTION` or `KNOWLEDGE_BASED_GENERATION`.
- **BR-003:** Raw-exam extraction reconstructs question data already present in the source; it must not intentionally invent additional questions.
- **BR-004:** Knowledge-based generation creates questions grounded in the Canonical Document and requires one total requested question count from 5 through 50 inclusive. The default is 15.
- **BR-005:** Every accepted upload must produce or reuse a versioned Canonical Document before AI processing begins.
- **BR-006:** Canonicalization must be deterministic, idempotent, traceable to the source version, preserve semantic order and meaningful structures, and report unsupported or lossy elements explicitly.
- **BR-007:** AI output is untrusted processing output until it conforms to the versioned Question JSON Schema and passes all domain validation.
- **BR-008:** Only validated AI output may create a Draft Exam. The MVP supports only single-answer multiple-choice questions with exactly four ordered options labeled A, B, C, and D and exactly one correct answer. Validation must also cover required fields, linked content consistency, duplicate/empty/malformed content, and requested count for generation mode.
- **BR-009:** A teacher may edit a Draft Exam without rerunning canonicalization or AI. Edits operate on the Draft Exam domain model and refresh its preview.
- **BR-010:** Regeneration from the same source creates a distinct processing attempt and a distinct candidate Draft identity. Autosaves create revisions under the selected Draft identity. Neither regeneration nor candidate selection may silently overwrite another Draft or an approved Master Exam.
- **BR-011:** Approval is explicit, authorized, and blocked by structural/schema failures, invalid or missing correct-answer relationships, empty or unsupported required content, broken required references, unresolved generation-count violations, or canonicalization loss that can affect assessable content or answer integrity. Other current non-blocking warnings require individual teacher acknowledgement before approval.
- **BR-012:** First approval creates Master Exam version 1. A later content or answer change to an approved Master Exam must occur through a new Draft/revision flow and create a new Master Exam version.
- **BR-013:** Master Exam versions are immutable official snapshots. Approval never mutates a prior version.
- **BR-014:** A Master Exam retains stable exam and question identities plus provenance to the Draft, AI attempt, Canonical Document version, and source upload.
- **BR-015:** Mixing and publishing are unavailable until a Master Exam version is approved.
- **BR-016:** Approval of a new Master Exam version must mark derived data from earlier versions as belonging only to those versions; it must never silently relabel old matrices or artifacts as current.
- **BR-017:** Retryable stages must be idempotent or idempotency-protected and must not duplicate uploads, canonical documents, attempts, drafts, questions, approvals, or billing events.
- **BR-018:** A warning acknowledgement applies only to the warning instance on the current Draft revision. A content change that invalidates its basis must re-run validation and require acknowledgement again if the warning remains.
- **BR-019:** Before processing, required teacher-entered metadata is exam title, subject, grade level, and content language. Before approval, academic year, term/exam period, and duration in minutes are also required. Class/section, description, and student instructions are optional. Tenant, teacher, timestamps, and version identifiers are system-derived.
- **BR-020:** Teachers may add, delete, duplicate, and reorder Draft questions and edit question text, options A-D, the single correct answer, explanation, score, rich text, tables, formulas, and media. The fixed four-option/single-answer structure may not be changed.
- **BR-021:** A DOCX must be no larger than 10 MB. There is no page-count limit. Extension, MIME type, DOCX/ZIP structure, required package contents, malware status, archive expansion, entry count, and decompression safety must pass before canonicalization. Corrupt, encrypted/password-protected, macro-enabled, disguised, or unsafe files are rejected.
- **BR-022:** AI processing is blocked when upload/security validation fails; no valid Canonical Document can be produced; canonical schema validation fails; meaningful source content is absent; semantic order cannot be preserved; required images, tables, formulas, or relationships are missing or broken; or unsupported/lost content could affect a question, answer, or interpretation. Presentation-only loss that cannot change meaning may proceed with a visible warning.
- **BR-023:** Automatic retry limits are: upload transfer, 3 resumable attempts; canonicalization transient infrastructure failure, 3 attempts total; AI provider transient failure, 3 attempts total; structurally invalid AI response, at most 2 repair attempts after the original response; Draft autosave, 3 attempts; and preview refresh, 2 attempts. Domain-invalid output after repair stops automatic processing and recommends regeneration. Approval is not blindly retried; an unconfirmed outcome may be retried manually through the same idempotency scope. Automatic retries use backoff and every attempt is recorded.
- **BR-024:** Retention follows Section 8. Raw AI-provider responses are deleted after validated structured data and required diagnostic metadata are stored. Legal requirements, tenant deletion, or a documented legal hold may override normal schedules.
- **BR-025:** The default AI cost cap is USD 1 equivalent per exam-creation workflow. The system warns at 80%, counts automatic repair attempts toward the cap, and blocks further AI attempts at the cap without blocking Draft editing or approval. An authorized Tenant Admin may raise the cap before another AI attempt.

- **BR-026 — Admin cap-request lifecycle:** Exam Creation owns the in-product cap-increase request. A Teacher authorized for the workflow may create at most one active request per workflow when further AI calls are cap-blocked. The Teacher is not asked to choose a new cap. The request records current cap/usage/reservations, reason if supplied, requester, tenant/workflow, timestamps, and status `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`, or `EXPIRED`.
- **BR-027 — Cap-request decisions:** Only an authorized Tenant Admin in the same tenant may approve or reject a current `PENDING` request. On approval the Admin enters a new positive cap greater than the current cap; the system records it with decision actor/time and reason if supplied, atomically updates the workflow cap, and publishes one idempotent approved cap-change notification to AI Processing. Submission never implies approval and never grants the requester cap-change authority.
- **BR-028 — Cap-request delivery and safety:** Active-request uniqueness and idempotency prevent duplicate submissions, decisions, notifications, and cap changes. Authorized Tenant Admin recipients are resolved server-side; in-product notification delivery uses a transactional outbox or equivalent durable mechanism. Notification failure does not lose the request or decision. A stale, expired, cancelled, already-decided, unauthorized, or cross-tenant decision is rejected without changing the cap.
- **BR-029 — Cap-request expiry/withdrawal:** A Teacher may cancel their own current `PENDING` request. A request expires after seven days if undecided. A rejected, cancelled, expired, or superseded request remains auditable and a later cap-blocked AI action may create a new request. Cap-request records and decision/notification audit events follow the seven-year audit retention policy.

## 6. Functional Requirements

- **FR-001 — Start workflow:** The system shall let an authorized teacher create an exam-creation workflow with a stable identifier and enforce BR-019 metadata at the processing and approval gates.
- **FR-002 — Upload:** The system shall accept one validated DOCX under the BR-021 10 MB and security policy, reject missing, additional, unsupported, unsafe, or over-limit files before parsing or AI, store the original privately, and create a versioned source record.
- **FR-003 — Select mode:** The system shall record exactly one source mode before processing. Generation mode shall default to 15 questions and accept an integer from 5 through 50 inclusive.
- **FR-004 — Canonicalize:** The system shall invoke the ingestion contract, persist or reuse its versioned Canonical Document, assets, parser identity/version, content hash, warnings, and processing status.
- **FR-005 — Process with AI:** The system shall invoke the AI contract with the Canonical Document version, selected mode, applicable parameters, and correlation/idempotency identifiers.
- **FR-006 — Validate:** The backend shall validate the AI response against a versioned JSON Schema, BR-008 fixed MCQ rules, BR-022 ingestion gates, and all applicable domain rules before Draft Exam creation.
- **FR-007 — Recover processing:** The system shall record each attempt and enforce the exact bounded retry, repair, regeneration, backoff, and manual approval-retry rules in BR-023. Permanent failures shall produce actionable user-visible errors without creating a Draft Exam.
- **FR-008 — Create Draft Exam:** Valid output shall create a versioned Draft Exam domain model with stable question identifiers, provenance, validation results, warnings, and editable status.
- **FR-009 — Review:** The system shall present source mode, processing status, warnings, exam metadata, questions, answer choices, correct answers, explanations, media/table references, and a Draft preview.
- **FR-010 — Edit and autosave:** The teacher shall have all BR-020 editing operations without an AI call. Changes shall autosave as a new revision of the selected Draft, expose `Saving`, `Saved`, or `Save failed`, and rerun the fixed A-D/single-correct-answer and other applicable domain validation.
- **FR-011 — Preserve edits:** Failed autosave or preview refresh shall not discard the last successfully saved Draft revision. Locally changed content shall remain visible and clearly marked as not persisted, with retry available. Approval and navigation that would discard local changes shall be blocked while autosave is pending or failed.
- **FR-012 — Create candidates safely:** Regeneration from the same source shall create a new AI attempt and distinct candidate Draft while preserving the current Draft. Source replacement after a Draft exists shall require confirmation and create a new linked one-DOCX workflow and candidate while preserving the original workflow and Draft. Before opening a candidate, the system shall provide the confirmed comparison and explicit selection experience.
- **FR-013 — Approve:** An authorized teacher shall explicitly approve a valid, current, fully saved Draft revision through the dedicated readiness and confirmation flow. The backend shall revalidate it transactionally, verify all current non-blocking warnings were individually acknowledged, and create an immutable, uniquely numbered Master Exam version with an approval audit event.
- **FR-014 — Handle concurrent changes:** Approval shall fail safely if the Draft changed after the reviewed revision, and the teacher shall be required to review the current revision.
- **FR-015 — Expose handoff:** After approval, the system shall expose the exact Master Exam version identifier as the only permitted content input to later mixing and publishing operations.
- **FR-016 — Audit and observe:** The system shall record correlation identifiers, durable stage states, timestamps, actor identifiers for user actions, attempt/provenance metadata, structured failure reasons, and audit events for upload, regeneration, editing, and approval.
- **FR-017 — Enforce retention:** The system shall apply the retention and deletion schedule in Section 8 with recoverable deletion where specified, legal-hold override, and auditable authorized deletion.
- **FR-018 — Enforce cost control:** The system shall attribute available AI usage/cost to each attempt, warn at 80% of the workflow cap, block new AI attempts at the cap, and support an audited authorized Tenant Admin cap increase without limiting non-AI editing or approval.

- **FR-019 — Request cap increase:** When AI is cap-blocked, let an authorized Teacher submit one tenant/workflow-scoped request, confirm submission, show its current status, prevent duplicate active requests, and preserve access to existing Draft editing/approval.
- **FR-020 — Decide cap request:** Let an authorized Tenant Admin view tenant-scoped pending requests and approve or reject one current request. Approval atomically changes the cap and publishes one idempotent approved cap-change notification; rejection changes no cap.
- **FR-021 — Recover cap requests:** Permit authorized withdrawal, expire pending requests after seven days, reject stale/concurrent/unauthorized decisions, and recover notification delivery through durable outbox retry without duplicating the cap update.

## 7. Non-Functional Requirements

- **NFR-001 Security:** Validate file signature/type and configured size limits, isolate processing appropriately, use private object storage and short-lived authorized access, and prevent cross-tenant access.
- **NFR-002 Privacy:** Protect sources, questions, answers, and teacher data in transit and at rest. Do not log full documents, prompts, answers, or provider payloads by default.
- **NFR-003 Reliability:** Persist stage state durably. Use bounded retries with backoff for transient failures and explicit terminal states for permanent failures.
- **NFR-004 Idempotency:** Repeated stage requests with the same idempotency scope shall converge on the same logical result without duplicate durable records or provider billing where preventable.
- **NFR-005 Traceability:** All derived records shall identify exact input and contract versions. Audit history shall distinguish system processing from teacher changes.
- **NFR-006 Performance:** At the 95th percentile under normal supported load, workflow creation and status requests and Draft autosave complete within 2 seconds; approval completes within 3 seconds; canonicalization of a valid DOCX up to 10 MB completes within 60 seconds; validated AI Draft generation up to 50 questions completes within 5 minutes excluding a declared provider outage; and dashboard stage changes appear within 5 seconds.
- **NFR-007 Accessibility:** Core creation, review, validation, editing, and approval actions shall be keyboard operable, have programmatic labels, visible focus, non-color-only status, and announced validation/progress feedback.
- **NFR-008 Compatibility:** Persisted and cross-engine contracts shall be versioned and migration-aware.
- **NFR-009 Local parity:** The workflow, database schema, storage/AI interfaces, worker behavior, migrations, and meaningful failure paths shall be runnable locally using contract-compatible implementations.
- **NFR-010 Rollback:** Deployment rollback must not delete or reinterpret persisted source, Canonical Document, Draft, Master Exam, or audit versions.
- **NFR-011 Cost:** Each AI attempt shall be attributable to its workflow and record provider/model plus available usage and USD-equivalent cost metadata. BR-025 cost controls apply and uncontrolled retry loops are prohibited.
- **NFR-012 Availability:** Monthly service availability target is 99.5%, excluding announced maintenance.

## 8. Data Requirements

The logical model must include:

- **ExamCreationWorkflow:** stable ID, tenant/owner, BR-019 metadata, selected mode, requested question count where applicable, durable stage/status, selected Draft reference, optional predecessor/replacement-workflow link, AI cost cap/current attributed and reserved cost, correlation ID, timestamps, and optimistic-concurrency value. Each workflow owns exactly one source.
- **SourceDocumentVersion:** stable ID/version, workflow ID, private object reference, original filename, validated media/type metadata, size, content hash, upload actor/time, and security-scan status where applicable. A source replacement after Draft creation belongs to a new linked workflow.
- **CanonicalDocumentVersion:** stable ID/version, source version, versioned schema, parser/version, content hash, ordered canonical blocks, stable asset references, warnings, and creation status/time.
- **AIProcessingAttempt:** stable ID/sequence, workflow and canonical version, mode and parameters, prompt-template version, Question JSON Schema version, provider/model, idempotency/correlation data, timestamps, status, failure classification, and usage/cost metadata where available.
- **DraftExamRevision:** stable Draft ID and monotonically increasing revision, workflow, source/canonical/attempt provenance, editable exam metadata, ordered structured questions, validation results, warning-instance acknowledgements, editor, and timestamps. Regeneration and replacement-source processing create distinct Draft IDs; autosave creates revisions under the selected Draft ID.
- **MasterExamVersion:** stable exam ID and immutable positive version number, source Draft revision, approved structured content, stable question IDs, approval actor/time, provenance, and contract version.
- **AuditEvent:** stable ID, tenant, workflow/exam references, event type, actor or system identity, timestamp, correlation ID, and minimal non-sensitive change metadata.
- **AICostCapIncreaseRequest:** stable ID, tenant/workflow, requester, current-cap and committed/reserved-cost snapshot, optional requester reason, status, approved new cap where applicable, decision actor/reason/time, expiry/cancellation time, idempotency key, optimistic-concurrency value, timestamps, and notification/outbox reference.

Canonical blocks and question/media references must use stable identifiers. Binary assets must be stored separately. Core exam queries must not require opening DOCX or rendered files.

Contract ownership:

- Ingestion owns the Canonical Document schema and publishes a versioned contract consumed here and by AI Processing.
- AI Processing owns the AI response/Question JSON Schema contract; Exam Creation owns the validated Draft Exam lifecycle.
- Exam Creation owns Draft Exam and Master Exam lifecycle contracts.
- Mixing consumes an immutable Master Exam version and owns permutation/answer matrices.
- Publishing consumes approved data and versioned matrices/templates and owns rendered artifacts.

Schema evolution must preserve existing immutable Master Exam versions or provide an explicit, tested migration. No destructive migration may silently alter official exam meaning or answers.

Retention requirements:

- Original DOCX and Canonical Document are retained while the related exam exists, followed by a 30-day recoverable deletion period after authorized exam deletion.
- Active Drafts and selected candidates are retained while the related exam exists.
- Unselected generated or replacement candidates are deleted after 90 days of inactivity.
- Failed processing payloads and temporary files are deleted after 7 days.
- Failed-attempt metadata, status, and cost records are retained for 1 year.
- Master Exam versions are retained until authorized exam deletion and its 30-day recovery period complete.
- Approval, regeneration, replacement, security, authorization, deletion, and cost-cap-change audit events are retained for 7 years.
- Cap-increase requests plus submission, decision, withdrawal, expiry, notification, and cap-change audit events are retained for 7 years.
- Raw AI-provider responses are not retained after validated structured output and required diagnostic metadata are stored.
- Tenant deletion or applicable legal requirements may require earlier deletion; a documented legal hold may suspend deletion.

## 9. User Experience Requirements

Lyra's UX review is complete. Confirmed decisions are reconciled below with the business rules, lifecycle contracts, acceptance criteria, and constitutional boundaries.

### 9.1 User Goals

- Turn one DOCX into a trustworthy, editable exam draft.
- Understand whether the system is uploading, canonicalizing, processing, validating, or awaiting review.
- Correct AI or extraction mistakes before anything becomes official.
- Know exactly when and which version becomes the approved Master Exam.

### 9.2 Primary User Journey

The primary journey uses a four-step guided flow with a visible indication of the current and completed steps:

1. **Setup:** Teacher enters exam title, subject, grade level, and content language; optionally enters class/section, description, and student instructions; uploads one DOCX up to 10 MB; and selects extraction or generation mode. Generation defaults to 15 questions and accepts 5 through 50.
2. **Processing:** System validates, uploads, canonicalizes, processes, and validates the result while showing durable stage progress.
3. **Review & Edit:** Teacher reviews warnings and the structured Draft Exam, edits and saves it, and receives validation and preview updates from the saved domain model.
4. **Approval:** Teacher resolves blocking errors and reviews a readiness checklist covering the identified Draft revision, autosave state, question count, blocking errors, and warning acknowledgements. The step displays the Master Exam version that will be created. A final confirmation dialog identifies the Draft revision and resulting version before the teacher explicitly approves. The system then confirms the new Master Exam version and offers later mixing/publishing entry points without performing either operation.

The interface must prevent users from treating the guided steps as freely skippable navigation when a later step's prerequisites are incomplete.

### 9.3 Alternative User Flows

- Replace a source before approval. If a Draft already exists, require confirmation, preserve the original one-DOCX workflow and Draft, and process the replacement through a new linked one-DOCX workflow presented as a separate candidate.
- Retry an eligible failed stage without duplicating prior successful work.
- Return later to a persisted in-progress workflow or saved Draft.
- Leave the Processing step while work continues and monitor or reopen the workflow from the exam dashboard.
- Regenerate into a separate candidate while preserving the current Draft and edits.
- When AI is cap-blocked, submit one Admin cap-increase request, see confirmation/current status, continue using an existing Draft, and retry AI only after an approved cap permits it.
- Tenant Admin reviews tenant-scoped pending requests and approves or rejects them; a Teacher may withdraw their own pending request.
- Compare the current Draft and a regenerated candidate through a side-by-side change summary, then explicitly choose which candidate to open.
- Start a new revision from an approved Master Exam to create a later official version.

### 9.4 Interaction Rules

- Mode choice and its effect must be explained before processing.
- Knowledge-generation setup uses one total question-count input defaulting to 15 with an allowed range of 5 through 50. No question-type selector is shown because the MVP supports only fixed four-option single-answer MCQs.
- Approval must be a deliberate action and identify the Draft revision being approved.
- The final approval confirmation dialog must state that approval creates an immutable official version and that later content changes require a new version.
- Destructive replacement, regeneration with existing edits, and leaving with unsaved edits require clear warning and recovery behavior.
- Replacing the DOCX after Draft creation requires confirmation that explains a new linked workflow and processing candidate will be created and that the existing workflow and Draft will remain available.
- Blocking errors and non-blocking warnings must be visually and semantically distinct.
- Every non-blocking warning must be acknowledged individually before approval; acknowledgement of one warning must not dismiss or imply acknowledgement of another.
- Editing must not silently call AI.
- Actions unavailable due to state or permission must explain why.
- A cap-request submission must say that the request was sent, not approved. While it is pending, replace duplicate submission with the current request status and withdrawal option.
- Tenant Admin approval must show the current cap, require entry of a higher new cap and an explicit decision, and explain that rejection changes no cap.
- After automatic recovery is exhausted, present one primary recommended recovery action based on the failed stage rather than asking the teacher to choose among technical recovery mechanisms.
- Processing continues after the teacher leaves the workflow. Leaving must not be presented as cancellation.
- The exam dashboard shows the workflow's current named processing stage and completion or failure status and provides a route back to it.
- Draft changes autosave after editing and expose distinct `Saving`, `Saved`, and `Save failed` states.
- Approval and navigation away from Review & Edit must not treat changes as saved while autosave is pending or has failed.
- The editor always presents exactly four answer options labeled A-D and permits exactly one correct-answer selection.
- Review & Edit includes a question navigator sidebar listing each question by number and showing its current error and warning status.
- Selecting a navigator item moves focus to the corresponding question without losing edits. Question reordering updates navigator numbering while preserving stable question identity.
- Regeneration opens a side-by-side summary of changed questions between the current Draft and new candidate before either is opened for editing.
- The comparison must clearly label the current Draft and regenerated candidate, identify added, removed, and changed questions, and require an explicit candidate choice.

### 9.5 Loading, Empty, Success, and Error States

- Show the active durable stage rather than an indefinite generic spinner.
- Use teacher-friendly stage labels in the primary interface. Exact internal stage names, attempt identifiers, versions, and provenance are available in an expandable technical details panel.
- When a teacher returns to an in-progress workflow, open the current durable stage rather than restarting the flow or repeating completed work.
- The initial state explains the one-DOCX requirement and two supported modes.
- An empty or zero-question AI result is an error and cannot create an approvable Draft.
- Successful autosave confirms the saved Draft revision.
- Autosave failure keeps the affected changes visible, identifies that they are not yet persisted, and offers retry without discarding the last successfully saved revision.
- Successful approval confirms the Master Exam version.
- Approval cannot be initiated while autosave is pending or failed, the reviewed revision is stale, blocking errors remain, or any warning remains unacknowledged; the readiness checklist links to each unresolved item.
- A cap-blocked state keeps existing Draft access available, shows **Request an Admin cap increase**, and after submission shows `Pending`, `Approved`, `Rejected`, `Cancelled`, or `Expired` without implying a new AI attempt has started.
- Errors identify the failed stage, whether saved work remains safe, and eligible retry/replacement actions.
- Terminal processing failures emphasize one recommended recovery action. Secondary details may explain the failure and support escalation, but must not compete with the primary recovery path.
- The Approval step summarizes all blocking errors, unacknowledged warnings, and acknowledged warnings, with navigation back to each affected item.

### 9.6 Validation, Feedback, and Recovery

- Validate file and generation inputs before starting expensive processing where possible.
- Reject a generation count outside 5 through 50 at setup and preserve the entered value for correction.
- Associate editable-field errors with their fields and provide a review-level summary.
- Blocking errors prevent approval. Non-blocking warnings permit approval only after the teacher individually acknowledges every current warning.
- If an edit materially changes content associated with an acknowledged warning, that warning must be reevaluated and any resulting current warning must require acknowledgement again.
- Preserve the last saved Draft across validation, preview, network, and retry failures.
- Recovery guidance must state which completed stages and saved work remain safe and must not imply that the complete workflow will restart unless that is actually required.
- Keep locally changed content visible after autosave failure while clearly distinguishing it from the last successfully saved revision.
- Require re-review after concurrent modification or after switching to a regenerated candidate.
- Choosing the regenerated candidate does not delete or overwrite the preserved current Draft.
- A replacement-source candidate must be clearly distinguished from the existing Draft by source filename, linked workflow, and processing status before the teacher chooses to open it.
- Never imply that retry or regeneration is guaranteed to preserve unsaved edits.
- Duplicate cap-request submission returns the active request. Approval/rejection conflicts, notification delay, expiry, or withdrawal preserve the cap and existing Draft and provide the next eligible action.

### 9.7 Accessibility and Responsive Behavior

- Meet NFR-007 for all core actions and status communication.
- Focus must move predictably to actionable error summaries after failed submission or approval.
- Long question content, tables, and media must remain reviewable without hiding answer correctness.
- The question navigator must be keyboard operable, identify the selected question programmatically, and expose error/warning status without relying on color alone.
- The regeneration comparison must expose additions, removals, and changes semantically and remain usable without relying on visual position or color alone.
- Narrow screens support the complete Review & Edit workflow, including complex tables, formulas, media, validation, warning acknowledgement, reordering, and approval preparation.
- On narrow screens, the question navigator becomes an accessible drawer that preserves current-question context and validation status when opened or closed.
- Side-by-side regeneration comparison may reflow into a sequential paired comparison on narrow screens, but it must preserve explicit current-versus-candidate labels and change relationships.

### 9.8 UX Decisions

- The primary Exam Creation journey uses four guided steps: Setup, Processing, Review & Edit, and Approval.
- Draft editing uses autosave with visible `Saving`, `Saved`, and `Save failed` status.
- Blocking errors prevent approval, and every non-blocking warning requires individual acknowledgement before approval.
- Final approval uses a dedicated Approval step with a readiness checklist, target version information, and an explicit confirmation dialog.
- Review & Edit uses a question navigator sidebar with question numbers and error/warning status.
- Regenerated candidates are introduced through a side-by-side change summary; the teacher explicitly chooses which preserved candidate to open.
- After automatic retries are exhausted, failure UX identifies the failed stage, confirms preserved work, and offers one recommended recovery action.
- Narrow screens retain full editing capability, with the question navigator presented as a drawer and comparison content responsively reflowed without information loss.
- Replacing the DOCX after Draft creation requires confirmation, preserves the existing one-DOCX workflow and Draft, and creates a separately identifiable candidate in a new linked one-DOCX workflow.
- Exactly one source mode is selected per workflow.
- Knowledge generation defaults to 15 questions and accepts 5 through 50; no question-type selector is shown.
- The MVP editor supports only single-answer MCQs with fixed options A-D and the BR-020 editing operations.
- Processing stages are named and visible.
- Primary processing labels use teacher-friendly language, with technical stages and provenance available on demand in an expandable details panel.
- Teachers may leave during processing; work continues, and the exam dashboard exposes progress and completion status for later return.
- Draft editing does not invoke AI.
- Approval is explicit and version-specific.
- Regeneration does not silently replace the current saved Draft.
- Cap-blocked Teachers can send one in-product Admin request; only Tenant Admin approval changes the cap, and request submission never starts AI.
- Pending cap requests can be withdrawn by their requester and expire after seven days.
- Mixing and publishing are presented only as post-approval handoffs.

### 9.9 UX Open Questions

No unresolved high-impact UX question remains. Exact user-facing wording and grouping must follow the constitution-aligned severity classes in BR-011 during design and implementation.

## 10. Workflow / User Flow

```text
Created
  -> Source Uploaded
  -> Canonicalizing
  -> Canonicalized
  -> AI Processing
  -> Validating
  -> Draft Ready
  -> Teacher Editing / Review
  -> Approval Validation
  -> Master Exam Version Approved
```

Any processing stage may enter a durable `FAILED_RETRYABLE` or `FAILED_PERMANENT` state. Retry resumes only the eligible stage and reuses prior valid outputs. Cancellation must preserve audit history. Regeneration branches from the same canonical version into a new AI attempt and distinct candidate Draft. Source replacement after Draft creation starts a new linked workflow with its own single source and candidate. Neither path mutates an approved version or the preserved Draft.

Ownership boundaries:

- Exam Creation orchestrates lifecycle state, authorization, Draft editing, validation gates, and approval.
- Ingestion terminates at a valid Canonical Document or explicit ingestion failure.
- AI Processing terminates at valid structured question output or explicit processing/validation failure.
- Mixing begins only from an approved Master Exam version.
- Publishing begins only from approved business data and, when variants are requested, stored matrices.

## 11. Acceptance Criteria

- **AC-001:** An authorized teacher can start a workflow, upload exactly one valid DOCX, select exactly one supported mode, and persist the selected configuration; invalid file counts/types/sizes are rejected without starting AI.
- **AC-002:** Generation mode defaults to 15 and accepts one integer total requested question count from 5 through 50, always producing only fixed four-option single-answer MCQs; extraction mode does not require generation parameters and does not intentionally add questions absent from the source.
- **AC-003:** Processing cannot invoke AI until a versioned Canonical Document exists or an identical valid canonical result is idempotently reused with full source/parser traceability.
- **AC-004:** Canonicalization preserves ordered supported structure and stable asset references, and exposes unsupported/lossy content as explicit warnings or errors.
- **AC-005:** Every AI result records canonical/source versions, mode/parameters, attempt, prompt, schema, provider, and model provenance.
- **AC-006:** Invalid, empty, malformed, duplicate, unsupported, answer-inconsistent, or generation-count-nonconforming AI output cannot create an approvable Draft; bounded recovery is observable.
- **AC-007:** Valid AI output creates a Draft Exam with stable identities, ordered structured questions, provenance, validation results, and a distinct lifecycle state from official data.
- **AC-008:** In the guided Review & Edit step, a teacher can navigate questions through a numbered error/warning-aware navigator, edit supported Draft fields, autosave with visible `Saving`, `Saved`, and `Save failed` status, revalidate, and refresh preview without an AI call; failure keeps local changes visible and does not discard the last saved revision.
- **AC-009:** Regeneration creates a new attempt and distinct candidate Draft identity, first presents a side-by-side change summary, and requires an explicit candidate choice without silently overwriting saved edits or any Master Exam version. Replacing a DOCX after Draft creation requires confirmation and creates a separately identifiable candidate in a new linked one-DOCX workflow while preserving the original workflow and Draft.
- **AC-010:** Approval is denied to unauthorized users, invalid Drafts, stale reviewed revisions, pending/failed autosave, blocking errors, and unacknowledged warnings; the dedicated Approval step provides a readiness checklist and target-version confirmation while preserving the original Draft and audit evidence.
- **AC-011:** Explicit approval of a valid current Draft transactionally creates immutable Master Exam version 1 with stable question identities, complete provenance, and an approval audit event.
- **AC-012:** Approval following a change to official content creates the next immutable Master Exam version and does not mutate prior versions or silently transfer derived matrices/artifacts.
- **AC-013:** Mixing and publishing contracts reject unapproved Drafts and identify the exact approved Master Exam version they consume.
- **AC-014:** Repeating retryable requests with the same idempotency scope does not duplicate logical records, questions, approvals, artifacts, or preventable provider billing events.
- **AC-015:** Each stage exposes durable status through teacher-friendly labels with expandable technical details, correlation data, actionable user-visible failure information, structured observability, and privacy-safe audit/log behavior. Processing continues after navigation away, dashboard status supports return, and an exhausted failure presents preserved-work information plus one recommended recovery action.
- **AC-016:** Tenant and role authorization prevents cross-tenant or unauthorized access to uploads, canonical data, Drafts, answers, Master Exams, and approval actions.
- **AC-017:** The complete four-step guided flow is keyboard operable; status, validation, navigator, warning acknowledgement, comparison, autosave, and approval feedback are programmatically available; meaning is not conveyed by color alone; and narrow screens retain full editing through an accessible navigator drawer and information-preserving responsive comparison.
- **AC-018:** The complete workflow and meaningful storage, AI-adapter, retry, validation, and approval failure behavior can run in a local environment through production-compatible contracts.
- **AC-019:** Processing is blocked until title, subject, grade level, and content language are valid; approval is additionally blocked until academic year, term/exam period, and positive duration are valid; optional and system-derived metadata follow BR-019.
- **AC-020:** Files over 10 MB or failing any BR-021 security/package check are rejected before canonicalization, and every BR-022 semantic-integrity condition blocks AI processing while presentation-only loss proceeds only with a visible warning.
- **AC-021:** Each retryable stage stops at the exact BR-023 limit, applies backoff, records attempts, avoids duplication, and presents the specified manual recovery when automatic processing stops.
- **AC-022:** Source, canonical, Draft, candidate, temporary, failed-attempt, Master Exam, audit, and raw-provider data follow the exact Section 8 retention schedule, including recoverable deletion, authorized deletion, tenant/legal deletion, and legal-hold behavior.
- **AC-023:** Tenant Admin and platform-support access follows Section 4: administrative operations are tenant-scoped and audited, content review/edit/warning acknowledgement/approval remains Teacher-only unless the user separately holds that role, and support content access requires a time-limited audited grant.
- **AC-024:** Under normal supported load, the NFR-006 and NFR-012 latency/availability targets are measurable; AI cost is attributed per attempt, warns at 80% of the USD 1 equivalent cap, blocks further AI attempts at the cap, preserves editing/approval, and permits only an audited authorized Admin cap increase.
- **AC-025:** When further AI calls are cap-blocked, an authorized Teacher can create at most one active tenant/workflow-scoped Admin cap-increase request and receives confirmation/current status while Draft editing/approval remain available; an authorized same-tenant Admin can approve or reject it, approval atomically changes the cap and publishes exactly one idempotent notification to AI Processing, rejection changes no cap, requester withdrawal and seven-day expiry work, and duplicate/stale/concurrent/unauthorized/cross-tenant actions cannot duplicate or change the cap.

## 12. Error Cases

- Missing, multiple, incorrectly typed, oversized, corrupt, encrypted/password-protected, unsafe, or inaccessible DOCX.
- Unauthorized or cross-tenant upload, view, edit, retry, regeneration, or approval.
- Unsupported or lossy DOCX element that requires warning or blocks safe continuation.
- Canonicalization timeout, transient infrastructure failure, permanent parser failure, or hash/version mismatch.
- AI provider timeout, throttling, unavailable model, credential/configuration failure, or exhausted bounded retries.
- AI response violates schema or domain rules, contains zero usable questions, duplicates, invalid answers, broken media/table references, unsupported types, or wrong requested count.
- Network interruption during upload, save, preview refresh, retry, or approval.
- Concurrent Draft edit or stale approval revision.
- Preview generation failure while the saved Draft remains valid.
- Regeneration attempted with saved or unsaved teacher edits without required confirmation/recovery handling.
- DOCX replacement attempted after Draft creation without confirmation, preservation of the existing Draft, or clear candidate/source identification.
- Approval attempted while processing is incomplete, validation errors remain, warnings require acknowledgement, or the user lacks permission.
- Duplicate approval request or transactional failure during Master Exam creation.
- Attempt to mix or publish a Draft or unknown Master Exam version.
- Required metadata missing at the processing or approval gate, non-positive duration, or generation count outside 5 through 50.
- Draft question has fewer or more than options A-D, duplicate/missing labels, or zero/multiple correct answers.
- Automatic retry or AI repair exceeds BR-023, retries a permanent/domain failure, or produces duplicate records/provider billing.
- Retention job deletes data early, fails to delete expired data, bypasses a legal hold, or makes recoverable data unrecoverable before 30 days.
- Tenant Admin attempts Teacher-only editing, warning acknowledgement, or approval; platform support attempts content access without a current audited grant.
- AI cost reaches the warning or cap threshold, cost data is unavailable, or an unauthorized cap increase is attempted.
- Cap request is duplicated, misrouted, stale, expired, cancelled, already decided, cross-tenant, unauthorized, or concurrently decided; approval notification is delayed/duplicated; requested cap is invalid; or submission is incorrectly presented as approval.

Each error must preserve already committed valid data, classify retryability, and avoid silent duplication or data loss.

## 13. Out of Scope

- More than one source file, non-DOCX sources, batch creation, source merging, OCR, and scanned-document interpretation.
- Detailed DOCX parser algorithms, canonical block schema internals, and complete unsupported-element policy; these belong to DOCX Ingestion.
- Prompt wording, provider selection strategy, model tuning, detailed repair loops, and AI adapter implementation; these belong to AI Processing.
- Question-bank retrieval, semantic search, reusable question-bank ingestion, and RAG beyond grounding generation in the current Canonical Document.
- Answer-choice permutation, exam-code generation, permutation/answer matrix algorithms, and the four-code UI; these belong to Mixing.
- DOCX/PDF/HTML/ZIP rendering, templates, answer-matrix presentation, downloads, and caching; these belong to Publishing.
- Collaborative simultaneous editing, student delivery, grading, analytics, curriculum mapping, and automated approval.

## 14. Open Questions

No unresolved product, UX, or architecture question remains for the Exam Creation MVP. DOCX Ingestion and AI Processing contracts are reconciled, including the Exam Creation-owned Admin cap-request lifecycle and AI Processing-owned cap enforcement.
