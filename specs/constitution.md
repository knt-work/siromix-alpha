# SiroMix Constitution

## Core Principles

### I. Canonical Data Is the System of Record

Every supported source document MUST be transformed into a versioned **Canonical Document** before it is used by AI, exam-management, mixing, or publishing workflows.

The canonicalization process MUST preserve the document's semantic order and meaningful structure, including headings, paragraphs, lists, tables, images, formulas, shapes, and relationships between adjacent elements. Binary assets MUST be stored separately and referenced through stable identifiers rather than embedded as uncontrolled payloads.

Downstream components MUST consume the Canonical Document or an approved domain model derived from it. They MUST NOT depend directly on DOCX internals, temporary parser output, or renderer-specific structures.

Canonicalization MUST be deterministic, idempotent, traceable to the original upload, and reusable so the same source does not need to be parsed repeatedly without a justified reason.

**Rationale:** Stable canonical data prevents document-format details from leaking across the system and creates a reliable foundation for AI processing, editing, search, reuse, and future input formats.

### II. Engine Separation and Contract-First Boundaries

SiroMix MUST maintain three independently responsible engines:

1. **AI Engine** — understands canonicalized content and produces structured question data.
2. **Mixing Engine** — creates exam variants using deterministic algorithms.
3. **Publishing Engine** — renders approved exam data into delivery formats.

Each engine MUST communicate through explicit, versioned contracts. Shared code MUST be limited to stable domain types, validation rules, infrastructure utilities, and documented interfaces.

The following boundaries are mandatory:

- The AI Engine MUST NOT determine exam permutations or final document layout.
- The Mixing Engine MUST NOT call an AI model or rewrite question meaning.
- The Publishing Engine MUST NOT infer, correct, or change question content, answer choices, or correct answers.
- User-interface code MUST NOT contain hidden business rules that belong to an engine or domain service.
- A new renderer, AI provider, parser, or mixing strategy MUST be replaceable without forcing unrelated engines to be rewritten.

**Rationale:** Clean boundaries reduce coupling, make failures easier to isolate, and allow each capability to evolve independently.

### III. AI Produces Validated Drafts, Not Unreviewed Truth

All AI-generated or AI-extracted content MUST be treated as a **draft** until it has passed automated validation and explicit human review.

AI responses MUST conform to a versioned JSON Schema. The backend MUST validate both structural correctness and domain rules before the response may become a Draft Exam. Invalid output MUST be rejected, repaired, or regenerated through a bounded and observable recovery process.

At minimum, validation MUST cover:

- Required question fields and supported question types.
- Valid answer-option structure.
- Existence and validity of the declared correct answer.
- Consistency between questions, answers, explanations, tables, and media references.
- Duplicate, empty, malformed, or unsupported content.
- Requested question count when questions are generated from a knowledge source.

The system MUST record the source-document version, prompt-template version, JSON Schema version, model/provider identifier, and processing attempt associated with each AI result.

No AI result may become an official Exam or official answer key without an explicit teacher approval action.

**Rationale:** AI is probabilistic. Schema enforcement, business validation, provenance, and human approval are required to protect educational accuracy.

### IV. Exam Integrity and Deterministic Mixing

An approved **Master Exam** MUST be the authoritative content source for every generated exam code.

The Mixing Engine MUST operate on stable question identifiers and MUST produce a persisted **Permutation Matrix** and corresponding **Answer Matrix**. Given the same Master Exam version, mixing rules, codes, and seed, the system MUST be able to reproduce the same result.

For the current MVP, mixing MUST only permute question order. It MUST NOT modify question text, answer choices, media, tables, explanations, or the correct-answer relationship. Any future answer-choice permutation or advanced mixing rule requires a separate specification, explicit integrity rules, and dedicated automated tests.

The following invariants MUST always hold:

- Every question in a variant maps to exactly one question in the Master Exam.
- No question is silently lost or duplicated unless the selected strategy explicitly permits it.
- The Answer Matrix matches the rendered order for every exam code.
- Rendering the same stored matrices does not require another AI call or another mixing operation.

**Rationale:** Exam and answer-key correctness is more important than convenience, novelty, or implementation speed.

### V. Human Control, Reversible Editing, and Versioned Approval

Teachers MUST be able to review and edit a Draft Exam without re-running the AI pipeline. Edits MUST update the Draft Exam domain model and the preview MUST be regenerated from that updated model.

The product MUST clearly distinguish among:

- Uploaded source material.
- Canonical Document.
- AI processing result.
- Draft Exam.
- Approved Master Exam.
- Mixed exam variants.
- Published artifacts.

An Exam becomes official only through an explicit save or approval action. Destructive actions, regeneration, replacement, or publication MUST be clearly communicated and MUST NOT silently overwrite an approved version.

Changes to an approved Master Exam that affect content or answers MUST create a new version or trigger explicit invalidation and regeneration of dependent permutations, answer matrices, previews, and exports.

**Rationale:** The teacher remains the final authority, while clear lifecycle states prevent accidental corruption and stale derived data.

### VI. Testable Correctness Is a Release Gate

