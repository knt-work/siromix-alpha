import { execFileSync, spawn } from "node:child_process";
import {
  closeSync,
  existsSync,
  mkdirSync,
  openSync,
  readFileSync,
  unlinkSync,
  writeFileSync,
} from "node:fs";
import { resolve } from "node:path";
import { cpus, totalmem } from "node:os";

const root = resolve(import.meta.dirname, "..");
const compose = ["compose", "-f", resolve(root, "infra/docker/compose.yaml")];
const stateDirectory = resolve(root, ".siromix");
const processStatePath = resolve(stateDirectory, "processes.json");
const packageRunner =
  process.platform === "win32"
    ? (process.env.ComSpec ?? "cmd.exe")
    : "corepack";
const pnpmArguments = (args) =>
  process.platform === "win32"
    ? ["/d", "/s", "/c", "corepack", "pnpm", ...args]
    : ["pnpm", ...args];
const expected = { node: 24, pnpm: 10, python: [3, 12], uv: [0, 8] };
const VERSION_PROBE_TIMEOUT_MS = 3_000;
const run = (file, args, options = {}) =>
  execFileSync(file, args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    ...options,
  }).trim();
const version = (file, args = ["--version"]) => {
  try {
    return {
      ok: true,
      value: run(file, args, { timeout: VERSION_PROBE_TIMEOUT_MS }),
    };
  } catch (error) {
    return {
      ok: false,
      value: error.code === "ENOENT" ? "not found" : "unavailable",
    };
  }
};

function doctor() {
  const values = {
    node: version("node").value,
    pnpm: version(packageRunner, pnpmArguments(["--version"])).value,
    python: version("uvx", [
      "--from",
      "uv==0.8.14",
      "uv",
      "run",
      "--python",
      "3.12",
      "python",
      "--version",
    ]).value,
    uv: version("uvx", ["--from", "uv==0.8.14", "uv", "--version"]).value,
    docker: version("docker").value,
    compose: version("docker", ["compose", "version"]).value,
  };
  const checks = [
    [
      "node",
      /^v24\./.test(values.node),
      `expected Node 24.x; got ${values.node}`,
    ],
    [
      "pnpm",
      /^10\./.test(values.pnpm),
      `expected pnpm 10.x; got ${values.pnpm}`,
    ],
    [
      "python",
      /^Python 3\.12\./.test(values.python),
      `expected Python 3.12.x; got ${values.python}`,
    ],
    ["uv", /^uv 0\.8\./.test(values.uv), `expected uv 0.8.x; got ${values.uv}`],
    [
      "docker",
      /^Docker version/.test(values.docker),
      `Docker ${values.docker}`,
    ],
    [
      "compose",
      /^Docker Compose version/.test(values.compose),
      `Compose ${values.compose}`,
    ],
  ].map(([name, ok, detail]) => ({ name, ok, detail }));
  const report = { schemaVersion: "1.0", command: "doctor", checks };
  console.log(JSON.stringify(report, null, 2));
  if (checks.some((check) => !check.ok)) process.exitCode = 1;
  return report;
}

function probeHttp(name, url) {
  try {
    run("curl.exe", [
      "--silent",
      "--show-error",
      "--fail",
      "--max-time",
      "3",
      url,
    ]);
    return { name, ready: true };
  } catch {
    return { name, ready: false };
  }
}

function health() {
  let services = [];
  try {
    const raw = run("docker", [...compose, "ps", "--format", "json"]);
    services = raw
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => {
        const item = JSON.parse(line);
        return {
          name: item.Service,
          state: item.State,
          health: item.Health || "none",
        };
      });
  } catch {
    services = [
      { name: "docker-compose", state: "unavailable", health: "unavailable" },
    ];
  }
  const applications = [
    probeHttp("web", "http://127.0.0.1:3000"),
    probeHttp("api", "http://127.0.0.1:3001/ready"),
    probeHttp("document-ai-worker", "http://127.0.0.1:3002/ready"),
    probeHttp("foundation-ts-worker", "http://127.0.0.1:3003/ready"),
  ];
  const report = {
    schemaVersion: "1.0",
    command: "health",
    ready:
      services.length >= 5 &&
      services.every(
        (service) =>
          service.state === "running" && service.health !== "unhealthy",
      ) &&
      applications.every((application) => application.ready),
    services,
    applications,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!report.ready) process.exitCode = 1;
  return report;
}

