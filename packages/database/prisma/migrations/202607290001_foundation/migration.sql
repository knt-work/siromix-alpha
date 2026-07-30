CREATE EXTENSION IF NOT EXISTS vector;
CREATE SCHEMA IF NOT EXISTS "public";

CREATE TYPE "public"."RecordStatus" AS ENUM ('ACTIVE', 'DISABLED', 'REVOKED');
CREATE TYPE "public"."IdempotencyStatus" AS ENUM ('IN_PROGRESS', 'COMPLETED', 'FAILED');
CREATE TYPE "public"."OutboxStatus" AS ENUM ('PENDING', 'CLAIMED', 'PUBLISHED');

CREATE TABLE "public"."Tenant" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "Tenant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."UserIdentity" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "normalizedEmail" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UserIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."TenantMembership" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "roles" TEXT[],
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    CONSTRAINT "TenantMembership_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."RefreshSession" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "familyHash" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "absoluteExpiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    "rotatedAt" TIMESTAMPTZ,
    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."ServiceIdentity" (
    "id" UUID NOT NULL,
    "environment" TEXT NOT NULL,
    "audience" TEXT NOT NULL,
    "scopes" TEXT[],
    "credentialVersion" INTEGER NOT NULL,
    "status" "public"."RecordStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "ServiceIdentity_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."SupportGrant" (
    "id" UUID NOT NULL,
    "tenantId" UUID NOT NULL,
    "supportActorId" UUID NOT NULL,
    "approverId" UUID NOT NULL,
    "resources" TEXT[],
    "actions" TEXT[],
    "reason" TEXT NOT NULL,
    "startsAt" TIMESTAMPTZ NOT NULL,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "revokedAt" TIMESTAMPTZ,
    CONSTRAINT "SupportGrant_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."IdempotencyRecord" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "operation" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "requestHash" TEXT NOT NULL,
    "status" "public"."IdempotencyStatus" NOT NULL,
    "responseRef" TEXT,
    "expiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "IdempotencyRecord_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."OutboxEnvelope" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "owner" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "payloadRef" TEXT,
    "correlationId" UUID NOT NULL,
    "causationId" UUID NOT NULL,
    "status" "public"."OutboxStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "availableAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "OutboxEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."AuditEnvelope" (
    "id" UUID NOT NULL,
    "tenantId" UUID,
    "actorId" TEXT NOT NULL,
    "eventType" TEXT NOT NULL,
    "targetRefs" JSONB NOT NULL,
    "safeMetadata" JSONB NOT NULL,
    "correlationId" UUID NOT NULL,
    "causationId" UUID NOT NULL,
    "occurredAt" TIMESTAMPTZ NOT NULL,
    CONSTRAINT "AuditEnvelope_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "public"."MigrationMetadata" (
    "id" TEXT NOT NULL,
    "checksum" TEXT NOT NULL,
    "commitSha" TEXT NOT NULL,
    "compatibilityVersion" TEXT NOT NULL,
    "appliedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MigrationMetadata_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Tenant_slug_key" ON "public"."Tenant"("slug");
CREATE INDEX "UserIdentity_tenantId_idx" ON "public"."UserIdentity"("tenantId");
CREATE UNIQUE INDEX "UserIdentity_tenantId_normalizedEmail_key" ON "public"."UserIdentity"("tenantId", "normalizedEmail");
CREATE INDEX "TenantMembership_tenantId_idx" ON "public"."TenantMembership"("tenantId");
CREATE UNIQUE INDEX "TenantMembership_tenantId_userId_key" ON "public"."TenantMembership"("tenantId", "userId");
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "public"."RefreshSession"("tokenHash");
CREATE INDEX "RefreshSession_tenantId_userId_idx" ON "public"."RefreshSession"("tenantId", "userId");
CREATE UNIQUE INDEX "ServiceIdentity_environment_audience_id_key" ON "public"."ServiceIdentity"("environment", "audience", "id");
CREATE UNIQUE INDEX "IdempotencyRecord_tenantId_operation_key_key" ON "public"."IdempotencyRecord"("tenantId", "operation", "key");
CREATE INDEX "OutboxEnvelope_status_availableAt_idx" ON "public"."OutboxEnvelope"("status", "availableAt");
CREATE INDEX "AuditEnvelope_tenantId_occurredAt_idx" ON "public"."AuditEnvelope"("tenantId", "occurredAt");

ALTER TABLE "public"."UserIdentity" ADD CONSTRAINT "UserIdentity_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TenantMembership" ADD CONSTRAINT "TenantMembership_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "public"."Tenant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."TenantMembership" ADD CONSTRAINT "TenantMembership_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "public"."RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "public"."UserIdentity"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
