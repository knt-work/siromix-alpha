import { PrismaClient, RecordStatus } from "@prisma/client";
import argon2 from "argon2";
import assert from "node:assert/strict";
import test from "node:test";
import {
  authenticateServiceIdentity,
  authenticateTenantIdentity,
  authorizeSupportAccess,
  createRefreshSession,
  createSupportGrant,
  csrfMatches,
  deactivateTenantMember,
  hashPassword,
  provisionFirstTenant,
  provisionTenantMember,
  refreshCookie,
  refreshHash,
  revokeRefreshFamily,
  revokeServiceIdentity,
  revokeSupportGrant,
  rotateRefreshSession,
  rotateServiceIdentityCredential,
  securityHeaders,
  validateCookieMutation,
} from "../../packages/auth/src/index.ts";

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
  "AC-008/009/010/024 persistence-backed authentication and authorization",
  { skip: !integrationEnabled },
  async () => {
    process.env.DATABASE_URL = databaseUrl;
    const prisma = new PrismaClient();
    let sequence = 20_000;
    const nextId = () => uuidV7(sequence++);
    const now = new Date();
    const pepper = "synthetic-test-pepper";
    const deploymentCredential = "synthetic-deployment-credential";
    const deploymentId = nextId();
    const tenantId = nextId();
    const adminId = nextId();
    const adminMembershipId = nextId();
    const otherTenantId = nextId();
    const createdTenantIds = [tenantId, otherTenantId];
    try {
      await prisma.serviceIdentity.create({
        data: {
          id: deploymentId,
          environment: "production",
          audience: "provisioning",
          issuer: "siromix-deployment",
          scopes: ["tenant:bootstrap"],
          credentialHash: refreshHash(deploymentCredential, pepper),
          credentialVersion: 1,
          expiresAt: new Date(now.getTime() + 60_000),
        },
      });
      const service = await authenticateServiceIdentity(prisma, {
        id: deploymentId,
        credential: deploymentCredential,
        pepper,
        environment: "production",
        issuer: "siromix-deployment",
        audience: "provisioning",
        requiredScopes: ["tenant:bootstrap"],
        now,
      });
      assert.equal(service.id, deploymentId);
      await assert.rejects(
        () =>
          authenticateServiceIdentity(prisma, {
            id: deploymentId,
            credential: deploymentCredential,
            pepper,
            environment: "production",
            issuer: "siromix-deployment",
            audience: "worker",
            requiredScopes: ["tenant:bootstrap"],
            now,
          }),
        /SERVICE_IDENTITY_REJECTED/,
      );

      const provisioning = {
        environment: "production",
        deploymentIdentityId: deploymentId,
        deploymentCredential,
        credentialPepper: pepper,
        tenant: {
          id: tenantId,
          slug: `tenant-${tenantId}`,
          displayName: "Provisioned Tenant",
        },
        admin: {
          id: adminId,
          membershipId: adminMembershipId,
          email: "ADMIN@EXAMPLE.TEST",
          password: "production-synthetic-password-24",
        },
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      };
      await assert.rejects(
        () =>
          provisionFirstTenant(prisma, {
            ...provisioning,
            admin: { ...provisioning.admin, password: "admin" },
          }),
        /PRODUCTION_CREDENTIAL_REJECTED/,
      );
      await assert.rejects(
        () =>
          provisionFirstTenant(prisma, {
            ...provisioning,
            deterministicCredentials: true,
          }),
        /PRODUCTION_CREDENTIAL_REJECTED/,
      );
      const provisioned = await provisionFirstTenant(prisma, provisioning);
      assert.equal(provisioned.replayed, false);
      const replayed = await provisionFirstTenant(prisma, {
        ...provisioning,
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
      });
      assert.equal(replayed.replayed, true);
      assert.equal(
        await prisma.auditEnvelope.count({
          where: {
            tenantId,
            eventType: "foundation.tenant.provisioned",
          },
        }),
        1,
      );
      const rotatedDeploymentCredential = "rotated-deployment-credential";
      await rotateServiceIdentityCredential(prisma, {
        id: deploymentId,
        environment: "production",
        audience: "provisioning",
        expectedVersion: 1,
        credential: rotatedDeploymentCredential,
        pepper,
        expiresAt: new Date(now.getTime() + 120_000),
        actorId: deploymentId,
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      await assert.rejects(
        () =>
          authenticateServiceIdentity(prisma, {
            id: deploymentId,
            credential: deploymentCredential,
            pepper,
            environment: "production",
            issuer: "siromix-deployment",
            audience: "provisioning",
            requiredScopes: ["tenant:bootstrap"],
            now,
          }),
        /SERVICE_IDENTITY_REJECTED/,
      );
      assert.equal(
        (
          await authenticateServiceIdentity(prisma, {
            id: deploymentId,
            credential: rotatedDeploymentCredential,
            pepper,
            environment: "production",
            issuer: "siromix-deployment",
            audience: "provisioning",
            requiredScopes: ["tenant:bootstrap"],
            now,
          })
        ).credentialVersion,
        2,
      );

      const dummyHash = await hashPassword("dummy-password");
      const outdatedHash = await argon2.hash(provisioning.admin.password, {
        type: argon2.argon2id,
        memoryCost: 8_192,
        timeCost: 1,
        parallelism: 1,
      });
      await prisma.userIdentity.update({
        where: { id: adminId },
        data: { passwordHash: outdatedHash },
      });
      const login = await authenticateTenantIdentity(prisma, {
        tenantSlug: provisioning.tenant.slug,
        email: " admin@example.test ",
        password: provisioning.admin.password,
        dummyPasswordHash: dummyHash,
        now,
      });
      assert.deepEqual(login.roles, ["tenant-admin"]);
      assert.equal(login.passwordUpgraded, true);
      assert.notEqual(
        (
          await prisma.userIdentity.findUniqueOrThrow({
            where: { id: adminId },
          })
        ).passwordHash,
        outdatedHash,
      );
      await assert.rejects(
        () =>
          authenticateTenantIdentity(prisma, {
            tenantSlug: "missing-tenant",
            email: "admin@example.test",
            password: "wrong-password",
            dummyPasswordHash: dummyHash,
            now,
          }),
        /AUTHENTICATION_FAILED/,
      );

      const teacherId = nextId();
      await provisionTenantMember(prisma, {
        actorId: adminId,
        tenantId,
        identityId: teacherId,
        membershipId: nextId(),
        email: "same@example.test",
        password: "teacher-password-24",
        roles: ["teacher"],
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      await prisma.tenant.create({
        data: {
          id: otherTenantId,
          slug: `tenant-${otherTenantId}`,
          displayName: "Other Tenant",
        },
      });
      await prisma.userIdentity.create({
        data: {
          id: nextId(),
          tenantId: otherTenantId,
          normalizedEmail: "same@example.test",
          passwordHash: dummyHash,
        },
      });
      assert.equal(
        await prisma.userIdentity.count({
          where: { normalizedEmail: "same@example.test" },
        }),
        2,
      );
      await assert.rejects(
        () =>
          provisionTenantMember(prisma, {
            actorId: adminId,
            tenantId: otherTenantId,
            identityId: nextId(),
            membershipId: nextId(),
            email: "cross-tenant@example.test",
            password: "teacher-password-24",
            roles: ["teacher"],
            audit: {
              id: nextId(),
              correlationId: nextId(),
              causationId: nextId(),
            },
            now,
          }),
        /ACCESS_DENIED/,
      );

      const firstFamily = await createRefreshSession(prisma, {
        id: nextId(),
        tenantId,
        userId: teacherId,
        familySecret: "family-one",
        pepper,
        now,
        clientContext: { device: "synthetic" },
      });
      const replacementId = nextId();
      const rotation = await rotateRefreshSession(prisma, {
        currentToken: firstFamily.token,
        replacementId,
        pepper,
        now: new Date(now.getTime() + 1_000),
      });
      assert.equal(rotation.state, "rotated");
      const reuse = await rotateRefreshSession(prisma, {
        currentToken: firstFamily.token,
        replacementId: nextId(),
        pepper,
        now: new Date(now.getTime() + 2_000),
      });
      assert.equal(reuse.state, "reused");
      assert.ok(
        (
          await prisma.refreshSession.findUniqueOrThrow({
            where: { id: replacementId },
          })
        ).revokedAt,
      );

      const concurrentFamily = await createRefreshSession(prisma, {
        id: nextId(),
        tenantId,
        userId: teacherId,
        familySecret: "family-concurrent",
        pepper,
        now,
      });
      const concurrent = await Promise.all([
        rotateRefreshSession(prisma, {
          currentToken: concurrentFamily.token,
          replacementId: nextId(),
          pepper,
          now: new Date(now.getTime() + 1_000),
        }),
        rotateRefreshSession(prisma, {
          currentToken: concurrentFamily.token,
          replacementId: nextId(),
          pepper,
          now: new Date(now.getTime() + 1_001),
        }),
      ]);
      assert.deepEqual(concurrent.map((result) => result.state).sort(), [
        "reused",
        "rotated",
      ]);

      const expiredFamily = await createRefreshSession(prisma, {
        id: nextId(),
        tenantId,
        userId: teacherId,
        familySecret: "family-expired",
        pepper,
        now,
      });
      await prisma.refreshSession.update({
        where: { tokenHash: refreshHash(expiredFamily.token, pepper) },
        data: { expiresAt: new Date(now.getTime() - 1) },
      });
      assert.equal(
        (
          await rotateRefreshSession(prisma, {
            currentToken: expiredFamily.token,
            replacementId: nextId(),
            pepper,
            now,
          })
        ).state,
        "expired",
      );

      const logoutFamily = await createRefreshSession(prisma, {
        id: nextId(),
        tenantId,
        userId: teacherId,
        familySecret: "family-logout",
        pepper,
        now,
      });
      await revokeRefreshFamily(prisma, logoutFamily.token, pepper, now);
      assert.equal(
        (
          await rotateRefreshSession(prisma, {
            currentToken: logoutFamily.token,
            replacementId: nextId(),
            pepper,
            now,
          })
        ).state,
        "revoked",
      );

      const supportActorId = nextId();
      const grantId = nextId();
      await assert.rejects(
        () =>
          createSupportGrant(prisma, {
            id: nextId(),
            tenantId,
            supportActorId,
            approverId: adminId,
            resources: ["foundation-resource"],
            actions: ["resource:read"],
            reason: "Overlong synthetic grant",
            startsAt: now,
            expiresAt: new Date(now.getTime() + 4 * 3_600_000 + 1),
            audit: {
              id: nextId(),
              correlationId: nextId(),
              causationId: nextId(),
            },
            now,
          }),
        /SUPPORT_GRANT_REJECTED/,
      );
      await createSupportGrant(prisma, {
        id: grantId,
        tenantId,
        supportActorId,
        approverId: adminId,
        resources: ["foundation-resource"],
        actions: ["resource:read"],
        reason: "Synthetic support verification",
        startsAt: now,
        expiresAt: new Date(now.getTime() + 4 * 3_600_000),
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      await authorizeSupportAccess(prisma, {
        tenantId,
        supportActorId,
        resource: "foundation-resource",
        action: "resource:read",
        now,
      });
      await assert.rejects(
        () =>
          authorizeSupportAccess(prisma, {
            tenantId: otherTenantId,
            supportActorId,
            resource: "foundation-resource",
            action: "resource:read",
            now,
          }),
        /ACCESS_DENIED/,
      );
      await assert.rejects(
        () =>
          authorizeSupportAccess(prisma, {
            tenantId,
            supportActorId,
            resource: "foundation-resource",
            action: "secret:read",
            now,
          }),
        /ACCESS_DENIED/,
      );
      await revokeSupportGrant(prisma, {
        id: grantId,
        tenantId,
        actorId: adminId,
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      await assert.rejects(
        () =>
          authorizeSupportAccess(prisma, {
            tenantId,
            supportActorId,
            resource: "foundation-resource",
            action: "resource:read",
            now,
          }),
        /ACCESS_DENIED/,
      );

      await deactivateTenantMember(prisma, {
        actorId: adminId,
        tenantId,
        userId: teacherId,
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      assert.equal(
        (
          await prisma.userIdentity.findUniqueOrThrow({
            where: { id: teacherId },
          })
        ).status,
        RecordStatus.DISABLED,
      );

      assert.equal(csrfMatches("a".repeat(32), "a".repeat(32)), true);
      validateCookieMutation({
        csrfCookie: "a".repeat(32),
        csrfHeader: "a".repeat(32),
        origin: "https://app.example.test",
        allowedOrigins: ["https://app.example.test"],
      });
      assert.throws(
        () =>
          validateCookieMutation({
            csrfCookie: "a".repeat(32),
            csrfHeader: "b".repeat(32),
            origin: "https://evil.example.test",
            allowedOrigins: ["https://app.example.test"],
          }),
        /CSRF_REJECTED/,
      );
      assert.deepEqual(refreshCookie(true), {
        httpOnly: true,
        secure: true,
        sameSite: "strict",
        path: "/auth/refresh",
        maxAge: 30 * 86_400_000,
      });
      assert.equal(securityHeaders["x-content-type-options"], "nosniff");
      assert.equal(securityHeaders["x-frame-options"], "DENY");
      await revokeServiceIdentity(prisma, {
        id: deploymentId,
        environment: "production",
        audience: "provisioning",
        actorId: deploymentId,
        audit: {
          id: nextId(),
          correlationId: nextId(),
          causationId: nextId(),
        },
        now,
      });
      await assert.rejects(
        () =>
          authenticateServiceIdentity(prisma, {
            id: deploymentId,
            credential: rotatedDeploymentCredential,
            pepper,
            environment: "production",
            issuer: "siromix-deployment",
            audience: "provisioning",
            requiredScopes: ["tenant:bootstrap"],
            now,
          }),
        /SERVICE_IDENTITY_REJECTED/,
      );
    } finally {
      await prisma.$transaction(async (client) => {
        await client.$executeRawUnsafe(
          "SET LOCAL siromix.test_reset = 'enabled'",
        );
        await client.auditEnvelope.deleteMany({
          where: {
            OR: [
              { tenantId: { in: createdTenantIds } },
              { actorId: deploymentId },
            ],
          },
        });
        await client.supportGrant.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await client.refreshSession.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await client.tenantMembership.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await client.userIdentity.deleteMany({
          where: { tenantId: { in: createdTenantIds } },
        });
        await client.tenant.deleteMany({
          where: { id: { in: createdTenantIds } },
        });
        await client.serviceIdentity.deleteMany({
          where: { id: deploymentId },
        });
      });
      await prisma.$disconnect();
    }
  },
);
