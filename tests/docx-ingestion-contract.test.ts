import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  assertCanonicalDocumentVersion,
  canonicalDocumentSchema,
  INGESTION_ISSUE_CODES,
  ingestionAttemptContractSchema,
  ingestionHandoffSchema,
  ingestionIssueSchema,
  supportsCanonicalDocumentVersion,
} from "../packages/docx-ingestion-contracts/src/index.js";

const root = process.cwd();
const fixture = (name: string): unknown =>
  JSON.parse(
    readFileSync(
      resolve(root, "packages/docx-ingestion-contracts/fixtures", name),
      "utf8",
    ),
  );

test("DI-002 canonical document 1.0 accepts the published minimal fixture", () => {
  const document = fixture("canonical-document-1.0.minimal.valid.json");
  assert.doesNotThrow(() => canonicalDocumentSchema.parse(document));
  const ajv = new Ajv2020({ strict: true });
  addFormats(ajv);
  const schema = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/docx-ingestion-contracts/schemas/canonical-document-1.0.json",
      ),
      "utf8",
    ),
  );
  const validate = ajv.compile(schema);
  assert.equal(validate(document), true, JSON.stringify(validate.errors));
  assert.equal(
    validate({ ...(document as object), unknownField: true }),
    false,
  );
  const documentRecord = document as Record<string, unknown>;
  const firstBlock = (documentRecord.blocks as Record<string, unknown>[])[0];
  assert.ok(firstBlock);
  assert.equal(
    validate({
      ...documentRecord,
      blocks: [{ ...firstBlock, unknownField: true }],
    }),
    false,
  );
  assert.equal(
    validate({
      ...documentRecord,
      blocks: [{ ...firstBlock, type: "unknown" }],
    }),
    false,
  );
});

test("DI-002 handoff 1.0 exposes only successful terminal results", () => {
  const handoff = fixture("handoff-1.0.minimal.valid.json");
  assert.doesNotThrow(() => ingestionHandoffSchema.parse(handoff));
  assert.throws(() =>
    ingestionHandoffSchema.parse({
      ...(handoff as object),
      status: "CANCELLED",
    }),
  );
});

test("DI-002 contracts fail closed on unknown fields, block types, and versions", () => {
  const document = fixture(
    "canonical-document-1.0.minimal.valid.json",
  ) as Record<string, unknown>;
  assert.throws(() =>
    canonicalDocumentSchema.parse({
      ...document,
      temporaryPath: "C:/tmp/a.docx",
    }),
  );
  assert.throws(() =>
    canonicalDocumentSchema.parse({
      ...document,
      blocks: [
        {
          ...((document.blocks as Record<string, unknown>[])[0] ?? {}),
          type: "unknown",
        },
      ],
    }),
  );
  assert.equal(supportsCanonicalDocumentVersion("1.0"), true);
  assert.equal(supportsCanonicalDocumentVersion("2.0"), false);
  assert.throws(
    () => assertCanonicalDocumentVersion("2.0"),
    /UNSUPPORTED_CANONICAL_DOCUMENT_SCHEMA_VERSION:2.0/,
  );
});

test("DI-002 publishes an explicit fail-closed compatibility policy", () => {
  const policy = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/docx-ingestion-contracts/compatibility/canonical-document.json",
      ),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(policy.currentVersion, "1.0");
  assert.deepEqual(policy.supportedReaderVersions, ["1.0"]);
  assert.equal(policy.unknownVersionPolicy, "REJECT");
  assert.equal(policy.unknownFieldPolicy, "REJECT");
  assert.equal(policy.unknownBlockTypePolicy, "REJECT");
});

test("AC-022/TEST-009 DOCX contracts have one feature owner", () => {
  const featurePackage = JSON.parse(
    readFileSync(
      resolve(root, "packages/docx-ingestion-contracts/package.json"),
      "utf8",
    ),
  ) as Record<string, unknown>;
  assert.equal(featurePackage.name, "@siromix/docx-ingestion-contracts");
  const rootPackage = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  ) as { scripts: Record<string, string> };
  assert.match(
    rootPackage.scripts["contracts:check"] ?? "",
    /@siromix\/docx-ingestion-contracts contracts:check/,
  );
  assert.doesNotMatch(
    readFileSync(resolve(root, "packages/contracts/src/index.ts"), "utf8"),
    /docx-ingestion|@siromix\/docx-ingestion-contracts/i,
  );
  assert.equal(
    readFileSync(
      resolve(
        root,
        "workers/document-ai/src/siromix_worker/generated/docx_ingestion.py",
      ),
      "utf8",
    ).includes('SchemaVersion = Literal["1.0"]'),
    true,
  );
});

