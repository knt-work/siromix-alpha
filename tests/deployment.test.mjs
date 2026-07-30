import assert from "node:assert/strict";
import test from "node:test";
import {
  DeploymentError,
  forwardCorrect,
  rollbackApplication,
  rollout,
  verifyCompatibility,
} from "../scripts/deployment-contract.mjs";

const digest = (character) => `sha256:${character.repeat(64)}`;
const manifest = {
  source: { commit: "commit-a" },
  compatibility: {
    migration: "2",
    contracts: "1.0",
    taskQueues: {
      typescript: "foundation.typescript.v1",
      python: "foundation.python.v1",
    },
  },
  bundles: [{ name: "migrations", digest: { sha256: "a".repeat(64) } }],
  images: ["web", "api", "document-ai-worker"].map((name, index) => {
    const value = digest(String(index + 1));
    return { name, digest: value, reference: `registry/${name}@${value}` };
  }),
};
const runtime = {
  commit: "commit-a",
  configVersion: "7",
  requiredConfigVersion: "7",
  migrationCompatibility: "2",
  contractVersion: "1.0",
  taskQueues: {
    typescript: "foundation.typescript.v1",
    python: "foundation.python.v1",
  },
};

test("AC-018 accepts immutable artifacts from one commit under external config", () => {
  assert.deepEqual(verifyCompatibility(manifest, runtime), {
    compatible: true,
  });
});

for (const [field, value, code] of [
  ["commit", "other", "ARTIFACT_COMMIT_MISMATCH"],
  ["configVersion", "old", "CONFIG_VERSION_MISMATCH"],
  ["migrationCompatibility", "1", "SCHEMA_VERSION_MISMATCH"],
  ["contractVersion", "2.0", "CONTRACT_VERSION_MISMATCH"],
]) {
  test(`AC-019 rejects incompatible ${field}`, () => {
    assert.throws(
      () => verifyCompatibility(manifest, { ...runtime, [field]: value }),
      (error) => error instanceof DeploymentError && error.code === code,
    );
  });
}

test("AC-019 rejects task queue and mutable image references", () => {
  assert.throws(
    () =>
      verifyCompatibility(manifest, {
        ...runtime,
        taskQueues: { ...runtime.taskQueues, python: "wrong" },
      }),
    { code: "TASK_QUEUE_MISMATCH" },
  );
  assert.throws(
    () =>
      verifyCompatibility(
        {
          ...manifest,
          images: [{ ...manifest.images[0], digest: "latest" }],
        },
        runtime,
      ),
    { code: "IMAGE_NOT_CONTENT_ADDRESSED" },
  );
});

function adapter({ failHealth } = {}) {
  const calls = [];
  return {
    calls,
    applyExpandMigration: async () => calls.push("expand"),
    deploy: async (name, reference) =>
      calls.push(`deploy:${name}:${reference}`),
    verifyHealth: async (name) => {
      calls.push(`health:${name}`);
      if (name === failHealth) throw new Error("unhealthy");
    },
    enableTraffic: async () => calls.push("traffic"),
    deferCleanupMigrations: async () => calls.push("defer-cleanup"),
    applyForwardCorrection: async () => calls.push("forward-correction"),
  };
}

test("AC-019 rollout is expand-first, health-gated, and defers cleanup", async () => {
  const target = adapter();
  const result = await rollout(manifest, runtime, target);
  assert.equal(result.status, "healthy");
  assert.deepEqual(
    target.calls.map(
      (call) =>
        call.split(":")[0] +
        (call.includes(":") ? `:${call.split(":")[1]}` : ""),
    ),
    [
      "expand",
      "deploy:api",
      "health:api",
      "deploy:document-ai-worker",
      "health:document-ai-worker",
      "deploy:web",
      "health:web",
      "traffic",
      "defer-cleanup",
    ],
  );
});

test("AC-019 partial rollout never enables traffic after failed health", async () => {
  const target = adapter({ failHealth: "document-ai-worker" });
  await assert.rejects(() => rollout(manifest, runtime, target), {
    code: "ROLLOUT_HEALTH_FAILED",
  });
  assert.ok(!target.calls.includes("traffic"));
});

test("AC-019 application rollback preserves the database and uses old digests", async () => {
  const target = adapter();
  const result = await rollbackApplication(manifest, target);
  assert.equal(result.databaseAction, "preserved-no-down-migration");
  assert.ok(target.calls.every((call) => !call.includes("migration")));
});

test("AC-019 forward correction applies a new migration then rolls forward", async () => {
  const target = adapter();
  await forwardCorrect(manifest, runtime, target);
  assert.deepEqual(target.calls.slice(0, 2), ["forward-correction", "expand"]);
});
