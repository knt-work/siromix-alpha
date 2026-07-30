import {
  IdempotencyStatus,
  OutboxStatus,
  Prisma,
  type PrismaClient,
} from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;
export type FailureStage =
  | "before-write"
  | "after-write-before-commit"
  | "after-commit-before-ack";
export type FailureInjector = (stage: FailureStage) => void | Promise<void>;
const noFailure: FailureInjector = () => undefined;

export type TenantTransaction = Readonly<{
  tenantId: string;
  client: TransactionClient;
  requireTenant: (candidateTenantId: string) => void;
}>;

export async function withTenantTransaction<T>(
  prisma: PrismaClient,
  tenantId: string,
  work: (context: TenantTransaction) => Promise<T>,
  inject: FailureInjector = noFailure,
): Promise<T> {
  if (!tenantId) throw new Error("TENANT_REQUIRED");
  await inject("before-write");
  const result = await prisma.$transaction(
    async (client) => {
      const context: TenantTransaction = {
        tenantId,
        client,
        requireTenant(candidateTenantId) {
          if (candidateTenantId !== tenantId) throw new Error("ACCESS_DENIED");
        },
      };
      const value = await work(context);
      await inject("after-write-before-commit");
      return value;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await inject("after-commit-before-ack");
  return result;
}

export async function updateTenantOptimistically(
  context: TenantTransaction,
  input: { id: string; expectedVersion: number; displayName: string },
) {
  context.requireTenant(input.id);
  const result = await context.client.tenant.updateMany({
    where: {
      id: context.tenantId,
      version: input.expectedVersion,
    },
    data: {
      displayName: input.displayName,
      version: { increment: 1 },
    },
  });
  if (result.count !== 1) throw new Error("OPTIMISTIC_CONCURRENCY_CONFLICT");
  return context.client.tenant.findUniqueOrThrow({
    where: { id: context.tenantId },
  });
}

export type IdempotencyAcquisition =
  | Readonly<{ state: "acquired"; id: string }>
  | Readonly<{ state: "in-progress"; id: string }>
  | Readonly<{ state: "replay"; id: string; responseRef: string | null }>;

export async function acquireIdempotency(
  context: TenantTransaction,
  input: {
    id: string;
    operation: string;
    key: string;
    requestHash: string;
    expiresAt: Date;
    now: Date;
  },
): Promise<IdempotencyAcquisition> {
  const unique = {
    tenantId_operation_key: {
      tenantId: context.tenantId,
      operation: input.operation,
      key: input.key,
    },
  };
  const existing = await context.client.idempotencyRecord.findUnique({
    where: unique,
  });
  if (existing && existing.expiresAt > input.now) {
    if (existing.requestHash !== input.requestHash)
      throw new Error("IDEMPOTENCY_HASH_MISMATCH");
    if (existing.status === IdempotencyStatus.COMPLETED)
      return {
        state: "replay",
        id: existing.id,
        responseRef: existing.responseRef,
      };
    return { state: "in-progress", id: existing.id };
  }
  if (existing)
    await context.client.idempotencyRecord.delete({
      where: { id: existing.id },
    });
  try {
    const created = await context.client.idempotencyRecord.create({
      data: {
        id: input.id,
        tenantId: context.tenantId,
        operation: input.operation,
        key: input.key,
        requestHash: input.requestHash,
        status: IdempotencyStatus.IN_PROGRESS,
        expiresAt: input.expiresAt,
      },
    });
    return { state: "acquired", id: created.id };
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    )
      throw new Error("IDEMPOTENCY_CONCURRENT_ACQUISITION");
    throw error;
  }
}

export async function completeIdempotency(
  context: TenantTransaction,
  input: { id: string; requestHash: string; responseRef: string },
) {
  const result = await context.client.idempotencyRecord.updateMany({
    where: {
      id: input.id,
      tenantId: context.tenantId,
      requestHash: input.requestHash,
      status: IdempotencyStatus.IN_PROGRESS,
    },
    data: {
      status: IdempotencyStatus.COMPLETED,
      responseRef: input.responseRef,
    },
  });
  if (result.count !== 1) throw new Error("IDEMPOTENCY_COMPLETION_REJECTED");
}

export async function enqueueOutbox(
  context: TenantTransaction,
  input: {
    id: string;
    owner: string;
    eventType: string;
    schemaVersion: string;
    payloadRef?: string;
    correlationId: string;
    causationId: string;
    availableAt: Date;
  },
) {
  return context.client.outboxEnvelope.create({
    data: {
      ...input,
      tenantId: context.tenantId,
      status: OutboxStatus.PENDING,
    },
  });
}

export async function claimOutbox(
  prisma: PrismaClient,
  limit: number,
  now: Date,
) {
  if (!Number.isInteger(limit) || limit < 1 || limit > 100)
    throw new Error("OUTBOX_CLAIM_LIMIT_INVALID");
  return prisma.$transaction(async (client) => {
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT "id"
      FROM "OutboxEnvelope"
      WHERE "status" = 'PENDING'::"OutboxStatus"
        AND "availableAt" <= ${now}
      ORDER BY "availableAt", "createdAt"
      FOR UPDATE SKIP LOCKED
      LIMIT ${limit}
    `;
    if (!rows.length) return [];
    const ids = rows.map((row) => row.id);
    await client.outboxEnvelope.updateMany({
      where: { id: { in: ids }, status: OutboxStatus.PENDING },
      data: { status: OutboxStatus.CLAIMED, attempts: { increment: 1 } },
    });
    return client.outboxEnvelope.findMany({ where: { id: { in: ids } } });
  });
}

export async function acknowledgeOutbox(
  prisma: PrismaClient,
  id: string,
): Promise<void> {
  const result = await prisma.outboxEnvelope.updateMany({
    where: { id, status: OutboxStatus.CLAIMED },
    data: { status: OutboxStatus.PUBLISHED },
  });
  if (result.count !== 1) throw new Error("OUTBOX_ACKNOWLEDGEMENT_REJECTED");
}

export async function appendAudit(
  context: TenantTransaction,
  input: {
    id: string;
    actorId: string;
    eventType: string;
    targetRefs: Prisma.InputJsonValue;
    safeMetadata: Prisma.InputJsonValue;
    correlationId: string;
    causationId: string;
    occurredAt: Date;
  },
) {
  return context.client.auditEnvelope.create({
    data: { ...input, tenantId: context.tenantId },
  });
}
