import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from siromix_worker.contract_conformance import main as run_contract_conformance
from siromix_worker.generated.docx_ingestion import (
    CanonicalDocument,
    IngestionHandoff,
    IngestionIssue,
    supports_canonical_document_version,
)


ROOT = Path(__file__).parents[3]
FIXTURES = ROOT / "packages" / "docx-ingestion-contracts" / "fixtures"


def fixture(name: str) -> dict[str, object]:
    return json.loads((FIXTURES / name).read_text(encoding="utf-8"))


def test_di_002_worker_accepts_published_canonical_fixture() -> None:
    document = CanonicalDocument.model_validate(
        fixture("canonical-document-1.0.minimal.valid.json")
    )
    assert document.schema_version == "1.0"


def test_di_002_worker_handoff_is_success_only_and_strict() -> None:
    handoff = fixture("handoff-1.0.minimal.valid.json")
    assert IngestionHandoff.model_validate(handoff).status == "SUCCEEDED"
    handoff["status"] = "CANCELLED"
    with pytest.raises(ValidationError):
        IngestionHandoff.model_validate(handoff)


def test_di_002_worker_rejects_unknown_versions_and_fields() -> None:
    document = fixture("canonical-document-1.0.minimal.valid.json")
    document["temporaryPath"] = "C:/tmp/source.docx"
    with pytest.raises(ValidationError):
        CanonicalDocument.model_validate(document)
    assert supports_canonical_document_version("1.0")
    assert not supports_canonical_document_version("2.0")


def test_di_002_worker_matches_shared_conformance_corpus() -> None:
    run_contract_conformance()


def test_di_003_worker_accepts_the_stable_issue_taxonomy() -> None:
    taxonomy = json.loads(
        (
            ROOT
            / "packages"
            / "docx-ingestion-contracts"
            / "compatibility"
            / "issue-taxonomy-1.0.json"
        ).read_text(encoding="utf-8")
    )
    assert taxonomy["ambiguousSeverityPolicy"] == "BLOCKING_ERROR"
    for entry in taxonomy["entries"]:
        issue = {
            "issueId": f"issue:{entry['code'].lower()}",
            **entry,
            "parserVersion": "1.0.0",
            "schemaVersion": "1.0",
            "canonicalizationConfigVersion": "1.0.0",
        }
        assert IngestionIssue.model_validate(issue).code == entry["code"]


def test_di_003_worker_rejects_unknown_issue_codes() -> None:
    issue = {
        "issueId": "issue:unknown",
        "code": "UNSPECIFIED_FAILURE",
        "severity": "BLOCKING_ERROR",
        "category": "CONTENT",
        "safeSummary": "The document could not be processed safely.",
        "downstreamPermitted": False,
        "retryability": "NOT_RETRYABLE",
        "terminal": True,
        "preservedWork": "COMMITTED_STAGES_PRESERVED",
        "recommendedAction": "CONTACT_SUPPORT",
        "parserVersion": "1.0.0",
        "schemaVersion": "1.0",
        "canonicalizationConfigVersion": "1.0.0",
    }
    with pytest.raises(ValidationError):
        IngestionIssue.model_validate(issue)
