import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import net from "node:net";
import test from "node:test";

const integrationEnabled = process.env.SIROMIX_INTEGRATION === "1";

function postgres(sql) {
  return execFileSync(
    "docker",
    [
      "exec",
      "siromix-postgres-1",
      "psql",
      "-U",
      "siromix_app",
      "-d",
      "siromix",
      "-tAc",
      sql,
    ],
    { encoding: "utf8" },
  ).trim();
}

function connect(port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1");
    socket.setTimeout(5_000);
    socket.once("connect", () => {
      socket.destroy();
      resolve(undefined);
    });
    socket.once("timeout", () => {
      socket.destroy();
      reject(new Error(`port ${port} timed out`));
    });
    socket.once("error", reject);
  });
}

test(
  "AC-002/005 PostgreSQL is reachable, migrated, and has pgvector",
  { skip: !integrationEnabled },
  () => {
    assert.match(
      postgres("SELECT extversion FROM pg_extension WHERE extname='vector'"),
      /^\d+\.\d+\.\d+$/,
    );
    assert.ok(
      Number(
        postgres(
          'SELECT COUNT(*) FROM "_prisma_migrations" WHERE finished_at IS NOT NULL',
        ),
      ) >= 1,
    );
    const tables = postgres(
      "SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename",
    ).split(/\r?\n/);
    for (const table of [
      "AuditEnvelope",
      "IdempotencyRecord",
      "MigrationMetadata",
      "OutboxEnvelope",
      "RefreshSession",
      "ServiceIdentity",
      "SupportGrant",
      "Tenant",
      "TenantMembership",
      "UserIdentity",
    ]) {
      assert.ok(tables.includes(table), table);
    }
    assert.equal(
      tables.some((table) =>
        /Exam|Question|Document|Canonical|Artifact/.test(table),
      ),
      false,
    );
  },
);

test(
  "AC-002/015 shared local dependencies expose loopback readiness",
  { skip: !integrationEnabled },
  async () => {
    await Promise.all([5432, 7233, 9000, 3310].map(connect));
    const response = await fetch("http://127.0.0.1:8233");
    assert.equal(response.ok, true);
  },
);
