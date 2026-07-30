import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import {
  Prisma,
  RecordStatus,
  type PrismaClient,
  type ServiceIdentity,
} from "@prisma/client";
import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";

export const passwordPolicy = Object.freeze({
  memoryCost: 19_456,
  timeCost: 2,
  parallelism: 1,
  type: argon2.argon2id,
});
export const normalizeEmail = (email: string) =>
  email.trim().normalize("NFKC").toLowerCase();
export async function hashPassword(password: string): Promise<string> {
  return argon2.hash(password, passwordPolicy);
}
export async function verifyPassword(hash: string, password: string) {
  const valid = await argon2.verify(hash, password);
  return {
    valid,
    needsUpgrade: valid && argon2.needsRehash(hash, passwordPolicy),
  };
}
export async function issueAccessToken(
  claims: { sub: string; tenantId: string; role: string; scope: string[] },
  key: CryptoKey,
  kid: string,
  issuer: string,
  audience: string,
  now = Math.floor(Date.now() / 1000),
) {
  return new SignJWT({
    tenantId: claims.tenantId,
    role: claims.role,
    scope: claims.scope,
  })
    .setProtectedHeader({ alg: "EdDSA", kid })
    .setSubject(claims.sub)
    .setIssuer(issuer)
    .setAudience(audience)
    .setIssuedAt(now)
    .setExpirationTime(now + 900)
    .sign(key);
}
export async function verifyAccessToken(
  token: string,
  keys: ReadonlyMap<string, CryptoKey>,
  issuer: string,
  audience: string,
) {
  const header = JSON.parse(
    Buffer.from(token.split(".")[0] ?? "", "base64url").toString(),
  ) as { alg?: string; kid?: string };
  if (header.alg !== "EdDSA" || !header.kid || !keys.has(header.kid))
    throw new Error("AUTH_TOKEN_KEY_REJECTED");
  return jwtVerify(token, keys.get(header.kid)!, {
    algorithms: ["EdDSA"],
    issuer,
    audience,
    maxTokenAge: "15m",
  });
}
export function createRefreshCredential(pepper: string) {
  const token = randomBytes(32).toString("base64url");
  return { token, hash: refreshHash(token, pepper) };
}
export function refreshHash(token: string, pepper: string) {
  return createHmac("sha256", pepper).update(token).digest("hex");
}
export function refreshMatches(
  token: string,
  expected: string,
  pepper: string,
) {
  const actual = Buffer.from(refreshHash(token, pepper));
  const wanted = Buffer.from(expected);
  return actual.length === wanted.length && timingSafeEqual(actual, wanted);
}
export const refreshPolicy = Object.freeze({
  inactivityMs: 7 * 86_400_000,
  absoluteMs: 30 * 86_400_000,
});
export const csrfMatches = (cookie: string, header: string) =>
  cookie.length >= 32 &&
  cookie.length === header.length &&
  timingSafeEqual(Buffer.from(cookie), Buffer.from(header));
export type SharedRole = "teacher" | "tenant-admin" | "platform-support";
export function authorize(
  context: { tenantId: string; role: SharedRole },
  targetTenantId: string,
  allowed: readonly SharedRole[],
) {
  if (context.tenantId !== targetTenantId || !allowed.includes(context.role))
    throw new Error("ACCESS_DENIED");
}
export type SupportGrant = Readonly<{
  tenantId: string;
  actions: readonly string[];
  expiresAt: Date;
  revokedAt?: Date;
}>;
export function validateSupportGrant(
  grant: SupportGrant | undefined,
  tenantId: string,
  action: string,
  now: Date,
) {
  return Boolean(
    grant &&
      grant.tenantId === tenantId &&
      grant.actions.includes(action) &&
      grant.expiresAt > now &&
      grant.expiresAt.getTime() - now.getTime() <= 4 * 3_600_000 &&
      !grant.revokedAt &&
      action !== "secret:read",
  );
}

