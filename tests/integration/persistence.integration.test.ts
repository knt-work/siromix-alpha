import { PrismaClient } from "@prisma/client";
import assert from "node:assert/strict";
import test from "node:test";
import {
  acknowledgeOutbox,
  acquireIdempotency,
  appendAudit,
  claimOutbox,
  completeIdempotency,
  enqueueOutbox,
  updateTenantOptimistically,
  withTenantTransaction,
} from "../../packages/database/src/index.ts";

const integrationEnabled = process.env.SIROMIX_INTEGRATION === "1";
const databaseUrl =
  "postgresql://siromix_app:local-only-password@127.0.0.1:5432/siromix?schema=public";

function uuidV7(sequence: number): string {
  const time = Date.now().toString(16).padStart(12, "0").slice(-12);
  return `${time.slice(0, 8)}-${time.slice(8)}-7000-8000-${sequence
    .toString(16)
    .padStart(12, "0")}`;
}

test(
  "AC-006 tenant transactions, concurrency, idempotency, outbox, audit, and failure injection",
  { skip: !integrationEnabled },
  async () => {
    process.env.DATABASE_URL = databaseUrl;
    const prisma = new PrismaClient();
    const tenantId = uuidV7(1);
    const otherTenantId = uuidV7(2);
    const now = new Date();
    let sequence = 10;
    const nextId = () => uuidV7(sequence++);
    try {
      await prisma.tenant.createMany({
        data: [
          { id: tenantId, slug: `tenant-${tenantId}`, displayName: "Tenant A" },
          {
            id: otherTenantId,
            slug: `tenant-${otherTenantId}`,
            displayName: "Tenant B",
          },
        ],
      });

      await assert.rejects(
        () =>
          withTenantTransaction(prisma, tenantId, (context) =>
            updateTenantOptimistically(context, {
              id: otherTenantId,
              expectedVersion: 1,
              displayName: "Forbidden",
            }),
          ),
        /ACCESS_DENIED/,
      );

      const concurrentUpdates = await Promise.allSettled([
        withTenantTransaction(prisma, tenantId, (context) =>
          updateTenantOptimistically(context, {
            id: tenantId,
            expectedVersion: 1,
            displayName: "First",
          }),
        ),
        withTenantTransaction(prisma, tenantId, (context) =>
          updateTenantOptimistically(context, {
            id: tenantId,
            expectedVersion: 1,
            displayName: "Second",
          }),
        ),
      ]);
      assert.equal(
        concurrentUpdates.filter((result) => result.status === "fulfilled")
          .length,
        1,
      );
      assert.equal(
        concurrentUpdates.filter((result) => result.status === "rejected")
          .length,
        1,
      );

      const idempotencyId = nextId();
      const first = await withTenantTransaction(prisma, tenantId, (context) =>
        acquireIdempotency(context, {
          id: idempotencyId,
          operation: "foundation.test",
          key: "request-1",
          requestHash: "hash-1",
          expiresAt: new Date(now.getTime() + 60_000),
          now,
        }),
      );
      assert.equal(first.state, "acquired");
      await withTenantTransaction(prisma, tenantId, async (context) => {
        await completeIdempotency(context, {
          id: idempotencyId,
          requestHash: "hash-1",
          responseRef: "safe-response-ref",
        });
      });
      const replay = await withTenantTransaction(prisma, tenantId, (context) =>
        acquireIdempotency(context, {
          id: nextId(),
          operation: "foundation.test",
          key: "request-1",
          requestHash: "hash-1",
          expiresAt: new Date(now.getTime() + 60_000),
          now,
        }),
      );
      assert.deepEqual(replay, {
        state: "replay",
        id: idempotencyId,
        responseRef: "safe-response-ref",
      });
      await assert.rejects(
        () =>
          withTenantTransaction(prisma, tenantId, (context) =>
            acquireIdempotency(context, {
              id: nextId(),
              operation: "foundation.test",
              key: "request-1",
              requestHash: "different-hash",
              expiresAt: new Date(now.getTime() + 60_000),
              now,
            }),
          ),
        /IDEMPOTENCY_HASH_MISMATCH/,
      );

      const expiredId = nextId();
      await withTenantTransaction(prisma, tenantId, (context) =>
        acquireIdempotency(context, {
          id: expiredId,
          operation: "foundation.expiry",
          key: "expired-key",
          requestHash: "expired-hash",
          expiresAt: new Date(now.getTime() - 1_000),
          now: new Date(now.getTime() - 2_000),
        }),
      );
      const replacementId = nextId();
      const replacement = await withTenantTransaction(
        prisma,
        tenantId,
        (context) =>
          acquireIdempotency(context, {
            id: replacementId,
            operation: "foundation.expiry",
            key: "expired-key",
            requestHash: "replacement-hash",
            expiresAt: new Date(now.getTime() + 60_000),
            now,
          }),
      );
      assert.deepEqual(replacement, {
        state: "acquired",
        id: replacementId,
      });
      assert.equal(
        await prisma.idempotencyRecord.count({ where: { id: expiredId } }),
        0,
      );

      const competing = await Promise.allSettled(
        [nextId(), nextId()].map((id) =>
          withTenantTransaction(prisma, tenantId, (context) =>
            acquireIdempotency(context, {
              id,
              operation: "foundation.concurrent",
              key: "same-key",
              requestHash: "same-hash",
              expiresAt: new Date(now.getTime() + 60_000),
              now,
            }),
          ),
        ),
      );
      assert.equal(
        competing.filter(
          (result) =>
            result.status === "fulfilled" && result.value.state === "acquired",
        ).length,
        1,
      );

      const rolledBackOutboxId = nextId();
      const rolledBackAuditId = nextId();
      await assert.rejects(
        () =>
          withTenantTransaction(
            prisma,
            tenantId,
            async (context) => {
              await enqueueOutbox(context, {
                id: rolledBackOutboxId,
                owner: "foundation",
                eventType: "foundation.test",
                schemaVersion: "1.0",
                correlationId: nextId(),
                causationId: nextId(),
                availableAt: now,
              });
              await appendAudit(context, {
                id: rolledBackAuditId,
                actorId: "test-service",
                eventType: "foundation.test",
                targetRefs: { type: "foundation" },
                safeMetadata: { result: "synthetic" },
                correlationId: nextId(),
                causationId: nextId(),
                occurredAt: now,
              });
            },
            (stage) => {
              if (stage === "after-write-before-commit")
                throw new Error("INJECTED_TRANSACTION_FAILURE");
            },
          ),
        /INJECTED_TRANSACTION_FAILURE/,
      );
      assert.equal(
        await prisma.outboxEnvelope.count({
          where: { id: rolledBackOutboxId },
        }),
        0,
      );
      assert.equal(
        await prisma.auditEnvelope.count({ where: { id: rolledBackAuditId } }),
        0,
      );

      const committedDespiteAckFailureId = nextId();
      await assert.rejects(
        () =>
          withTenantTransaction(
            prisma,
            tenantId,
            (context) =>
              enqueueOutbox(context, {
                id: committedDespiteAckFailureId,
                owner: "foundation",
                eventType: "foundation.test",
                schemaVersion: "1.0",
                correlationId: nextId(),
                causationId: nextId(),
                availableAt: now,
              }),
            (stage) => {
              if (stage === "after-commit-before-ack")
                throw new Error("INJECTED_ACK_FAILURE");
            },
          ),
        /INJECTED_ACK_FAILURE/,
      );
      assert.equal(
        await prisma.outboxEnvelope.count({
          where: { id: committedDespiteAckFailureId },
        }),
        1,
      );

      const outboxIds = [nextId(), nextId()];
      const auditId = nextId();
      await withTenantTransaction(prisma, tenantId, async (context) => {
        for (const id of outboxIds)
          await enqueueOutbox(context, {
            id,
            owner: "foundation",
            eventType: "foundation.test",
            schemaVersion: "1.0",
            correlationId: nextId(),
            causationId: nextId(),
            availableAt: now,
          });
        await appendAudit(context, {
          id: auditId,
          actorId: "test-service",
          eventType: "foundation.test",
          targetRefs: { tenantId },
          safeMetadata: { safe: true },
          correlationId: nextId(),
          causationId: nextId(),
          occurredAt: now,
        });
      });
      const claims = await Promise.all([
        claimOutbox(prisma, 1, new Date()),
        claimOutbox(prisma, 1, new Date()),
      ]);
      const claimedIds = claims.flat().map((item) => item.id);
      assert.equal(new Set(claimedIds).size, 2);
      await acknowledgeOutbox(prisma, claimedIds[0]!);
      await assert.rejects(
        () => acknowledgeOutbox(prisma, claimedIds[0]!),
        /OUTBOX_ACKNOWLEDGEMENT_REJECTED/,
      );
      await assert.rejects(
        () =>
          prisma.auditEnvelope.update({
            where: { id: auditId },
            data: { eventType: "mutated" },
          }),
        /AUDIT_APPEND_ONLY/,
      );
      const audit = await prisma.auditEnvelope.findUniqueOrThrow({
        where: { id: auditId },
      });
      assert.deepEqual(audit.safeMetadata, { safe: true });
    } finally {
      await prisma.$transaction(async (client) => {
        await client.$executeRawUnsafe(
          "SET LOCAL siromix.test_reset = 'enabled'",
        );
        await client.auditEnvelope.deleteMany({ where: { tenantId } });
        await client.outboxEnvelope.deleteMany({ where: { tenantId } });
        await client.idempotencyRecord.deleteMany({ where: { tenantId } });
        await client.tenant.deleteMany({
          where: { id: { in: [tenantId, otherTenantId] } },
        });
      });
      await prisma.$disconnect();
    }
  },
);
