export const baselineActivityRetry = Object.freeze({
  maximumAttempts: 3,
  initialIntervalMs: 1_000,
  backoffCoefficient: 2,
  maximumIntervalMs: 30_000,
});
export function taskQueue(
  environment: string,
  domain: string,
  major = 1,
): string {
  if (!/^[a-z0-9-]+$/.test(environment) || !/^[a-z0-9-]+$/.test(domain))
    throw new Error("QUEUE_NAME_INVALID");
  return `siro-${environment}-${domain}-v${major}`;
}
export function assertRetryDoesNotBroaden(
  candidate: typeof baselineActivityRetry,
): void {
  if (
    candidate.maximumAttempts > baselineActivityRetry.maximumAttempts ||
    candidate.maximumIntervalMs > baselineActivityRetry.maximumIntervalMs
  ) {
    throw new Error("RETRY_POLICY_BROADENED");
  }
}
export async function foundationSmokeActivity(): Promise<
  Readonly<{ ok: true }>
> {
  return { ok: true };
}

export type FoundationWorkflowEnvelope = Readonly<{
  schemaVersion: "1.0";
  id: string;
  tenantId: string;
  actorId: string;
  correlationId: string;
  causationId: string;
  idempotencyKey: string;
  occurredAt: string;
  deadlineAt: string;
}>;

export function validateFoundationEnvelope(
  value: FoundationWorkflowEnvelope,
  now = new Date(),
) {
  for (const field of [
    value.id,
    value.tenantId,
    value.actorId,
    value.correlationId,
    value.causationId,
    value.idempotencyKey,
  ])
    if (!field) throw new Error("WORKFLOW_ENVELOPE_REJECTED");
  if (
    value.schemaVersion !== "1.0" ||
    !Number.isFinite(Date.parse(value.occurredAt)) ||
    Date.parse(value.deadlineAt) <= now.getTime()
  )
    throw new Error("WORKFLOW_ENVELOPE_REJECTED");
}

export function assertWorkerRegistration(input: {
  environment: string;
  domain: string;
  identity: string;
  allowedIdentities: readonly string[];
  queue?: string;
}) {
  const expectedQueue = taskQueue(input.environment, input.domain);
  if (
    !input.allowedIdentities.includes(input.identity) ||
    (input.queue && input.queue !== expectedQueue)
  )
    throw new Error("WORKER_REGISTRATION_REJECTED");
  return expectedQueue;
}

export { connectFoundationClient } from "./temporal-client.js";