const authenticationFailure = () => new Error("AUTHENTICATION_FAILED");
const refreshFailure = () => new Error("REFRESH_CREDENTIAL_REJECTED");

export async function authenticateTenantIdentity(
  prisma: PrismaClient,
  input: {
    tenantSlug: string;
    email: string;
    password: string;
    dummyPasswordHash: string;
    now: Date;
  },
) {
  const tenant = await prisma.tenant.findUnique({
    where: { slug: input.tenantSlug },
  });
  const identity = tenant
    ? await prisma.userIdentity.findUnique({
        where: {
          tenantId_normalizedEmail: {
            tenantId: tenant.id,
            normalizedEmail: normalizeEmail(input.email),
          },
        },
        include: { memberships: { where: { tenantId: tenant.id } } },
      })
    : null;
  const verification = await verifyPassword(
    identity?.passwordHash ?? input.dummyPasswordHash,
    input.password,
  );
  if (
    !tenant ||
    !identity ||
    identity.status !== RecordStatus.ACTIVE ||
    !verification.valid ||
    !identity.memberships.some(
      (membership) => membership.status === RecordStatus.ACTIVE,
    )
  )
    throw authenticationFailure();
  const passwordHash = verification.needsUpgrade
    ? await hashPassword(input.password)
    : undefined;
  await prisma.userIdentity.update({
    where: { id: identity.id },
    data: {
      lastAuthenticatedAt: input.now,
      ...(passwordHash
        ? { passwordHash, passwordChangedAt: input.now }
        : undefined),
    },
  });
  return {
    tenantId: tenant.id,
    userId: identity.id,
    roles: identity.memberships.flatMap((membership) => membership.roles),
    passwordUpgraded: Boolean(passwordHash),
  };
}

export type RefreshResult =
  | Readonly<{ state: "rotated"; token: string; sessionId: string }>
  | Readonly<{ state: "reused" }>
  | Readonly<{ state: "expired" }>
  | Readonly<{ state: "revoked" }>;

export async function createRefreshSession(
  prisma: PrismaClient,
  input: {
    id: string;
    tenantId: string;
    userId: string;
    familySecret: string;
    pepper: string;
    now: Date;
    clientContext?: Prisma.InputJsonValue;
  },
) {
  const credential = createRefreshCredential(input.pepper);
  const absoluteExpiresAt = new Date(
    input.now.getTime() + refreshPolicy.absoluteMs,
  );
  await prisma.refreshSession.create({
    data: {
      id: input.id,
      tenantId: input.tenantId,
      userId: input.userId,
      familyHash: refreshHash(input.familySecret, input.pepper),
      tokenHash: credential.hash,
      expiresAt: new Date(input.now.getTime() + refreshPolicy.inactivityMs),
      absoluteExpiresAt,
      ...(input.clientContext
        ? { clientContext: input.clientContext }
        : undefined),
    },
  });
  return { token: credential.token, absoluteExpiresAt };
}

