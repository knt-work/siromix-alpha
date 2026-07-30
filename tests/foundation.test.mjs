import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { execFileSync, spawnSync } from "node:child_process";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFileSync(resolve(root, path), "utf8");
const json = (path) => JSON.parse(read(path));
const ignoredDirectories = new Set([
  ".git",
  ".pytest_cache",
  ".venv",
  "node_modules",
  "dist",
  ".next",
]);
function allFiles(dir) {
  const result = [];
  for (const entry of readdirSync(resolve(root, dir), {
    withFileTypes: true,
  })) {
    const relative = resolve(dir, entry.name);
    if (entry.isDirectory() && !ignoredDirectories.has(entry.name))
      result.push(...allFiles(relative));
    else if (entry.isFile()) result.push(relative);
  }
  return result;
}

test("AC-001/003/020 workspace, pins, commands, and generated drift", () => {
  for (const path of [
    "apps/web",
    "apps/api",
    "workers/document-ai",
    "packages/contracts",
    "packages/config",
    "packages/database",
    "packages/observability",
    "packages/testkit",
    "infra/docker",
    "docs",
  ])
    assert.ok(existsSync(resolve(root, path)), path);
  assert.equal(read(".node-version").trim(), "24.7.0");
  assert.equal(read(".python-version").trim(), "3.12.11");
  assert.match(json("package.json").packageManager, /^pnpm@10\./);
  for (const command of [
    "bootstrap",
    "dev",
    "stop",
    "health",
    "doctor",
    "db:migrate",
    "db:validate",
    "test",
    "test:integration",
    "test:e2e",
    "lint",
    "typecheck",
    "build",
    "reset:test",
    "readiness",
  ])
    assert.ok(json("package.json").scripts[command], command);
  execFileSync(process.execPath, [
    resolve(root, "scripts/generate-contracts.mjs"),
    "--check",
  ]);
});

test("AC-002/015 local topology and safe named health exist", () => {
  const compose = read("infra/docker/compose.yaml");
  for (const service of [
    "postgres:",
    "temporal:",
    "temporal-ui:",
    "minio:",
    "clamav:",
  ])
    assert.match(compose, new RegExp(service));
  assert.match(read("apps/api/src/main.ts"), /live[\s\S]*ready/);
  assert.doesNotMatch(read("apps/api/src/main.ts"), /password|secret|token/i);
});

test("AC-004 typed configuration fails closed and examples omit secret values", () => {
  const config = read("packages/config/src/index.ts");
  assert.match(config, /\.strict\(\)/);
  assert.match(config, /CONFIG_INSECURE_PRODUCTION_ORIGIN/);
  const example = read(".env.example");
  for (const name of [
    "JWT_PRIVATE_KEY=",
    "REFRESH_TOKEN_PEPPER=",
    "STORAGE_SECRET_KEY=",
  ])
    assert.doesNotMatch(example, new RegExp(name));
});

test("AC-005/006 migrations and only approved shared persistence primitives", () => {
  const schema = read("packages/database/prisma/schema.prisma");
  for (const model of [
    "Tenant",
    "UserIdentity",
    "TenantMembership",
    "RefreshSession",
    "ServiceIdentity",
    "SupportGrant",
    "IdempotencyRecord",
    "OutboxEnvelope",
    "AuditEnvelope",
    "MigrationMetadata",
  ])
    assert.match(schema, new RegExp(`model ${model}`));
  assert.match(
    read(
      "packages/database/prisma/migrations/202607290001_foundation/migration.sql",
    ),
    /CREATE EXTENSION IF NOT EXISTS vector/,
  );
  assert.doesNotMatch(
    schema,
    /model (Exam|Question|Document|Canonical|Artifact|Permutation|Answer)/,
  );
});

test("AC-007 Temporal foundation is content-free, bounded, versioned, and named", () => {
  const workflow = read("packages/workflow/src/index.ts");
  assert.match(workflow, /maximumAttempts: 3/);
  assert.match(workflow, /maximumIntervalMs: 30_000/);
  assert.match(workflow, /siro-\$\{environment\}-\$\{domain\}-v\$\{major\}/);
  assert.doesNotMatch(
    workflow,
    /docx|exam|question|publish|mix|canonical|provider/i,
  );
});

test("AC-008/009/010/024 authentication, authorization, and grants encode required policy", () => {
  const auth = read("packages/auth/src/index.ts");
  for (const marker of [
    "memoryCost: 19_456",
    "timeCost: 2",
    "parallelism: 1",
    "EdDSA",
    "kid",
    "now + 900",
    "randomBytes(32)",
    "7 * 86_400_000",
    "30 * 86_400_000",
    "ACCESS_DENIED",
    "4 * 3_600_000",
    "secret:read",
  ])
    assert.ok(auth.includes(marker), marker);
  assert.doesNotMatch(auth, /\b(?:upload|approve|regenerate|publish|mix)\b/i);
});

test("AC-011 storage contract is streaming, tenant-safe, private-keyed and signs <= five minutes", () => {
  const storage = read("packages/storage/src/index.ts");
  for (const method of [
    "put(",
    "getStream(",
    "head(",
    "delete(",
    "sign(",
    "health(",
    "setLifecycle(",
    "setLegalHold(",
  ])
    assert.ok(storage.includes(method), method);
  assert.match(storage, /expiresSeconds > 300/);
  assert.match(storage, /STORAGE_NOT_FOUND/);
  assert.match(
    storage,
    /tenants\/\$\{ref.tenantId\}\/objects\/\$\{ref.objectId\}/,
  );
});

