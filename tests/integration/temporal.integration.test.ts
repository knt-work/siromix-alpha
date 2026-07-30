import { NativeConnection, Runtime, Worker } from "@temporalio/worker";
import { WorkflowIdReusePolicy } from "@temporalio/common";
import { spawn, type ChildProcess } from "node:child_process";
import assert from "node:assert/strict";
import { resolve } from "node:path";
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

async function startPythonWorker(port: number) {
  const root = fileURLToPath(new URL("../../", import.meta.url));
  const python =
    process.platform === "win32"
      ? resolve(root, "workers/document-ai/.venv/Scripts/python.exe")
      : resolve(root, "workers/document-ai/.venv/bin/python");
  const child = spawn(python, ["-m", "siromix_worker.main"], {
    cwd: root,
    env: {
      ...process.env,
      SIROMIX_ENV: "local",
      TEMPORAL_ADDRESS: "127.0.0.1:7233",
      WORKER_HEALTH_PORT: String(port),
    },
    stdio: ["ignore", "pipe", "pipe"],
  });
  let diagnostics = "";
  for (const stream of [child.stdout, child.stderr])
    stream?.on("data", (chunk) => {
      diagnostics = `${diagnostics}${String(chunk)}`.slice(-4_000);
    });
  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (child.exitCode !== null)
      throw new Error(
        `PYTHON_TEMPORAL_WORKER_EXITED: ${child.exitCode}; ${diagnostics}`,
      );
    try {
      const response = await fetch(`http://127.0.0.1:${port}/ready`);
      if (response.ok) return { child, diagnostics: () => diagnostics };
    } catch {
      // The worker has not registered and opened its health endpoint yet.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  stopChild(child);
  throw new Error(`PYTHON_TEMPORAL_WORKER_NOT_READY: ${diagnostics}`);
}

function stopChild(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null) return;
  child.kill("SIGTERM");
  const timer = setTimeout(() => child.kill("SIGKILL"), 5_000);
  timer.unref();
}

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
    const workers = new Set<Worker>();
    const workerRuns = new Set<Promise<unknown>>();
    let pythonWorker: ChildProcess | undefined;
    try {
      const primaryWorker = await Worker.create({
        connection: workerConnection,
        taskQueue: queue,
        identity: "foundation-ts-worker",
        workflowsPath,
        activities,
      });
      workers.add(primaryWorker);
      workerRuns.add(primaryWorker.run());
      const pythonRegistration = await startPythonWorker(
        31_000 + Math.floor(Math.random() * 1_000),
      );
      pythonWorker = pythonRegistration.child;

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
      workers.add(workerOne);
      const workerOneRun = workerOne.run();
      workerRuns.add(workerOneRun);
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
      workers.delete(workerOne);
      workerRuns.delete(workerOneRun);
      const workerTwo = await Worker.create({
        connection: workerConnection,
        taskQueue: restartQueue,
        identity: "foundation-restart-worker-two",
        workflowsPath,
        activities,
      });
      workers.add(workerTwo);
      const restarted = workerTwo.runUntil(restartHandle.result());
      workerRuns.add(restarted);
      assert.equal((await restarted).runtime, "typescript");
      workers.delete(workerTwo);
      workerRuns.delete(restarted);
    } finally {
      for (const worker of workers) worker.shutdown();
      stopChild(pythonWorker);
      await Promise.allSettled(workerRuns);
      await workerConnection.close();
      await connection.close();
      await Runtime.instance().shutdown();
    }
  },
);