Automated tests are mandatory for all business-critical behavior. A feature is not complete merely because it works in a manual demonstration.

The minimum test strategy MUST include, where applicable:

- Unit tests for domain rules and transformations.
- Contract tests for Canonical Document, Question JSON, Draft Exam, Master Exam, Permutation Matrix, Answer Matrix, and renderer interfaces.
- Fixture or golden-document tests for DOCX parsing and canonicalization.
- Property-based or invariant tests for mixing correctness.
- Semantic output checks for answer keys and published documents.
- Integration tests for storage, queues, AI adapters, and rendering adapters.
- End-to-end tests for the critical teacher workflow from metadata entry through review, approval, mixing, preview, and export.
- Regression tests for every confirmed production defect affecting content, answers, ordering, or publication.

Tests that protect exam correctness, data integrity, security, or contractual schemas MUST NOT be skipped to meet a delivery deadline. Failing mandatory tests block release.

**Rationale:** SiroMix handles high-consequence educational content; correctness must be demonstrable and repeatable.

### VII. Reliable, Idempotent, and Observable Processing

Long-running operations MUST be implemented as explicit stages with durable status, including upload, canonicalization, AI processing, validation, Draft Exam creation, mixing, and publishing.

Every retryable operation MUST be idempotent or protected by an idempotency mechanism. Retrying a request MUST NOT create duplicate Exams, questions, matrices, files, or billing events.

The system MUST provide:

- Correlation identifiers across the complete processing flow.
- Structured logs and stage-level metrics.
- Actionable error states visible to the user.
- Bounded retries with backoff for transient failures.
- Clear handling for permanent validation or business-rule failures.
- Audit events for approval, regeneration, mixing, export, and destructive changes.

Logs MUST avoid storing complete source documents, prompts, answers, or other sensitive content unless explicitly required, secured, and governed by retention rules.

**Rationale:** AI and document-processing pipelines can fail partially; recovery and diagnosis must be designed rather than improvised.

### VIII. Security, Privacy, and Least Privilege by Default

Uploaded documents, generated questions, answer keys, school information, and teacher information MUST be treated as private data.

All implementations MUST apply least privilege, server-side authorization, secure secret management, input validation, and safe file handling. Uploaded files MUST be validated by type and size and processed in an isolated manner appropriate to the chosen architecture.

Where multiple schools, organizations, or users share the platform, data access MUST be tenant-aware and enforced in backend services and data queries, not only in the user interface.

Sensitive data MUST be protected in transit and at rest. Temporary files, generated artifacts, and signed download links MUST have explicit lifecycle and access rules. External AI-provider usage MUST be documented, including what data is sent, how it is retained, and which provider settings protect customer data.

Security-relevant actions and authorization failures MUST be auditable. Secrets, tokens, and credentials MUST never be committed to source control or exposed in client-side code or logs.

**Rationale:** Educational documents and answer keys are sensitive assets whose exposure could harm users and invalidate assessments.

### IX. On-Demand Publishing and Extensibility Without Core Rewrites

Published files MUST be derived from approved business data, not treated as the primary database record.

The Publishing Engine MUST combine the Master Exam, Permutation Matrix, Answer Matrix, and a versioned Template to generate outputs on demand. DOCX, PDF, HTML, answer matrices, ZIP packages, print packages, and future formats MUST be implemented as renderer adapters behind a common contract.

Adding or changing an output format MUST NOT require changes to the AI Engine or Mixing Engine. Renderer-specific formatting data MUST NOT contaminate core question or exam models.

Generated artifacts MAY be cached for performance, but the cache MUST be traceable to exact input versions and MUST be invalidated when the Master Exam, matrices, or template changes. The system SHOULD avoid permanently storing redundant files when they can be reproduced reliably.

**Rationale:** Business data is durable; presentation formats change. On-demand rendering minimizes duplication and keeps future publishing options open.

### X. MVP Discipline, Simplicity, and Measured Evolution

The MVP MUST solve the complete core workflow reliably before introducing advanced capabilities. Implementations MUST favor the simplest architecture that satisfies the principles and documented scale requirements.

For the initial release, the following constraints define the expected product boundary unless an approved specification explicitly changes them:

- One DOCX source file per exam-creation workflow.
- Two source modes: raw exam extraction and knowledge-based question generation.
- A teacher reviews and edits the Draft Exam before approval.
- A maximum of four exam codes per mixing operation.
- Question-order permutation only.
- Publishing is generated on demand from business data.

New abstractions, services, infrastructure components, AI calls, caches, or persistent representations MUST have a documented need. Premature microservices, duplicate data models, hidden fallback logic, and speculative generalization are prohibited.

Every proposal to expand the MVP MUST state its effect on data contracts, engine boundaries, exam integrity, security, testing, operational cost, and migration requirements.

**Rationale:** A focused, reliable product is preferable to a broad but fragile platform.

### XI. Local-First Development and Production Parity

SiroMix MUST be fully runnable in a local development environment without requiring developers to connect to production infrastructure or use production credentials. A new developer MUST be able to start the application and its required dependencies through a documented, repeatable setup with minimal manual configuration.

