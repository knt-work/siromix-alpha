import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const schemaPath = resolve(
  root,
  "packages/contracts/schemas/envelope-1.0.json",
);
const source = JSON.parse(readFileSync(schemaPath, "utf8"));
const generatedDirectory = resolve(root, "packages/contracts/generated");
const pythonDirectory = resolve(
  root,
  "workers/document-ai/src/siromix_worker/generated",
);
mkdirSync(generatedDirectory, { recursive: true });
mkdirSync(pythonDirectory, { recursive: true });

const outputs = new Map([
  [
    resolve(generatedDirectory, "manifest.json"),
    JSON.stringify(
      {
        source: source.$id,
        schemaVersion: source.properties.schemaVersion.const,
        supportedReaderVersions: ["1.0"],
        generated: [
          "foundation-envelope.ts",
          "foundation_envelope.py",
          "openapi.json",
        ],
      },
      null,
      2,
    ) + "\n",
  ],
  [
    resolve(generatedDirectory, "foundation-envelope.ts"),
    `// Generated from schemas/envelope-1.0.json. Do not edit.
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
  payloadVersion: z.string().regex(/^[0-9]+\\.[0-9]+$/),
  traceparent: z.string().max(128).optional(),
}).strict();

export type FoundationEnvelope = z.infer<typeof foundationEnvelopeSchema>;
export const supportsVersion = (version: string): boolean =>
  version === "1.0";
`,
  ],
  [
    resolve(pythonDirectory, "__init__.py"),
    `# Generated package marker. Do not edit.\n`,
  ],
  [
    resolve(pythonDirectory, "foundation_envelope.py"),
    `# Generated from packages/contracts/schemas/envelope-1.0.json. Do not edit.
from datetime import datetime
from typing import Literal
from uuid import UUID

from pydantic import BaseModel, ConfigDict, Field


class FoundationEnvelope(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True)
    schema_version: Literal["1.0"] = Field(alias="schemaVersion")
    id: UUID
    tenant_id: UUID | None = Field(default=None, alias="tenantId")
    actor_id: UUID | None = Field(default=None, alias="actorId")
    correlation_id: UUID = Field(alias="correlationId")
    causation_id: UUID = Field(alias="causationId")
    idempotency_key: str | None = Field(
        default=None, alias="idempotencyKey", min_length=1, max_length=200
    )
    occurred_at: datetime = Field(alias="occurredAt")
    payload_type: str = Field(alias="payloadType", pattern=r"^[a-z][a-z0-9.-]+$")
    payload_version: str = Field(alias="payloadVersion", pattern=r"^[0-9]+\\.[0-9]+$")
    traceparent: str | None = Field(default=None, max_length=128)


def supports_version(version: str) -> bool:
    return version == "1.0"
`,
  ],
  [
    resolve(generatedDirectory, "openapi.json"),
    JSON.stringify(
      {
        openapi: "3.1.0",
        info: { title: "SiroMix Shared Foundation API", version: "1.0.0" },
        paths: {},
        components: { schemas: { FoundationEnvelope: source } },
      },
      null,
      2,
    ) + "\n",
  ],
]);

if (process.argv.includes("--check")) {
  for (const [output, generated] of outputs)
    if (!existsSync(output) || readFileSync(output, "utf8") !== generated)
      throw new Error(`CONTRACT_DRIFT: ${output.slice(root.length + 1)}`);
} else {
  for (const [output, generated] of outputs) writeFileSync(output, generated);
}
