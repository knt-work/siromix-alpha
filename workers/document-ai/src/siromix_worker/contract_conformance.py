"""Run the shared DOCX ingestion fixture corpus through Pydantic readers."""

from __future__ import annotations

import copy
import json
from pathlib import Path
from typing import Any, get_args

from pydantic import ValidationError

from siromix_worker.generated.docx_ingestion import (
    CanonicalDocument,
    IngestionAttemptContract,
    IngestionHandoff,
    IngestionIssue,
)


REPOSITORY_ROOT = Path(__file__).parents[4]
FIXTURES = REPOSITORY_ROOT / "packages" / "docx-ingestion-contracts" / "fixtures"
COMPATIBILITY = (
    REPOSITORY_ROOT / "packages" / "docx-ingestion-contracts" / "compatibility"
)
READERS = {
    "canonicalDocument": CanonicalDocument,
    "ingestionAttempt": IngestionAttemptContract,
    "ingestionHandoff": IngestionHandoff,
}


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def mutate(source: Any, mutations: list[dict[str, Any]]) -> Any:
    value = copy.deepcopy(source)
    for mutation in mutations:
        segments = [
            segment.replace("~1", "/").replace("~0", "~")
            for segment in mutation["path"].split("/")[1:]
        ]
        parent = value
        for segment in segments[:-1]:
            parent = (
                parent[int(segment)] if isinstance(parent, list) else parent[segment]
            )
        key = segments[-1]
        if mutation["op"] == "delete":
            if isinstance(parent, list):
                parent.pop(int(key))
            else:
                del parent[key]
        elif isinstance(parent, list):
            parent[int(key)] = mutation.get("value")
        else:
            parent[key] = mutation.get("value")
    return value


def main() -> None:
    taxonomy = read_json(COMPATIBILITY / "issue-taxonomy-1.0.json")
    taxonomy_codes = tuple(entry["code"] for entry in taxonomy["entries"])
    python_codes = get_args(IngestionIssue.model_fields["code"].annotation)
    if taxonomy_codes != python_codes:
        raise RuntimeError("PYDANTIC_ISSUE_TAXONOMY_DRIFT")
    for entry in taxonomy["entries"]:
        if entry["downstreamPermitted"] != (entry["severity"] == "WARNING"):
            raise RuntimeError(f"PYDANTIC_ISSUE_POLICY:{entry['code']}")
    taxonomy_manifest = read_json(
        FIXTURES / "issue-taxonomy-conformance-cases.json"
    )
    if taxonomy_manifest["taxonomyVersion"] != taxonomy["version"]:
        raise RuntimeError("PYDANTIC_ISSUE_CONFORMANCE_VERSION")
    for entry in taxonomy["entries"]:
        issue = {
            "issueId": "issue:taxonomy",
            **entry,
            "parserVersion": "1.0.0",
            "schemaVersion": "1.0",
            "canonicalizationConfigVersion": "1.0.0",
        }
        IngestionIssue.model_validate(issue)
        for field in taxonomy_manifest["fields"]:
            invalid_value = next(
                candidate
                for candidate in field["alternatives"]
                if candidate != issue[field["name"]]
            )
            invalid_issue = {**issue, field["name"]: invalid_value}
            try:
                IngestionIssue.model_validate(invalid_issue)
            except ValidationError:
                continue
            raise RuntimeError(
                f"PYDANTIC_ISSUE_MAPPING:{entry['code']}:{field['name']}"
            )

    manifest = read_json(FIXTURES / "conformance-cases.json")
    if manifest["schemaVersion"] != "1.0":
        raise RuntimeError("UNSUPPORTED_CONFORMANCE_MANIFEST")
    for case in manifest["cases"]:
        payload = mutate(
            read_json(FIXTURES / case["file"]),
            case.get("mutations", []),
        )
        try:
            READERS[case["contract"]].model_validate(payload)
            valid = True
        except ValidationError:
            valid = False
        if valid != case["valid"]:
            raise RuntimeError(f"PYDANTIC_CONFORMANCE:{case['name']}")
    print(
        json.dumps(
            {
                "status": "passed",
                "schemaVersion": manifest["schemaVersion"],
                "cases": len(manifest["cases"]),
                "taxonomyCases": len(taxonomy["entries"])
                * len(taxonomy_manifest["fields"]),
            }
        )
    )


if __name__ == "__main__":
    main()