export async function rotateRefreshSession(
  prisma: PrismaClient,
  input: {
    currentToken: string;
    replacementId: string;
    pepper: string;
    now: Date;
    clientContext?: Prisma.InputJsonValue;
  },
): Promise<RefreshResult> {
  const tokenHash = refreshHash(input.currentToken, input.pepper);
  const result = await prisma.$transaction(async (client) => {
    const rows = await client.$queryRaw<Array<{ id: string }>>`
      SELECT "id" FROM "RefreshSession"
      WHERE "tokenHash" = ${tokenHash}
      FOR UPDATE
    `;
    if (!rows[0]) return { state: "revoked" } as const;
    const current = await client.refreshSession.findUniqueOrThrow({
      where: { id: rows[0].id },
    });
    if (current.rotatedAt || current.reusedAt) {
      await client.refreshSession.updateMany({
        where: { familyHash: current.familyHash },
        data: { revokedAt: input.now, reusedAt: input.now },
      });
      return { state: "reused" } as const;
    }
    if (current.revokedAt) return { state: "revoked" } as const;
    if (
      current.expiresAt <= input.now ||
      current.absoluteExpiresAt <= input.now
    ) {
      await client.refreshSession.updateMany({
        where: { familyHash: current.familyHash },
        data: { revokedAt: input.now },
      });
      return { state: "expired" } as const;
    }
    const credential = createRefreshCredential(input.pepper);
    await client.refreshSession.update({
      where: { id: current.id },
      data: { rotatedAt: input.now },
    });
    await client.refreshSession.create({
      data: {
        id: input.replacementId,
        tenantId: current.tenantId,
        userId: current.userId,
        familyHash: current.familyHash,
        tokenHash: credential.hash,
        expiresAt: new Date(
          Math.min(
            input.now.getTime() + refreshPolicy.inactivityMs,
            current.absoluteExpiresAt.getTime(),
          ),
        ),
        absoluteExpiresAt: current.absoluteExpiresAt,
        ...(input.clientContext
          ? { clientContext: input.clientContext }
          : undefined),
      },
    });
    return {
      state: "rotated",
      token: credential.token,
      sessionId: input.replacementId,
    } as const;
  });
  return result;
}

export async function revokeRefreshFamily(
  prisma: PrismaClient,
  token: string,
  pepper: string,
  now: Date,
) {
  const tokenHash = refreshHash(token, pepper);
  return prisma.$transaction(async (client) => {
    const session = await client.refreshSession.findUnique({
      where: { tokenHash },
    });
    if (!session) throw refreshFailure();
    await client.refreshSession.updateMany({
      where: { familyHash: session.familyHash, revokedAt: null },
      data: { revokedAt: now },
    });
  });
}

export function assertServiceIdentity(
  identity: ServiceIdentity | null,
  input: {
    environment: string;
    issuer: string;
    audience: string;
    requiredScopes: readonly string[];
    now: Date;
  },
): asserts identity is ServiceIdentity {
  if (
    !identity ||
    identity.environment !== input.environment ||
    identity.issuer !== input.issuer ||
    identity.audience !== input.audience ||
    identity.status !== RecordStatus.ACTIVE ||
    identity.revokedAt ||
    identity.expiresAt <= input.now ||
    input.requiredScopes.some((scope) => !identity.scopes.includes(scope))
  )
    throw new Error("SERVICE_IDENTITY_REJECTED");
}

export async function authenticateServiceIdentity(
  prisma: PrismaClient,
  input: {
    id: string;
    credential: string;
    pepper: string;
    environment: string;
    issuer: string;
    audience: string;
    requiredScopes: readonly string[];
    now: Date;
  },
) {
  const identity = await prisma.serviceIdentity.findUnique({
    where: {
      environment_audience_id: {
        environment: input.environment,
        audience: input.audience,
        id: input.id,
      },
    },
  });
  assertServiceIdentity(identity, input);
  if (!refreshMatches(input.credential, identity.credentialHash, input.pepper))
    throw new Error("SERVICE_IDENTITY_REJECTED");
  return identity;
}

type AuditInput = Readonly<{
  id: string;
  correlationId: string;
  causationId: string;
}>;

export async function rotateServiceIdentityCredential(
  prisma: PrismaClient,
  input: {
    id: string;
    environment: string;
    audience: string;
    expectedVersion: number;
    credential: string;
    pepper: string;
    expiresAt: Date;
    actorId: string;
    audit: AuditInput;
    now: Date;
  },
) {
  return prisma.$transaction(async (client) => {
    const updated = await client.serviceIdentity.updateMany({
      where: {
        id: input.id,
        environment: input.environment,
        audience: input.audience,
        credentialVersion: input.expectedVersion,
        status: RecordStatus.ACTIVE,
        revokedAt: null,
      },
      data: {
        credentialHash: refreshHash(input.credential, input.pepper),
        credentialVersion: { increment: 1 },
        expiresAt: input.expiresAt,
      },
    });
    if (updated.count !== 1)
      throw new Error("SERVICE_IDENTITY_ROTATION_REJECTED");
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        actorId: input.actorId,
        eventType: "foundation.service-identity.rotated",
        targetRefs: { serviceIdentityId: input.id },
        safeMetadata: { credentialVersion: input.expectedVersion + 1 },
        occurredAt: input.now,
      },
    });
  });
}

