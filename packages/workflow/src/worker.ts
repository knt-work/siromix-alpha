import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { NativeConnection, Worker } from "@temporalio/worker";
import * as activities from "./activities.js";
import { assertWorkerRegistration } from "./index.js";

const environment = process.env.SIROMIX_ENV ?? "local";
const identity = process.env.TEMPORAL_WORKER_IDENTITY ?? "foundation-ts-worker";
const taskQueue = assertWorkerRegistration({
  environment,
  domain: "foundation",
  identity,
  allowedIdentities: ["foundation-ts-worker"],
  ...(process.env.TEMPORAL_TASK_QUEUE
    ? { queue: process.env.TEMPORAL_TASK_QUEUE }
    : undefined),
});
async function connectWithRetry() {
  let lastError: unknown;
  for (let attempt = 1; attempt <= 60; attempt += 1) {
    try {
      return await NativeConnection.connect({
        address: process.env.TEMPORAL_ADDRESS ?? "127.0.0.1:7233",
      });
    } catch (error) {
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, 1_000));
    }
  }
  throw new Error("TEMPORAL_WORKER_CONNECTION_TIMEOUT", { cause: lastError });
}
const connection = await connectWithRetry();
const worker = await Worker.create({
  connection,
  namespace: "default",
  taskQueue,
  identity,
  workflowsPath: fileURLToPath(new URL("./workflows.ts", import.meta.url)),
  activities,
});
const server = createServer((request, response) => {
  if (request.url !== "/live" && request.url !== "/ready") {
    response.writeHead(404).end();
    return;
  }
  response.writeHead(200, { "content-type": "application/json" }).end(
    JSON.stringify({
      status: "ready",
      service: "foundation-ts-worker",
      queue: taskQueue,
      identity,
    }),
  );
});
server.listen(Number(process.env.TS_WORKER_HEALTH_PORT ?? 3003), "127.0.0.1");
const shutdown = () => worker.shutdown();
process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);
try {
  await worker.run();
} finally {
  server.close();
  await connection.close();
}
