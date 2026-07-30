import assert from "node:assert/strict";
import test from "node:test";
import { generateKeyPair } from "jose";
import {
  authorize,
  createRefreshCredential,
  csrfMatches,
  hashPassword,
  issueAccessToken,
  normalizeEmail,
  passwordPolicy,
  refreshMatches,
  validateSupportGrant,
  verifyAccessToken,
  verifyPassword,
} from "../packages/auth/src/index.ts";
import {
  assertNoBrowserSecrets,
  parseConfig,
} from "../packages/config/src/index.ts";
import { redact, safeError } from "../packages/observability/src/index.ts";
import {
  deterministicUuidV7,
  FixedClock,
  isolatedResource,
} from "../packages/testkit/src/index.ts";
import {
  assertRetryDoesNotBroaden,
  baselineActivityRetry,
  foundationSmokeActivity,
  taskQueue,
} from "../packages/workflow/src/index.ts";

test("AC-004 configuration rejects unknown values, browser secrets, and insecure production", () => {
  const input = {
    SIROMIX_ENV: "test",
    CONFIG_VERSION: "1",
    DATABASE_URL: "postgresql://user:pass@localhost:5432/test",
    WEB_ORIGIN: "http://localhost:3000",
    API_ORIGIN: "http://localhost:3001",
  };
  assert.equal(parseConfig(input).SIROMIX_ENV, "test");
  assert.throws(() => parseConfig({ ...input, UNKNOWN: "x" }));
  assert.throws(() =>
    parseConfig({
      ...input,
      SIROMIX_ENV: "production",
      API_ORIGIN: "http://api.example.test",
    }),
  );
  assert.throws(() =>
    assertNoBrowserSecrets({ NEXT_PUBLIC_JWT_PRIVATE_KEY: "not-safe" }),
  );
});

test("AC-008 password hashing and email normalization follow the shared policy", async () => {
  assert.deepEqual(
    {
      memoryCost: passwordPolicy.memoryCost,
      timeCost: passwordPolicy.timeCost,
      parallelism: passwordPolicy.parallelism,
    },
    { memoryCost: 19_456, timeCost: 2, parallelism: 1 },
  );
  const hash = await hashPassword("correct horse battery staple");
  assert.equal(
    (await verifyPassword(hash, "correct horse battery staple")).valid,
    true,
  );
  assert.equal((await verifyPassword(hash, "incorrect")).valid, false);
  assert.equal(normalizeEmail("  TÉACHER@Example.COM "), "téacher@example.com");
});

test("AC-008 Ed25519 tokens enforce kid, audience, issuer and fifteen-minute lifetime", async () => {
  const { privateKey, publicKey } = await generateKeyPair("Ed25519");
  const now = Math.floor(Date.now() / 1000);
  const token = await issueAccessToken(
    {
      sub: "019b76da-a800-7000-8000-000000000001",
      tenantId: "019b76da-a800-7000-8000-000000000002",
      role: "teacher",
      scope: [],
    },
    privateKey,
    "key-1",
    "siro-api",
    "siro-web",
    now,
  );
  const verified = await verifyAccessToken(
    token,
    new Map([["key-1", publicKey]]),
    "siro-api",
    "siro-web",
  );
  assert.equal(verified.protectedHeader.alg, "EdDSA");
  assert.equal(verified.payload.exp! - verified.payload.iat!, 900);
  await assert.rejects(() =>
    verifyAccessToken(token, new Map(), "siro-api", "siro-web"),
  );
});

test("AC-008 refresh credentials are random, keyed, and timing-safe", () => {
  const first = createRefreshCredential("test-pepper");
  const second = createRefreshCredential("test-pepper");
  assert.notEqual(first.token, second.token);
  assert.ok(Buffer.from(first.token, "base64url").byteLength >= 32);
  assert.equal(refreshMatches(first.token, first.hash, "test-pepper"), true);
  assert.equal(refreshMatches(first.token, first.hash, "wrong-pepper"), false);
  assert.equal(csrfMatches("a".repeat(32), "a".repeat(32)), true);
  assert.equal(csrfMatches("a".repeat(32), "b".repeat(32)), false);
});

test("AC-009/010 tenant authorization and support grants default deny", () => {
  const tenantId = "019b76da-a800-7000-8000-000000000001";
  authorize({ tenantId, role: "tenant-admin" }, tenantId, ["tenant-admin"]);
  assert.throws(() =>
    authorize(
      { tenantId, role: "tenant-admin" },
      "019b76da-a800-7000-8000-000000000002",
      ["tenant-admin"],
    ),
  );
  const now = new Date("2026-01-01T00:00:00Z");
  assert.equal(
    validateSupportGrant(
      {
        tenantId,
        actions: ["resource:read"],
        expiresAt: new Date("2026-01-01T04:00:00Z"),
      },
      tenantId,
      "resource:read",
      now,
    ),
    true,
  );
  assert.equal(
    validateSupportGrant(undefined, tenantId, "resource:read", now),
    false,
  );
  assert.equal(
    validateSupportGrant(
      {
        tenantId,
        actions: ["secret:read"],
        expiresAt: new Date("2026-01-01T01:00:00Z"),
      },
      tenantId,
      "secret:read",
      now,
    ),
    false,
  );
});

test("AC-007/016/023 deterministic workflow and test primitives are bounded", async () => {
  assert.equal(taskQueue("test", "foundation"), "siro-test-foundation-v1");
  assert.throws(() =>
    assertRetryDoesNotBroaden({
      ...baselineActivityRetry,
      maximumAttempts: 4,
    }),
  );
  assert.deepEqual(await foundationSmokeActivity(), { ok: true });
  assert.equal(
    new FixedClock().now().toISOString(),
    "2026-01-01T00:00:00.000Z",
  );
  assert.match(deterministicUuidV7(), /^[0-9a-f-]{36}$/);
  assert.equal(isolatedResource("run1", "worker1"), "test-run1-worker1");
});

test("AC-013/014 telemetry redacts recursively and errors disclose only safe fields", () => {
  const value = redact({
    correlationId: "safe-id",
    password: "marker",
    nested: { signedUrl: "marker", answer: "marker" },
  });
  assert.deepEqual(value, {
    correlationId: "safe-id",
    password: "[REDACTED]",
    nested: { signedUrl: "[REDACTED]", answer: "[REDACTED]" },
  });
  assert.deepEqual(safeError("DEPENDENCY_UNAVAILABLE", "safe-id"), {
    code: "DEPENDENCY_UNAVAILABLE",
    correlationId: "safe-id",
  });
});
