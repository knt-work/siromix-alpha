import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import test from "node:test";
import { MinioStorage, R2Storage } from "../../packages/storage/src/index.ts";

const integrationEnabled = process.env.SIROMIX_INTEGRATION === "1";
const tenantId = "019b76da-a800-7000-8000-000000000001";

function storage(Adapter = MinioStorage) {
  return new Adapter({
    endpoint: "http://127.0.0.1:9000",
    region: "us-east-1",
    bucket: "siromix-private",
    accessKeyId: "siromix-local",
    secretAccessKey: "local-minio-password-change-me",
    forcePathStyle: true,
  });
}

test(
  "AC-011 MinIO adapter supports private streaming, head, tags, signing, deletion, and tenant denial",
  { skip: !integrationEnabled },
  async () => {
    execFileSync("docker", [
      "exec",
      "siromix-minio-1",
      "mc",
      "alias",
      "set",
      "local",
      "http://127.0.0.1:9000",
      "siromix-local",
      "local-minio-password-change-me",
    ]);
    execFileSync("docker", [
      "exec",
      "siromix-minio-1",
      "mc",
      "mb",
      "--ignore-existing",
      "local/siromix-private",
    ]);
    const adapter = storage();
    assert.deepEqual(await adapter.health(), { ready: true });
    const ref = await adapter.put(
      tenantId,
      Readable.from(["foundation-object"]),
    );
    assert.equal((await adapter.head(tenantId, ref)).size, 17);
    const stream = await adapter.getStream(tenantId, ref);
    const chunks: Buffer[] = [];
    for await (const chunk of stream) chunks.push(Buffer.from(chunk));
    assert.equal(Buffer.concat(chunks).toString(), "foundation-object");
    await adapter.setLifecycle(ref, { state: "recoverable" });
    const signed = await adapter.sign(
      tenantId,
      ref,
      "GET",
      "foundation-test",
      300,
    );
    assert.match(signed, /^http:\/\/127\.0\.0\.1:9000/);
    await assert.rejects(
      () => adapter.head("019b76da-a800-7000-8000-000000000002", ref),
      /STORAGE_NOT_FOUND/,
    );
    await assert.rejects(
      () => adapter.sign(tenantId, ref, "GET", "test", 301),
      /STORAGE_SIGN_SCOPE_INVALID/,
    );
    await adapter.delete(tenantId, ref);
    await assert.rejects(
      () => adapter.head(tenantId, ref),
      /STORAGE_NOT_FOUND/,
    );
    const compatibleAdapter = storage(R2Storage);
    assert.deepEqual(await compatibleAdapter.health(), { ready: true });
    const compatibleRef = await compatibleAdapter.put(
      tenantId,
      Readable.from(["r2-compatible"]),
    );
    assert.equal(
      (await compatibleAdapter.head(tenantId, compatibleRef)).size,
      13,
    );
    await compatibleAdapter.delete(tenantId, compatibleRef);
  },
);
