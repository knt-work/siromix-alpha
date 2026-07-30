import asyncio
import os
import signal
import threading
from dataclasses import dataclass
from datetime import timedelta
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from typing import Any

from temporalio import activity, workflow
from temporalio.client import Client
from temporalio.common import RetryPolicy
from temporalio.worker import Worker


@dataclass(frozen=True)
class WorkerConfig:
    environment: str
    task_queue: str
    identity: str
    temporal_address: str
    health_port: int


def load_config() -> WorkerConfig:
    environment = os.environ.get("SIROMIX_ENV", "local")
    expected_queue = f"siro-{environment}-foundation-python-v1"
    task_queue = os.environ.get("TEMPORAL_TASK_QUEUE", expected_queue)
    identity = os.environ.get(
        "TEMPORAL_PYTHON_WORKER_IDENTITY", "foundation-python-worker"
    )
    if task_queue != expected_queue or identity != "foundation-python-worker":
        raise ValueError("WORKER_REGISTRATION_REJECTED")
    return WorkerConfig(
        environment=environment,
        task_queue=task_queue,
        identity=identity,
        temporal_address=os.environ.get("TEMPORAL_ADDRESS", "127.0.0.1:7233"),
        health_port=int(os.environ.get("WORKER_HEALTH_PORT", "3002")),
    )


@activity.defn(name="pythonFoundationSmoke")
async def python_foundation_smoke(payload: dict[str, str]) -> dict[str, Any]:
    activity.heartbeat({"runtime": "python"})
    if payload.get("schema_version") != "1.0":
        raise ValueError("WORKFLOW_ENVELOPE_REJECTED")
    return {
        "ok": True,
        "runtime": "python",
        "idempotency_key": payload["idempotency_key"],
    }


@workflow.defn(name="pythonFoundationSmokeWorkflow")
class PythonFoundationSmokeWorkflow:
    @workflow.run
    async def run(self, payload: dict[str, str]) -> dict[str, Any]:
        return await workflow.execute_activity(
            python_foundation_smoke,
            payload,
            start_to_close_timeout=timedelta(seconds=30),
            heartbeat_timeout=timedelta(seconds=2),
            retry_policy=RetryPolicy(maximum_attempts=3),
        )


def start_health_server(config: WorkerConfig) -> ThreadingHTTPServer:
    class HealthHandler(BaseHTTPRequestHandler):
        def do_GET(self):
            if self.path not in ("/live", "/ready"):
                self.send_response(404)
                self.end_headers()
                return
            body = (
                '{"status":"ready","service":"document-ai-worker",'
                f'"queue":"{config.task_queue}","identity":"{config.identity}"}}'
            ).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

        def log_message(self, format, *args):
            return

    health_host = os.environ.get("WORKER_HEALTH_HOST", "127.0.0.1")
    server = ThreadingHTTPServer((health_host, config.health_port), HealthHandler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server


async def run_worker() -> None:
    config = load_config()
    client = None
    last_error: Exception | None = None
    for _ in range(60):
        try:
            client = await Client.connect(
                config.temporal_address,
                namespace="default",
                identity=config.identity,
            )
            break
        except Exception as error:
            last_error = error
            await asyncio.sleep(1)
    if client is None:
        raise RuntimeError("TEMPORAL_WORKER_CONNECTION_TIMEOUT") from last_error
    server = start_health_server(config)
    worker = Worker(
        client,
        task_queue=config.task_queue,
        workflows=[PythonFoundationSmokeWorkflow],
        activities=[python_foundation_smoke],
        identity=config.identity,
    )
    stop = asyncio.Event()
    loop = asyncio.get_running_loop()
    for signal_name in (signal.SIGINT, signal.SIGTERM):
        try:
            loop.add_signal_handler(signal_name, stop.set)
        except NotImplementedError:
            signal.signal(signal_name, lambda *_: loop.call_soon_threadsafe(stop.set))
    worker_task = asyncio.create_task(worker.run())
    try:
        await stop.wait()
    finally:
        await worker.shutdown()
        await worker_task
        server.shutdown()
        server.server_close()


if __name__ == "__main__":
    asyncio.run(run_worker())