export async function revokeServiceIdentity(
  prisma: PrismaClient,
  input: {
    id: string;
    environment: string;
    audience: string;
    actorId: string;
    audit: AuditInput;
    now: Date;
  },
) {
  return prisma.$transaction(async (client) => {
    const updated = await client.serviceIdentity.updateMany({
      where: {
        id: input.id,
        environment: input.environment,
        audience: input.audience,
        revokedAt: null,
      },
      data: { revokedAt: input.now, status: RecordStatus.REVOKED },
    });
    if (updated.count !== 1)
      throw new Error("SERVICE_IDENTITY_REVOCATION_REJECTED");
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        actorId: input.actorId,
        eventType: "foundation.service-identity.revoked",
        targetRefs: { serviceIdentityId: input.id },
        safeMetadata: {},
        occurredAt: input.now,
      },
    });
  });
}

export async function provisionFirstTenant(
  prisma: PrismaClient,
  input: {
    environment: string;
    deploymentIdentityId: string;
    deploymentCredential: string;
    credentialPepper: string;
    tenant: { id: string; slug: string; displayName: string };
    admin: {
      id: string;
      membershipId: string;
      email: string;
      password: string;
    };
    audit: AuditInput;
    now: Date;
    deterministicCredentials?: boolean;
  },
) {
  if (
    input.environment === "production" &&
    (input.deterministicCredentials ||
      input.admin.password.length < 12 ||
      /^(password|admin|changeme|default)/i.test(input.admin.password))
  )
    throw new Error("PRODUCTION_CREDENTIAL_REJECTED");
  const passwordHash = await hashPassword(input.admin.password);
  return prisma.$transaction(async (client) => {
    const deployment = await client.serviceIdentity.findUnique({
      where: {
        environment_audience_id: {
          environment: input.environment,
          audience: "provisioning",
          id: input.deploymentIdentityId,
        },
      },
    });
    assertServiceIdentity(deployment, {
      environment: input.environment,
      issuer: "siromix-deployment",
      audience: "provisioning",
      requiredScopes: ["tenant:bootstrap"],
      now: input.now,
    });
    if (
      !refreshMatches(
        input.deploymentCredential,
        deployment.credentialHash,
        input.credentialPepper,
      )
    )
      throw new Error("SERVICE_IDENTITY_REJECTED");
    const existing = await client.tenant.findUnique({
      where: { slug: input.tenant.slug },
    });
    if (existing) {
      const identity = await client.userIdentity.findUnique({
        where: {
          tenantId_normalizedEmail: {
            tenantId: existing.id,
            normalizedEmail: normalizeEmail(input.admin.email),
          },
        },
      });
      if (existing.id === input.tenant.id && identity?.id === input.admin.id)
        return { tenantId: existing.id, userId: identity.id, replayed: true };
      throw new Error("PROVISIONING_CONFLICT");
    }
    if ((await client.tenant.count()) !== 0)
      throw new Error("FIRST_TENANT_ALREADY_PROVISIONED");
    await client.tenant.create({ data: input.tenant });
    await client.userIdentity.create({
      data: {
        id: input.admin.id,
        tenantId: input.tenant.id,
        normalizedEmail: normalizeEmail(input.admin.email),
        passwordHash,
      },
    });
    await client.tenantMembership.create({
      data: {
        id: input.admin.membershipId,
        tenantId: input.tenant.id,
        userId: input.admin.id,
        roles: ["tenant-admin"],
      },
    });
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        tenantId: input.tenant.id,
        actorId: deployment.id,
        eventType: "foundation.tenant.provisioned",
        targetRefs: { tenantId: input.tenant.id, userId: input.admin.id },
        safeMetadata: { environment: input.environment },
        occurredAt: input.now,
      },
    });
    return {
      tenantId: input.tenant.id,
      userId: input.admin.id,
      replayed: false,
    };
  });
}

