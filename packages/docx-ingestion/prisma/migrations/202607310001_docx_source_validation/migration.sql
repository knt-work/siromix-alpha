CREATE TYPE "DocxValidationStatus" AS ENUM ('VALID', 'BLOCKED');

CREATE TABLE "DocxSourceValidationResult" (
    "sourceDocumentVersionId" TEXT NOT NULL,
    "tenantId" UUID NOT NULL,
    "workflowId" TEXT NOT NULL,
    "correlationId" UUID NOT NULL,
    "privateObjectReference" TEXT NOT NULL,
    "originalFilename" TEXT NOT NULL,
    "declaredMimeType" TEXT NOT NULL,
    "status" "DocxValidationStatus" NOT NULL,
    "issueCode" TEXT,
    "reasonCode" TEXT,
    "detectedMimeType" TEXT,
    "byteSize" INTEGER NOT NULL,
    "contentHash" TEXT NOT NULL,
    "malwareVerdict" TEXT,
    "malwareReference" TEXT,
    "validatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "DocxSourceValidationResult_pkey" PRIMARY KEY ("sourceDocumentVersionId"),
    CONSTRAINT "DocxSourceValidationResult_byteSize_check" CHECK ("byteSize" >= 0)
);

CREATE INDEX "DocxSourceValidationResult_tenantId_workflowId_idx"
ON "DocxSourceValidationResult"("tenantId", "workflowId");