Local, test, staging, and production environments MUST use the same application architecture, service contracts, database schema, migration mechanism, job-processing model, and configuration structure wherever technically practical. Environment-specific differences MUST be limited to external configuration such as credentials, endpoints, resource sizes, scaling policies, and managed-service bindings.

The same versioned application artifact SHOULD be promoted across environments rather than rebuilt differently for each environment. Configuration MUST be externalized, secrets MUST NOT be committed to source control, and environment selection MUST NOT rely on hidden code branches or manually edited source files.

Infrastructure dependencies such as databases, object storage, queues, caches, document converters, and AI providers MUST be accessed through explicit interfaces. Local-compatible implementations, emulators, or containers MAY be used, but they MUST preserve the production-facing contracts and meaningful failure behavior. Any unavoidable difference between local and production MUST be documented, testable, and included in deployment risk assessment.

Database migrations, seed data, health checks, background workers, file-processing behavior, and publishing dependencies MUST be executable and verifiable locally. Deployment to production MUST be automated, repeatable, rollback-capable, and based on the same validated configuration model used in lower environments.

**Rationale:** A small local-to-production gap reduces environment-specific defects, shortens onboarding and debugging time, and makes releases safer and more predictable.

## Architecture and Data Invariants

The following rules are mandatory across specifications, plans, tasks, and implementations:

1. **Parse once, reuse many times:** canonicalized content SHOULD be reused unless the source or parser version requires reprocessing.
2. **Structured data before presentation:** Draft Exams, Master Exams, questions, and matrices are domain data; DOCX, PDF, HTML, and ZIP are derived artifacts.
3. **Stable identity:** documents, questions, exams, variants, templates, assets, and processing attempts MUST use stable identifiers.
4. **Versioned contracts:** externally persisted or cross-engine schemas MUST be versioned and migration-aware.
5. **No silent data loss:** unsupported document elements or validation failures MUST produce explicit warnings or errors.
6. **Derived-data traceability:** every variant and export MUST identify the exact Master Exam, matrices, template, and renderer version used.
7. **Safe regeneration:** regeneration MUST create a new processing attempt and MUST NOT silently replace approved data.
8. **Separation of draft and official data:** incomplete or unapproved AI output MUST NOT enter the official Exam or Question Bank as authoritative content.
9. **Question-bank provenance:** reused questions MUST retain their source and version history where applicable.
10. **Database independence from file formats:** core business queries MUST NOT require opening generated DOCX or PDF files.
11. **Environment parity:** local, test, staging, and production MUST preserve the same contracts, migrations, and runtime behavior wherever practical; differences MUST be explicit configuration rather than hidden code divergence.

## Development Workflow and Quality Gates

Every feature specification and implementation plan MUST identify:

- The user problem and measurable acceptance criteria.
- The engine or domain boundary that owns the behavior.
- Data contracts and schema changes.
- Security and privacy impact.
- Failure modes, retries, and idempotency requirements.
- Observability and audit requirements.
- Required automated tests.
- Migration, backward-compatibility, and rollback considerations.
- AI cost and provider impact when AI is involved.
- Publishing and cache invalidation impact when rendered output is involved.
- Local runtime, deployment, environment parity, and rollback impact.

A **Constitution Check** MUST be completed before implementation planning is approved and repeated after the design is complete. Any violation MUST be resolved or documented as an explicit exception approved through the governance process.

Pull requests MUST be small enough to review, linked to an approved specification or task, and accompanied by relevant tests. Code review MUST verify domain correctness and constitutional compliance, not only code style.

No feature is considered done until:

1. Acceptance criteria pass.
2. Mandatory automated tests pass.
3. Schema and migration changes are documented.
4. Security and privacy concerns are addressed.
5. Logs, metrics, and user-visible failure behavior are implemented where required.
6. Documentation and operational instructions are updated.
7. No unresolved violation of this Constitution remains.

## Governance

This Constitution is the highest-level engineering and product-governance authority for SiroMix. It supersedes conflicting implementation shortcuts, informal conventions, feature plans, and task descriptions.

Amendments MUST:

1. Be proposed in writing with a clear rationale.
2. Identify affected principles, contracts, data, features, and migrations.
3. Describe compatibility and rollout consequences.
4. Receive explicit approval from the project owner or designated technical authority.
5. Update dependent Spec Kit templates and guidance when necessary.
6. Record the amendment date and increment the Constitution version.

Versioning follows semantic principles:

- **MAJOR:** Removes or fundamentally redefines a principle, engine boundary, or governance rule.
- **MINOR:** Adds a principle or materially expands mandatory guidance.
- **PATCH:** Clarifies language without changing intended obligations.

All specifications, plans, task lists, code reviews, and releases MUST be evaluated against the active Constitution version. Exceptions MUST be explicit, narrowly scoped, time-bounded where possible, and recorded with an owner and remediation plan.

**Version**: 1.1.0  
**Ratified**: 2026-07-28  
**Last Amended**: 2026-07-28