function readiness() {
  const report = {
    schemaVersion: "1.0",
    generatedAt: new Date().toISOString(),
    tools: expected,
    dependencies: ["postgresql-pgvector", "temporal", "minio", "clamav"],
    migration: "packages/database/prisma/migrations",
    contractVersion: "1.0",
    verification: {
      commands: [
        "pnpm test",
        "pnpm test:frontend",
        "pnpm test:e2e",
        "pnpm test:integration",
        "uv run --frozen --project workers/document-ai python -m pytest workers/document-ai/tests",
        "pnpm security:scan",
        "pnpm contracts:check",
        "pnpm build",
      ],
      mandatoryIntegrationProfile: {
        SIROMIX_ENV: "test",
        SIROMIX_INTEGRATION: "1",
      },
      platforms: ["windows-powershell", "ci-linux"],
    },
    artifacts: { commit: version("git", ["rev-parse", "HEAD"]).value },
  };
  writeFileSync(
    resolve(root, "readiness-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
}

function startProcess(name, file, args, extraEnvironment = {}) {
  mkdirSync(stateDirectory, { recursive: true });
  const log = openSync(resolve(stateDirectory, `${name}.log`), "a");
  const child = spawn(file, args, {
    cwd: root,
    detached: true,
    windowsHide: true,
    env: { ...process.env, ...extraEnvironment },
    stdio: ["ignore", log, log],
  });
  child.unref();
  closeSync(log);
  return { name, pid: child.pid };
}

function waitForApplications(timeoutMs = 120_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ready = [
      probeHttp("web", "http://127.0.0.1:3000"),
      probeHttp("api", "http://127.0.0.1:3001/ready"),
      probeHttp("worker", "http://127.0.0.1:3002/ready"),
      probeHttp("ts-worker", "http://127.0.0.1:3003/ready"),
    ].every((application) => application.ready);
    if (ready) return;
  }
  throw new Error("STARTUP_READINESS_TIMEOUT");
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

function startApplications() {
  if (existsSync(processStatePath)) {
    const recordedProcesses = JSON.parse(
      readFileSync(processStatePath, "utf8"),
    );
    if (recordedProcesses.every(({ pid }) => isProcessAlive(pid)))
      throw new Error("APPLICATIONS_ALREADY_STARTED");
    stopApplications();
    console.warn("STALE_APPLICATION_STATE_RECOVERED");
  }
  const processes = [
    startProcess(
      "web",
      packageRunner,
      pnpmArguments(["--filter", "@siromix/web", "dev"]),
    ),
    startProcess(
      "api",
      packageRunner,
      pnpmArguments(["--filter", "@siromix/api", "dev"]),
      { PORT: "3001" },
    ),
    startProcess(
      "foundation-ts-worker",
      packageRunner,
      pnpmArguments(["--filter", "@siromix/workflow", "worker"]),
      {
        SIROMIX_ENV: "local",
        TS_WORKER_HEALTH_PORT: "3003",
        TEMPORAL_WORKER_IDENTITY: "foundation-ts-worker",
      },
    ),
    startProcess(
      "document-ai-worker",
      "uvx",
      [
        "--from",
        "uv==0.8.14",
        "uv",
        "run",
        "--frozen",
        "--project",
        "workers/document-ai",
        "python",
        "-m",
        "siromix_worker.main",
      ],
      { SIROMIX_ENV: "local", WORKER_HEALTH_PORT: "3002" },
    ),
  ];
  writeFileSync(processStatePath, JSON.stringify(processes, null, 2) + "\n");
  waitForApplications();
}

function stopApplications() {
  if (!existsSync(processStatePath)) return;
  const processes = JSON.parse(readFileSync(processStatePath, "utf8"));
  for (const processInfo of processes) {
    try {
      if (process.platform === "win32")
        run("taskkill", ["/PID", String(processInfo.pid), "/T", "/F"]);
      else process.kill(-processInfo.pid, "SIGTERM");
    } catch {
      // Idempotent stop tolerates an already-exited process.
    }
  }
  unlinkSync(processStatePath);
}

function migrate() {
  run(
    packageRunner,
    pnpmArguments(["--filter", "@siromix/database", "prisma:migrate"]),
  );
}

function start() {
  doctor();
  if (process.exitCode) return;
  run("docker", [...compose, "up", "-d", "--wait"]);
  process.env.DATABASE_URL ??=
    "postgresql://siromix_app:local-only-password@127.0.0.1:5432/siromix?schema=public";
  migrate();
  startApplications();
  health();
}

function performance() {
  const dockerProfile = (() => {
    try {
      const value = run("docker", [
        "info",
        "--format",
        "{{.NCPU}} {{.MemTotal}}",
      ]).split(" ");
      return { cpus: Number(value[0]), memoryBytes: Number(value[1]) };
    } catch {
      return { cpus: 0, memoryBytes: 0 };
    }
  })();
  const profile = {
    hostLogicalCpus: cpus().length,
    hostMemoryBytes: totalmem(),
    dockerLogicalCpus: dockerProfile.cpus,
    dockerMemoryBytes: dockerProfile.memoryBytes,
    ssdConfirmed: process.env.SIROMIX_REFERENCE_SSD === "1",
  };
  const eligible =
    profile.hostLogicalCpus >= 8 &&
    profile.hostMemoryBytes >= 16 * 1024 ** 3 &&
    profile.dockerLogicalCpus >= 4 &&
    profile.dockerMemoryBytes >= 8 * 1024 ** 3 &&
    profile.ssdConfirmed;
  if (!eligible) {
    const report = {
      schemaVersion: "1.0",
      eligible: false,
      profile,
      reason: "REFERENCE_PROFILE_INELIGIBLE",
      generatedAt: new Date().toISOString(),
    };
    writeFileSync(
      resolve(root, "performance-report.json"),
      JSON.stringify(report, null, 2) + "\n",
    );
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = 1;
    return;
  }
  const durationsMs = [];
  for (let runNumber = 1; runNumber <= 20; runNumber += 1) {
    stopApplications();
    run("docker", [...compose, "stop"]);
    const startedAt = Date.now();
    run("docker", [...compose, "up", "-d", "--wait"]);
    process.env.DATABASE_URL ??=
      "postgresql://siromix_app:local-only-password@127.0.0.1:5432/siromix?schema=public";
    migrate();
    startApplications();
    durationsMs.push(Date.now() - startedAt);
  }
  const sorted = [...durationsMs].sort((left, right) => left - right);
  const report = {
    schemaVersion: "1.0",
    eligible,
    profile,
    runs: durationsMs,
    successfulWithinFiveMinutes: durationsMs.filter(
      (duration) => duration <= 300_000,
    ).length,
    medianMs: sorted[Math.floor(sorted.length / 2)],
    p95Ms: sorted[Math.ceil(sorted.length * 0.95) - 1],
    toolVersions: {
      node: process.version,
      pnpm: "10.15.1",
      python: "3.12.11",
      uv: "0.8.14",
    },
    imageVersions: {
      postgres: "pgvector/pgvector:pg17",
      temporal: "temporalio/auto-setup:1.27.2",
      temporalUi: "temporalio/ui:2.40.1",
      minio: "minio/minio:RELEASE.2025-07-23T15-54-02Z",
      clamav: "clamav/clamav:1.4.3",
    },
    firstRunDownloads: {
      excludedFromCachedRuns: true,
      durationMs: null,
    },
    generatedAt: new Date().toISOString(),
  };
  writeFileSync(
    resolve(root, "performance-report.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
  console.log(JSON.stringify(report, null, 2));
  if (report.successfulWithinFiveMinutes < 19) process.exitCode = 1;
}

const command = process.argv[2];
if (command === "doctor") doctor();
else if (command === "health") health();
else if (command === "readiness") readiness();
else if (command === "bootstrap") {
  doctor();
  if (!process.exitCode) {
    run(packageRunner, pnpmArguments(["install", "--frozen-lockfile"]));
    run("uvx", [
      "--from",
      "uv==0.8.14",
      "uv",
      "sync",
      "--frozen",
      "--project",
      "workers/document-ai",
    ]);
  }
} else if (command === "dev") start();
else if (command === "stop") {
  stopApplications();
  console.log(run("docker", [...compose, "down"]));
} else if (command === "performance") performance();
else if (command === "reset-test") {
  if (
    process.env.SIROMIX_ENV !== "test" ||
    !/^test-[a-z0-9-]+$/.test(process.env.SIROMIX_TEST_TARGET ?? "")
  ) {
    throw new Error(
      "RESET_TARGET_REJECTED: SIROMIX_ENV=test and exact test-* target are required",
    );
  }
  console.log(
    `Validated isolated reset target: ${process.env.SIROMIX_TEST_TARGET}`,
  );
} else throw new Error(`Unknown foundation command: ${command}`);
