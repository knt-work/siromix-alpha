import {
  DocxValidationStatus,
  Prisma,
  PrismaClient,
} from "../generated/client/index.js";
export type FailureStage =
  | "before-write"
  | "after-write-before-commit"
  | "after-commit-before-ack";
export type FailureInjector = (stage: FailureStage) => void | Promise<void>;

export type SourceValidationRecord = Readonly<{
  sourceDocumentVersionId: string;
  tenantId: string;
  workflowId: string;
  correlationId: string;
  privateObjectReference: string;
  originalFilename: string;
  declaredMimeType: string;
  status: "VALID" | "BLOCKED";
  issueCode: string | null;
  reasonCode: string | null;
  detectedMimeType: string | null;
  byteSize: number;
  contentHash: string;
  malwareVerdict: string | null;
  malwareReference: string | null;
  validatedAt: Date;
}>;

export { PrismaClient };

export async function saveSourceValidationResult(
  prisma: PrismaClient,
  input: SourceValidationRecord,
  inject?: FailureInjector,
) {
  if (!input.tenantId) throw new Error("TENANT_REQUIRED");
  await inject?.("before-write");
  const result = await prisma.$transaction(
    async (client) => {
      const value = await client.docxSourceValidationResult.create({
        data: {
          ...input,
          status: DocxValidationStatus[input.status],
        },
      });
      await inject?.("after-write-before-commit");
      return value;
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
  await inject?.("after-commit-before-ack");
  return result;
}

export async function loadSourceValidationResult(
  prisma: PrismaClient,
  tenantId: string,
  sourceDocumentVersionId: string,
) {
  if (!tenantId) throw new Error("TENANT_REQUIRED");
  return prisma.docxSourceValidationResult.findFirst({
    where: { sourceDocumentVersionId, tenantId },
  });
}