test("DI-002 issue contract enforces blocker/warning downstream policy", () => {
  const base = {
    issueId: "issue:1",
    code: "FORMULA_CONVERSION_FAILED",
    category: "FORMULA",
    safeSummary: "Formula could not be normalized.",
    retryability: "NOT_RETRYABLE",
    terminal: true,
    preservedWork: "COMMITTED_STAGES_PRESERVED",
    recommendedAction: "REPLACE_DOCX",
    parserVersion: "1.0.0",
    schemaVersion: "1.0",
    canonicalizationConfigVersion: "1.0.0",
  };
  assert.doesNotThrow(() =>
    ingestionIssueSchema.parse({
      ...base,
      severity: "BLOCKING_ERROR",
      downstreamPermitted: false,
    }),
  );
  assert.throws(() =>
    ingestionIssueSchema.parse({
      ...base,
      severity: "BLOCKING_ERROR",
      downstreamPermitted: true,
    }),
  );
  assert.doesNotThrow(() =>
    ingestionIssueSchema.parse({
      ...base,
      code: "PRESENTATION_ONLY_CONTENT_LOSS",
      category: "CONTENT",
      severity: "WARNING",
      terminal: false,
      preservedWork: "ALL_VALID_WORK_PRESERVED",
      recommendedAction: "REVIEW_WARNING",
      downstreamPermitted: true,
    }),
  );
});

test("DI-002 attempt contract versions every parser/config boundary and status", () => {
  assert.doesNotThrow(() =>
    ingestionAttemptContractSchema.parse({
      attemptId: "attempt:1",
      sequence: 1,
      sourceDocumentVersionId: "source:1",
      idempotencyKey: "ingest:1",
      correlationId: "correlation:1",
      parserIdentity: "siromix-docx-parser",
      parserVersion: "1.0.0",
      schemaVersion: "1.0",
      canonicalizationConfigVersion: "1.0.0",
      status: "RECEIVED",
      stageTimestamps: {
        RECEIVED: "2026-07-31T00:00:00.000Z",
      },
      workerIdentity: "document-ai",
      workerVersion: "1.0.0",
      reuseDecision: "NOT_CHECKED",
      metrics: {},
    }),
  );
});

test("DI-003 publishes every BR-016/BR-017 issue code with stable recovery metadata", () => {
  const taxonomy = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/docx-ingestion-contracts/compatibility/issue-taxonomy-1.0.json",
      ),
      "utf8",
    ),
  ) as {
    version: string;
    unknownCodePolicy: string;
    ambiguousSeverityPolicy: string;
    entries: Array<
      Record<string, unknown> & { code: string; severity: string }
    >;
  };
  assert.equal(taxonomy.version, "1.0");
  assert.equal(taxonomy.unknownCodePolicy, "REJECT");
  assert.equal(taxonomy.ambiguousSeverityPolicy, "BLOCKING_ERROR");
  assert.deepEqual(
    taxonomy.entries.map(({ code }) => code),
    [...INGESTION_ISSUE_CODES],
  );
  assert.equal(new Set(INGESTION_ISSUE_CODES).size, 14);

  for (const entry of taxonomy.entries) {
    assert.doesNotThrow(() =>
      ingestionIssueSchema.parse({
        issueId: `issue:${entry.code.toLowerCase()}`,
        ...entry,
        safeSummary: entry.safeSummary,
        parserVersion: "1.0.0",
        schemaVersion: "1.0",
        canonicalizationConfigVersion: "1.0.0",
      }),
    );
    assert.equal(
      entry.downstreamPermitted,
      entry.severity === "WARNING",
      entry.code,
    );
  }
  assert.equal(
    taxonomy.entries.find(({ code }) => code === "SEVERITY_AMBIGUOUS")
      ?.severity,
    "BLOCKING_ERROR",
  );
});

test("DI-003 issue readers reject unknown codes and inconsistent severity policy", () => {
  const issue = {
    issueId: "issue:unknown",
    code: "UNSPECIFIED_FAILURE",
    severity: "BLOCKING_ERROR",
    category: "CONTENT",
    safeSummary: "The document could not be processed safely.",
    downstreamPermitted: false,
    retryability: "NOT_RETRYABLE",
    terminal: true,
    preservedWork: "COMMITTED_STAGES_PRESERVED",
    recommendedAction: "CONTACT_SUPPORT",
    parserVersion: "1.0.0",
    schemaVersion: "1.0",
    canonicalizationConfigVersion: "1.0.0",
  };
  assert.throws(() => ingestionIssueSchema.parse(issue));
  assert.throws(() =>
    ingestionIssueSchema.parse({
      ...issue,
      code: "PRESENTATION_ONLY_CONTENT_LOSS",
      severity: "WARNING",
      downstreamPermitted: false,
    }),
  );
});

test("DI-003 rejects every code-to-metadata mismatch", () => {
  const taxonomy = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/docx-ingestion-contracts/compatibility/issue-taxonomy-1.0.json",
      ),
      "utf8",
    ),
  ) as { entries: Array<Record<string, unknown> & { code: string }> };
  const cases = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/docx-ingestion-contracts/fixtures/issue-taxonomy-conformance-cases.json",
      ),
      "utf8",
    ),
  ) as {
    fields: Array<{ name: string; alternatives: unknown[] }>;
  };
  for (const entry of taxonomy.entries) {
    const issue = {
      issueId: `issue:${entry.code.toLowerCase()}`,
      ...entry,
      parserVersion: "1.0.0",
      schemaVersion: "1.0",
      canonicalizationConfigVersion: "1.0.0",
    };
    for (const field of cases.fields) {
      const invalidValue = field.alternatives.find(
        (candidate) => candidate !== issue[field.name],
      );
      assert.notEqual(invalidValue, undefined);
      assert.throws(
        () =>
          ingestionIssueSchema.parse({
            ...issue,
            [field.name]: invalidValue,
          }),
        `${entry.code}:${field.name}`,
      );
    }
  }
});
