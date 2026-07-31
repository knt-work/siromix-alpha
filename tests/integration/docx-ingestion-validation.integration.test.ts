import assert from "node:assert/strict";
import test from "node:test";
import {
  loadSourceValidationResult,
  PrismaClient,
  saveSourceValidationResult,
  type SourceValidationRecord,
} from "../../packages/docx-ingestion/src/index.ts";

const integrationEnabled = process.env.SIROMIX_INTEGRATION === "1";
const databaseUrl =
  process.env.DATABASE_URL ??
  "postgresql://siromix_app:local-only-password@127.0.0.1:5432/siromix?schema=public";

const tenantId = "0198f447-9c8d-7000-8000-000000000401";
const otherTenantId = "0198f447-9c8d-7000-8000-000000000402";

function record(
  sourceDocumentVersionId: string,
  status: "VALID" | "BLOCKED",
): SourceValidationRecord {
  return {
    sourceDocumentVersionId,
    tenantId,
    workflowId: `workflow:${status.toLowerCase()}`,
    correlationId:
      status === "VALID"
        ? "0198f447-9c8d-7000-8000-000000000411"
        : "0198f447-9c8d-7000-8000-000000000412",
    privateObjectReference: `tenants/private/${status.toLowerCase()}.docx`,
    originalFilename: `${status.toLowerCase()}.docx`,
    declaredMimeType:
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    status,
    issueCode: status === "BLOCKED" ? "SOURCE_VALIDATION_FAILED" : null,
    reasonCode: status === "BLOCKED" ? "SOURCE_DETECTED_TYPE_INVALID" : null,
    detectedMimeType:
      status === "VALID"
        ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        : null,
    byteSize: status === "VALID" ? 4096 : 12,
    contentHash: status === "VALID" ? "a".repeat(64) : "b".repeat(64),
    malwareVerdict: "CLEAN",
    malwareReference: `scan:${status.toLowerCase()}`,
    validatedAt: new Date("2026-07-31T12:00:00.000Z"),
  };
}

test(
  "DI-004 PostgreSQL durably saves validation outcomes and rolls back failed writes",
  { skip: !integrationEnabled },
  async () => {
    process.env.DATABASE_URL = databaseUrl;
    const prisma = new PrismaClient();
    const valid = record("source:di004:valid", "VALID");
    const blocked = record("source:di004:blocked", "BLOCKED");
    const rolledBack = record("source:di004:rolled-back", "VALID");
    try {
      await saveSourceValidationResult(prisma, valid);
      await saveSourceValidationResult(prisma, blocked);

      const validReloaded = await loadSourceValidationResult(
        prisma,
        tenantId,
        valid.sourceDocumentVersionId,
      );
      const blockedReloaded = await loadSourceValidationResult(
        prisma,
        tenantId,
        blocked.sourceDocumentVersionId,
      );
      assert.deepEqual(validReloaded, valid);
      assert.deepEqual(blockedReloaded, blocked);
      assert.equal(
        await loadSourceValidationResult(
          prisma,
          otherTenantId,
          valid.sourceDocumentVersionId,
        ),
        null,
      );

      await assert.rejects(
        () =>
          saveSourceValidationResult(prisma, rolledBack, (stage) => {
            if (stage === "after-write-before-commit")
              throw new Error("INJECTED_VALIDATION_WRITE_FAILURE");
          }),
        /INJECTED_VALIDATION_WRITE_FAILURE/,
      );
      assert.equal(
        await loadSourceValidationResult(
          prisma,
          tenantId,
          rolledBack.sourceDocumentVersionId,
        ),
        null,
      );
    } finally {
      await prisma.docxSourceValidationResult.deleteMany({
        where: {
          sourceDocumentVersionId: {
            in: [
              valid.sourceDocumentVersionId,
              blocked.sourceDocumentVersionId,
              rolledBack.sourceDocumentVersionId,
            ],
          },
        },
      });
      await prisma.$disconnect();
    }
  },
);
