// Generated from schemas/envelope-1.0.json. Do not edit.
import { z } from "zod";

export const foundationEnvelopeSchema = z.object({
  schemaVersion: z.literal("1.0"),
  id: z.string().uuid(),
  tenantId: z.string().uuid().optional(),
  actorId: z.string().uuid().optional(),
  correlationId: z.string().uuid(),
  causationId: z.string().uuid(),
  idempotencyKey: z.string().min(1).max(200).optional(),
  occurredAt: z.iso.datetime(),
  payloadType: z.string().regex(/^[a-z][a-z0-9.-]+$/),
  payloadVersion: z.string().regex(/^[0-9]+\.[0-9]+$/),
  traceparent: z.string().max(128).optional(),
}).strict();

export type FoundationEnvelope = z.infer<typeof foundationEnvelopeSchema>;
export const supportsVersion = (version: string): boolean =>
  version === "1.0";
