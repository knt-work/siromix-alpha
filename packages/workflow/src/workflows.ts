import {
  ActivityCancellationType,
  proxyActivities,
  sleep,
} from "@temporalio/workflow";
import type * as activities from "./activities.js";
import type { FoundationWorkflowEnvelope } from "./index.js";

const smoke = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  heartbeatTimeout: "2 seconds",
  retry: {
    maximumAttempts: 3,
    initialInterval: "1 second",
    backoffCoefficient: 2,
    maximumInterval: "30 seconds",
  },
});

export async function foundationSmokeWorkflow(input: {
  envelope: FoundationWorkflowEnvelope;
  includePython?: boolean;
  pythonTaskQueue?: string;
}) {
  if (
    input.envelope.schemaVersion !== "1.0" ||
    !input.envelope.tenantId ||
    !input.envelope.actorId ||
    Date.parse(input.envelope.deadlineAt) <= Date.now()
  )
    throw new Error("WORKFLOW_ENVELOPE_REJECTED");
  const typescript = await smoke.foundationTypeScriptSmoke({
    idempotencyKey: input.envelope.idempotencyKey,
  });
  if (input.includePython && !input.pythonTaskQueue)
    throw new Error("WORKER_REGISTRATION_REJECTED");
  const pythonTaskQueue = input.pythonTaskQueue;
  const pythonResult = input.includePython
    ? await proxyActivities<{
        pythonFoundationSmoke(value: {
          schema_version: "1.0";
          idempotency_key: string;
          correlation_id: string;
          causation_id: string;
        }): Promise<{ ok: true; runtime: "python"; idempotency_key: string }>;
      }>({
        taskQueue: pythonTaskQueue!,
        startToCloseTimeout: "30 seconds",
        retry: { maximumAttempts: 3 },
      }).pythonFoundationSmoke({
        schema_version: "1.0",
        idempotency_key: input.envelope.idempotencyKey,
        correlation_id: input.envelope.correlationId,
        causation_id: input.envelope.causationId,
      })
    : undefined;
  return { typescript, python: pythonResult };
}

export async function foundationRetryWorkflow(input: {
  idempotencyKey: string;
  failuresBeforeSuccess: number;
}) {
  return smoke.foundationTypeScriptSmoke(input);
}

const heartbeat = proxyActivities<typeof activities>({
  startToCloseTimeout: "30 seconds",
  heartbeatTimeout: "1 second",
  retry: { maximumAttempts: 1 },
  cancellationType: ActivityCancellationType.WAIT_CANCELLATION_COMPLETED,
});

export async function foundationHeartbeatWorkflow(input: {
  iterations: number;
  intervalMs: number;
  stallAfterFirst?: boolean;
}) {
  return heartbeat.foundationHeartbeatActivity(input);
}

export async function foundationRestartWorkflow(input: {
  idempotencyKey: string;
  delayMs: number;
}) {
  await sleep(input.delayMs);
  return smoke.foundationTypeScriptSmoke({
    idempotencyKey: input.idempotencyKey,
  });
}