export async function provisionTenantMember(
  prisma: PrismaClient,
  input: {
    actorId: string;
    tenantId: string;
    identityId: string;
    membershipId: string;
    email: string;
    password: string;
    roles: readonly ("teacher" | "tenant-admin")[];
    audit: AuditInput;
    now: Date;
  },
) {
  if (
    input.roles.length === 0 ||
    input.roles.some((role) => !["teacher", "tenant-admin"].includes(role))
  )
    throw new Error("ROLE_REJECTED");
  const passwordHash = await hashPassword(input.password);
  return prisma.$transaction(async (client) => {
    const actor = await client.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.actorId,
        },
      },
    });
    if (
      !actor ||
      actor.status !== RecordStatus.ACTIVE ||
      !actor.roles.includes("tenant-admin")
    )
      throw new Error("ACCESS_DENIED");
    const identity = await client.userIdentity.upsert({
      where: {
        tenantId_normalizedEmail: {
          tenantId: input.tenantId,
          normalizedEmail: normalizeEmail(input.email),
        },
      },
      create: {
        id: input.identityId,
        tenantId: input.tenantId,
        normalizedEmail: normalizeEmail(input.email),
        passwordHash,
      },
      update: { status: RecordStatus.ACTIVE },
    });
    if (identity.id !== input.identityId)
      throw new Error("PROVISIONING_CONFLICT");
    await client.tenantMembership.upsert({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: identity.id,
        },
      },
      create: {
        id: input.membershipId,
        tenantId: input.tenantId,
        userId: identity.id,
        roles: [...input.roles],
      },
      update: { roles: [...input.roles], status: RecordStatus.ACTIVE },
    });
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        tenantId: input.tenantId,
        actorId: input.actorId,
        eventType: "foundation.identity.provisioned",
        targetRefs: { userId: identity.id },
        safeMetadata: { roles: [...input.roles] },
        occurredAt: input.now,
      },
    });
    return identity;
  });
}

export async function deactivateTenantMember(
  prisma: PrismaClient,
  input: {
    actorId: string;
    tenantId: string;
    userId: string;
    audit: AuditInput;
    now: Date;
  },
) {
  return prisma.$transaction(async (client) => {
    const actor = await client.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.actorId,
        },
      },
    });
    if (!actor?.roles.includes("tenant-admin"))
      throw new Error("ACCESS_DENIED");
    const membership = await client.tenantMembership.updateMany({
      where: { tenantId: input.tenantId, userId: input.userId },
      data: { status: RecordStatus.DISABLED },
    });
    if (membership.count !== 1) throw new Error("ACCESS_DENIED");
    await client.userIdentity.updateMany({
      where: { id: input.userId, tenantId: input.tenantId },
      data: { status: RecordStatus.DISABLED },
    });
    await client.refreshSession.updateMany({
      where: {
        userId: input.userId,
        tenantId: input.tenantId,
        revokedAt: null,
      },
      data: { revokedAt: input.now },
    });
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        tenantId: input.tenantId,
        actorId: input.actorId,
        eventType: "foundation.identity.deactivated",
        targetRefs: { userId: input.userId },
        safeMetadata: {},
        occurredAt: input.now,
      },
    });
  });
}

