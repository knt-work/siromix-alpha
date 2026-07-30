from datetime import UTC, datetime

from pydantic import ValidationError

import pytest

from siromix_worker.main import (
    PythonFoundationSmokeWorkflow,
    load_config,
    python_foundation_smoke,
)
from siromix_worker.generated.foundation_envelope import (
    FoundationEnvelope,
    supports_version,
)
from siromix_worker.observability import redact


def test_worker_uses_versioned_foundation_queue(monkeypatch):
    monkeypatch.setenv("SIROMIX_ENV", "test")
    config = load_config()
    assert config.environment == "test"
    assert config.task_queue == "siro-test-foundation-python-v1"
    assert config.identity == "foundation-python-worker"
    assert PythonFoundationSmokeWorkflow.__temporal_workflow_definition
    assert python_foundation_smoke.__temporal_activity_definition


def test_worker_rejects_wrong_queue_or_identity(monkeypatch):
    monkeypatch.setenv("SIROMIX_ENV", "test")
    monkeypatch.setenv("TEMPORAL_TASK_QUEUE", "siro-test-wrong-v1")
    with pytest.raises(ValueError, match="WORKER_REGISTRATION_REJECTED"):
        load_config()


def test_python_boundary_accepts_content_free_foundation_envelope():
    envelope = FoundationEnvelope(
        schema_version="1.0",
        id="019b76da-a800-7000-8000-000000000000",
        correlation_id="019b76da-a800-7000-8000-000000000001",
        causation_id="019b76da-a800-7000-8000-000000000002",
        occurred_at=datetime(2026, 1, 1, tzinfo=UTC),
        payload_type="foundation.smoke",
        payload_version="1.0",
    )
    assert envelope.occurred_at.tzinfo is UTC
    assert supports_version("1.0")
    assert not supports_version("1.1")
    assert not supports_version("2.0")


def test_python_boundary_rejects_unauthoritative_contract_version():
    with pytest.raises(ValidationError, match="literal_error"):
        FoundationEnvelope(
            schema_version="1.1",
            id="019b76da-a800-7000-8000-000000000000",
            correlation_id="019b76da-a800-7000-8000-000000000001",
            causation_id="019b76da-a800-7000-8000-000000000002",
            occurred_at=datetime.now(UTC),
            payload_type="foundation.smoke",
            payload_version="1.0",
        )


def test_python_boundary_rejects_unknown_fields():
    try:
        FoundationEnvelope(
            schema_version="1.0",
            id="019b76da-a800-7000-8000-000000000000",
            correlation_id="019b76da-a800-7000-8000-000000000001",
            causation_id="019b76da-a800-7000-8000-000000000002",
            occurred_at=datetime.now(UTC),
            payload_type="foundation.smoke",
            payload_version="1.0",
            secret="must-not-" + "cross-boundary",
        )
    except ValidationError as error:
        assert "extra_forbidden" in str(error)
    else:
        raise AssertionError("unknown field was accepted")


def test_python_telemetry_redacts_keys_and_embedded_credentials():
    value = redact(
        {
            "correlationId": "safe",
            "prompt": "private prompt",
            "safeUrl": "https://objects.test/file?token=marker",
            "safeCredential": "Bearer token-marker",
        }
    )
    serialized = str(value)
    assert value["correlationId"] == "safe"
    assert "private prompt" not in serialized
    assert "marker" not in serialized