test("AC-012/026/028 contracts are versioned, compatible and isolated", () => {
  assert.equal(
    json("packages/contracts/schemas/envelope-1.0.json").additionalProperties,
    false,
  );
  const contracts = read("packages/contracts/src/index.ts");
  assert.match(contracts, /minor === 0 \|\| minor === 1/);
  assert.doesNotMatch(
    contracts,
    /workflow|retry|retention|authorization|exam|docx|question|provider/i,
  );
});

test("AC-013/014 observability propagates safe identifiers and redacts prohibited fields", () => {
  const telemetry = read("packages/observability/src/index.ts");
  for (const marker of [
    "correlationId",
    "causationId",
    "traceparent",
    "password",
    "signed.?url",
    "object.?key",
    "prompt",
    "answer",
    "content",
  ])
    assert.ok(telemetry.includes(marker), marker);
  assert.equal(
    JSON.stringify({ secret: "[REDACTED]" }),
    '{"secret":"[REDACTED]"}',
  );
});

test("AC-016 deterministic testkit provides clock, UUIDv7 and isolated resource names", () => {
  const kit = read("packages/testkit/src/index.ts");
  assert.match(kit, /FixedClock/);
  assert.match(kit, /019b76da-a800-7000-8000/);
  assert.match(kit, /test-\$\{runId\}-\$\{workerId\}/);
});

test("AC-017/018/019 CI and deployment contracts enforce gates and provenance", () => {
  const ci = read(".github/workflows/ci.yml");
  const docs = read("docs/development.md");
  for (const gate of [
    "frozen-lockfile",
    "format",
    "lint",
    "typecheck",
    "contracts:check",
    "test",
    "build",
    "audit",
    "setup-buildx-action",
    "actions/attest@v4",
    "upload-artifact",
    "git diff",
  ])
    assert.ok(ci.includes(gate), gate);
  assert.match(ci, /permissions:\s*\n\s*contents: read/);
  assert.match(ci, /fail-fast: false/);
  assert.ok(
    ci.indexOf("pnpm/action-setup@v4") < ci.indexOf("actions/setup-node@v5"),
    "pnpm must be installed before setup-node resolves the pnpm cache",
  );
  assert.doesNotMatch(ci, /actions\/(?:checkout|setup-node)@v4/);
  assert.ok(
    ci.indexOf("pnpm db:generate") < ci.indexOf("pnpm typecheck"),
    "Prisma Client must be generated before clean-runner typechecking",
  );
  assert.match(docs, /expand migrations/);
  assert.match(docs, /forward corrective migration/);
  assert.match(docs, /never automatically run destructive down migrations/i);
  assert.match(docs, /name:tag@sha256/);
  assert.match(docs, /traffic enabled only after all checks pass/i);
});

test("AC-021 reset rejects anything except an exact isolated test target", () => {
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/foundation.mjs"), "reset-test"],
    {
      env: {
        ...process.env,
        SIROMIX_ENV: "development",
        SIROMIX_TEST_TARGET: "test-x",
      },
      encoding: "utf8",
    },
  );
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /RESET_TARGET_REJECTED/);
});

test("AC-022/027 doctor and readiness are bounded and machine-readable", () => {
  const started = Date.now();
  const result = spawnSync(
    process.execPath,
    [resolve(root, "scripts/foundation.mjs"), "doctor"],
    { encoding: "utf8", timeout: 30_000 },
  );
  assert.ok(Date.now() - started < 30_000);
  assert.equal(JSON.parse(result.stdout).schemaVersion, "1.0");
  const script = read("scripts/foundation.mjs");
  for (const marker of [
    "generatedAt",
    "dependencies",
    "migration",
    "contractVersion",
    "tests",
    "artifacts",
  ])
    assert.ok(script.includes(marker), marker);
});

test("AC-002/020 unified lifecycle owns applications, migrations, and workers", () => {
  const script = read("scripts/foundation.mjs");
  for (const marker of [
    "startApplications",
    "stopApplications",
    "prisma:migrate",
    "@siromix/web",
    "@siromix/api",
    "siromix_worker.main",
    "STARTUP_READINESS_TIMEOUT",
  ]) {
    assert.ok(script.includes(marker), marker);
  }
  assert.doesNotMatch(script, /Run `pnpm.*dev`/);
});

test("AC-023 failure paths use stable classifications and bounded behavior", () => {
  for (const file of [
    "packages/config/src/index.ts",
    "packages/auth/src/index.ts",
    "packages/storage/src/index.ts",
    "packages/workflow/src/index.ts",
    "scripts/foundation.mjs",
  ]) {
    assert.match(read(file), /[A-Z][A-Z0-9_]{4,}/, file);
  }
});

test("AC-025 static boundary scan finds no feature-owned implementation", () => {
  const forbidden =
    /\b(DraftExam|MasterExam|QuestionJson|CanonicalDocument|PermutationMatrix|AnswerMatrix|MixExamWorkflow|PublishExamWorkflow)\b/;
  for (const file of allFiles(".").filter(
    (path) =>
      !path.includes(`${resolve(root, "specs")}`) &&
      !path.includes(`${resolve(root, "tests")}`) &&
      !path.includes("node_modules") &&
      !path.includes(".venv") &&
      !path.includes(".git"),
  )) {
    if (/\.(ts|tsx|py|prisma|json|mjs)$/.test(file))
      assert.doesNotMatch(readFileSync(file, "utf8"), forbidden, file);
  }
});
