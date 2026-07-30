import { NativeConnection, Runtime, Worker } from "@temporalio/worker";
import { WorkflowIdReusePolicy } from "@temporalio/common";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import test from "node:test";
import * as activities from "../../packages/workflow/src/activities.ts";
import {
  assertWorkerRegistration,
  connectFoundationClient,
  taskQueue,
} from "../../packages/workflow/src/index.ts";
import {
  foundationHeartbeatWorkflow,
  foundationRestartWorkflow,
  foundationRetryWorkflow,
  foundationSmokeWorkflow,
} from "../../packages/workflow/src/workflows.ts";

const integrationEnabled = process.env.SIROMIX_INTEGRATION === "1";
const workflowsPath = fileURLToPath(
  new URL("../../packages/workflow/src/workflows.ts", import.meta.url),
);
const unique = () =>
  `foundation-${Date.now()}-${Math.random().toString(16).slice(2)}`;
const envelope = (id: string) => ({
  schemaVersion: "1.0" as const,
  id,
  tenantId: unique(),
  actorId: "foundation-integration-client",
  correlationId: unique(),
  causationId: unique(),
  idempotencyKey: id,
  occurredAt: new Date().toISOString(),
  deadlineAt: new Date(Date.now() + 60_000).toISOString(),
});

test(
  "AC-007 real Temporal workers, retries, heartbeat, cancellation, replay, duplicate delivery, and restart",
  { skip: !integrationEnabled, timeout: 90_000 },
  async () => {
    const queue = taskQueue("local", "foundation");
    const pythonQueue = taskQueue("local", "foundation-python");
    assert.equal(
      assertWorkerRegistration({
        environment: "local",
        domain: "foundation",
        identity: "foundation-ts-worker",
        allowedIdentities: ["foundation-ts-worker"],
        queue,
      }),
      queue,
    );
    assert.throws(
      () =>
        assertWorkerRegistration({
          environment: "local",
          domain: "foundation",
          identity: "wrong-worker",
          allowedIdentities: ["foundation-ts-worker"],
          queue,
        }),
      /WORKER_REGISTRATION_REJECTED/,
    );

    const { client, connection } = await connectFoundationClient({
      address: "127.0.0.1:7233",
      identity: "foundation-integration-client",
    });
    const workerConnection = await NativeConnection.connect({
      address: "127.0.0.1:7233",
    });
    try {
      const smokeId = unique();
      const smoke = await client.workflow.execute(foundationSmokeWorkflow, {
        taskQueue: queue,
        workflowId: smokeId,
        args: [
          {
            envelope: envelope(smokeId),
            includePython: true,
            pythonTaskQueue: pythonQueue,
          },
        ],
      });
      assert.equal(smoke.typescript.runtime, "typescript");
      assert.equal(smoke.python?.runtime, "python");

      const python = await client.workflow.execute(
        "pythonFoundationSmokeWorkflow",
        {
          taskQueue: pythonQueue,
          workflowId: unique(),
          args: [
            {
              schema_version: "1.0",
              idempotency_key: unique(),
              correlation_id: unique(),
              causation_id: unique(),
            },
          ],
        },
      );
      assert.deepEqual(python, {
        ok: true,
        runtime: "python",
        idempotency_key: python.idempotency_key,
      });

      const retry = await client.workflow.execute(foundationRetryWorkflow, {
        taskQueue: queue,
        workflowId: unique(),
        args: [{ idempotencyKey: unique(), failuresBeforeSuccess: 2 }],
      });
      assert.equal(retry.attempt, 3);

      const heartbeat = await client.workflow.execute(
        foundationHeartbeatWorkflow,
        {
          taskQueue: queue,
          workflowId: unique(),
          args: [{ iterations: 3, intervalMs: 100 }],
        },
      );
      assert.equal(heartbeat.heartbeats, 3);

      const cancellation = await client.workflow.start(
        foundationHeartbeatWorkflow,
        {
          taskQueue: queue,
          workflowId: unique(),
          args: [{ iterations: 100, intervalMs: 100 }],
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 250));
      await cancellation.cancel();
      await assert.rejects(() => cancellation.result());

      await assert.rejects(() =>
        client.workflow.execute(foundationHeartbeatWorkflow, {
          taskQueue: queue,
          workflowId: unique(),
          args: [{ iterations: 2, intervalMs: 400, stallAfterFirst: true }],
        }),
      );

      const duplicateId = unique();
      const first = await client.workflow.start(foundationSmokeWorkflow, {
        taskQueue: queue,
        workflowId: duplicateId,
        args: [
          {
            envelope: envelope(duplicateId),
          },
        ],
      });
      await first.result();
      await assert.rejects(() =>
        client.workflow.start(foundationSmokeWorkflow, {
          taskQueue: queue,
          workflowId: duplicateId,
          workflowIdReusePolicy: WorkflowIdReusePolicy.REJECT_DUPLICATE,
          args: [
            {
              envelope: envelope(duplicateId),
            },
          ],
        }),
      );

      const history = await first.fetchHistory();
      await Worker.runReplayHistory({ workflowsPath }, history);

      const restartQueue = `siro-test-foundation-${unique()}`;
      const workerOne = await Worker.create({
        connection: workerConnection,
        taskQueue: restartQueue,
        identity: "foundation-restart-worker-one",
        workflowsPath,
        activities,
      });
      const workerOneRun = workerOne.run();
      const restartHandle = await client.workflow.start(
        foundationRestartWorkflow,
        {
          taskQueue: restartQueue,
          workflowId: unique(),
          args: [{ idempotencyKey: unique(), delayMs: 1_000 }],
        },
      );
      await new Promise((resolve) => setTimeout(resolve, 200));
      workerOne.shutdown();
      await workerOneRun;
      const workerTwo = await Worker.create({
        connection: workerConnection,
        taskQueue: restartQueue,
        identity: "foundation-restart-worker-two",
        workflowsPath,
        activities,
      });
      const restarted = workerTwo.runUntil(restartHandle.result());
      assert.equal((await restarted).runtime, "typescript");
    } finally {
      await workerConnection.close();
      await connection.close();
      await Runtime.instance().shutdown();
    }
  },
);
