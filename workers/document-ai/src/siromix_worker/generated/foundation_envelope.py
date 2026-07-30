# Generated from packages/contracts/schemas/envelope-1.0.json. Do not edit.
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
    payload_version: str = Field(alias="payloadVersion", pattern=r"^[0-9]+\.[0-9]+$")
    traceparent: str | None = Field(default=None, max_length=128)


def supports_version(version: str) -> bool:
    return version == "1.0"
