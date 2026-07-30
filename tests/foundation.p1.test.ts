import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import test from "node:test";
import { foundationEnvelopeSchema } from "../packages/contracts/src/index.ts";
import {
  createTraceCarrier,
  propagateTrace,
  redact,
  sharedBoundaries,
} from "../packages/observability/src/index.ts";
import {
  exerciseFailureMatrix,
  RegistrationCatalog,
} from "../packages/testkit/src/index.ts";
import { verifyCommandContract } from "../scripts/command-contract.mjs";
import { inspectMigrations } from "../scripts/migration-contract.mjs";

const root = process.cwd();

test("MVP-AC-010 TypeScript boundary accepts only the authoritative 1.0 contract", () => {
  const fixture = JSON.parse(
    readFileSync(
      resolve(
        root,
        "packages/contracts/fixtures/foundation-envelope.valid.json",
      ),
      "utf8",
    ),
  );
  assert.deepEqual(foundationEnvelopeSchema.parse(fixture), fixture);
  assert.throws(() =>
    foundationEnvelopeSchema.parse({ ...fixture, schemaVersion: "1.1" }),
  );
  assert.throws(() =>
    foundationEnvelopeSchema.parse({ ...fixture, schemaVersion: "2.0" }),
  );
  assert.throws(() =>
    foundationEnvelopeSchema.parse({ ...fixture, unknown: true }),
  );
});

test("AC-005 migration contract detects ordering, mutation, and destructive cleanup", () => {
  const directory = resolve(root, "packages/database/prisma/migrations");
  const migrations = inspectMigrations(directory);
  assert.ok(migrations.length >= 3);
  const checksums = Object.fromEntries(
    migrations.map(({ name, checksum }) => [name, checksum]),
  );
  assert.deepEqual(inspectMigrations(directory, checksums), migrations);
  assert.throws(
    () =>
      inspectMigrations(directory, {
        ...checksums,
        [migrations[0].name]: "0",
      }),
    /MIGRATION_CHECKSUM_CHANGED/,
  );

  const fixture = mkdtempSync(resolve(tmpdir(), "siromix-migration-"));
  const migration = resolve(fixture, "202607300003_destructive");
  mkdirSync(migration);
  writeFileSync(resolve(migration, "migration.sql"), 'DROP TABLE "Tenant";');
  assert.throws(
    () => inspectMigrations(fixture),
    /DESTRUCTIVE_MIGRATION_REJECTED/,
  );
});

test("AC-013 trace context propagates unchanged across every shared boundary", () => {
  const context = {
    correlationId: "019b76da-a800-7000-8000-000000000001",
    causationId: "019b76da-a800-7000-8000-000000000002",
    traceparent: "00-0123456789abcdef0123456789abcdef-0123456789abcdef-01",
  };
  const result = sharedBoundaries.reduce(
    propagateTrace,
    createTraceCarrier(context),
  );
  assert.deepEqual(result, { ...context, visited: [...sharedBoundaries] });
});

test("AC-014 prohibited keys and embedded credential values are redacted", () => {
  const markers = {
    sourceContent: "private exam",
    prompt: "private prompt",
    answer: "A",
    rawResponse: { authorization: "Bearer marker" },
    assetBytes: "binary",
    password: "password-marker",
    safeSignedValue:
      "https://objects.example.test/file?x-amz-signature=marker-value",
    safeTokenValue: "Bearer token-marker",
  };
  const serialized = JSON.stringify(redact(markers));
  for (const marker of [
    "private exam",
    "private prompt",
    '"A"',
    "Bearer marker",
    "binary",
    "password-marker",
    "marker-value",
    "token-marker",
  ])
    assert.equal(serialized.includes(marker), false, marker);
});

test("AC-020 command contract is platform-neutral and complete", () => {
  const packageJson = JSON.parse(
    readFileSync(resolve(root, "package.json"), "utf8"),
  );
  assert.deepEqual(verifyCommandContract(packageJson.scripts).platforms, [
    "windows-powershell",
    "ci-linux",
  ]);
});

test("AC-023 failure matrix classifies every lifecycle point", async () => {
  const outcomes = await exerciseFailureMatrix(async (point) => {
    if (point !== "during-retry") throw new Error("DEPENDENCY_UNAVAILABLE");
  });
  assert.deepEqual(outcomes, {
    "before-start": "DEPENDENCY_UNAVAILABLE",
    "during-side-effect": "DEPENDENCY_UNAVAILABLE",
    "before-commit": "DEPENDENCY_UNAVAILABLE",
    "after-commit-before-ack": "DEPENDENCY_UNAVAILABLE",
    "during-retry": "converged",
    "during-shutdown": "DEPENDENCY_UNAVAILABLE",
  });
});

test("AC-026/028 consumer and registration changes remain owner-isolated", () => {
  const consumers = JSON.parse(
    readFileSync(
      resolve(root, "packages/contracts/fixtures/consumers.json"),
      "utf8",
    ),
  );
  assert.deepEqual(
    new Set(consumers.consumers),
    new Set(["exam-creation", "docx-ingestion", "ai-processing"]),
  );
  const catalog = new RegistrationCatalog();
  catalog.register("ai-processing", "provider.fake.v1");
  const examBefore = catalog.snapshot("exam-creation");
  catalog.register("docx-ingestion", "worker.parser.v1");
  assert.deepEqual(catalog.snapshot("exam-creation"), examBefore);
  assert.deepEqual(catalog.snapshot("ai-processing"), ["provider.fake.v1"]);
});