export async function createSupportGrant(
  prisma: PrismaClient,
  input: {
    id: string;
    tenantId: string;
    supportActorId: string;
    approverId: string;
    resources: readonly string[];
    actions: readonly string[];
    reason: string;
    startsAt: Date;
    expiresAt: Date;
    audit: AuditInput;
    now: Date;
  },
) {
  if (
    input.resources.length === 0 ||
    input.actions.length === 0 ||
    input.actions.some((action) => action.startsWith("secret:")) ||
    input.expiresAt <= input.startsAt ||
    input.expiresAt.getTime() - input.startsAt.getTime() > 4 * 3_600_000
  )
    throw new Error("SUPPORT_GRANT_REJECTED");
  return prisma.$transaction(async (client) => {
    const approver = await client.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.approverId,
        },
      },
    });
    if (
      !approver ||
      approver.status !== RecordStatus.ACTIVE ||
      !approver.roles.includes("tenant-admin")
    )
      throw new Error("ACCESS_DENIED");
    const grant = await client.supportGrant.create({
      data: {
        id: input.id,
        tenantId: input.tenantId,
        supportActorId: input.supportActorId,
        approverId: input.approverId,
        resources: [...input.resources],
        actions: [...input.actions],
        reason: input.reason,
        startsAt: input.startsAt,
        expiresAt: input.expiresAt,
        auditRefs: { auditId: input.audit.id },
      },
    });
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        tenantId: input.tenantId,
        actorId: input.approverId,
        eventType: "foundation.support-grant.created",
        targetRefs: { grantId: grant.id },
        safeMetadata: {
          supportActorId: input.supportActorId,
          expiresAt: input.expiresAt.toISOString(),
        },
        occurredAt: input.now,
      },
    });
    return grant;
  });
}

export async function authorizeSupportAccess(
  prisma: PrismaClient,
  input: {
    tenantId: string;
    supportActorId: string;
    resource: string;
    action: string;
    now: Date;
  },
) {
  if (input.action.startsWith("secret:")) throw new Error("ACCESS_DENIED");
  const grants = await prisma.supportGrant.findMany({
    where: {
      tenantId: input.tenantId,
      supportActorId: input.supportActorId,
      startsAt: { lte: input.now },
      expiresAt: { gt: input.now },
      revokedAt: null,
    },
  });
  if (
    !grants.some(
      (grant) =>
        grant.resources.includes(input.resource) &&
        grant.actions.includes(input.action),
    )
  )
    throw new Error("ACCESS_DENIED");
}

export async function revokeSupportGrant(
  prisma: PrismaClient,
  input: {
    id: string;
    tenantId: string;
    actorId: string;
    audit: AuditInput;
    now: Date;
  },
) {
  return prisma.$transaction(async (client) => {
    const actor = await client.tenantMembership.findUnique({
      where: {
        tenantId_userId: {
          tenantId: input.tenantId,
          userId: input.actorId,
        },
      },
    });
    if (
      !actor ||
      actor.status !== RecordStatus.ACTIVE ||
      !actor.roles.includes("tenant-admin")
    )
      throw new Error("ACCESS_DENIED");
    const revoked = await client.supportGrant.updateMany({
      where: { id: input.id, tenantId: input.tenantId, revokedAt: null },
      data: { revokedAt: input.now },
    });
    if (revoked.count !== 1) throw new Error("ACCESS_DENIED");
    await client.auditEnvelope.create({
      data: {
        ...input.audit,
        tenantId: input.tenantId,
        actorId: input.actorId,
        eventType: "foundation.support-grant.revoked",
        targetRefs: { grantId: input.id },
        safeMetadata: {},
        occurredAt: input.now,
      },
    });
  });
}

export const refreshCookie = (production: boolean) =>
  Object.freeze({
    httpOnly: true,
    secure: production,
    sameSite: "strict" as const,
    path: "/auth/refresh",
    maxAge: refreshPolicy.absoluteMs,
  });

export function validateCookieMutation(input: {
  csrfCookie: string;
  csrfHeader: string;
  origin: string;
  allowedOrigins: readonly string[];
}) {
  if (
    !input.allowedOrigins.includes(input.origin) ||
    !csrfMatches(input.csrfCookie, input.csrfHeader)
  )
    throw new Error("CSRF_REJECTED");
}

export const securityHeaders = Object.freeze({
  "content-security-policy": "default-src 'self'; frame-ancestors 'none'",
  "referrer-policy": "no-referrer",
  "x-content-type-options": "nosniff",
  "x-frame-options": "DENY",
});
