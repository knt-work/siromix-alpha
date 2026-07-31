import hashlib
import io
import zipfile
from dataclasses import replace
from datetime import UTC, datetime, timedelta

import pytest

import siromix_worker.source_validation as validation
from siromix_worker.source_validation import (
    DOCX_MIME,
    MAX_BINARY_ASSET_BYTES,
    MAX_INTERNAL_PATH,
    MAX_SOURCE_BYTES,
    IngestionSourceCommand,
    MalwareScanResult,
    SourceFileMetadata,
    SourceValidationError,
    validate_and_record,
)


NOW = datetime(2026, 7, 31, 12, tzinfo=UTC)
CONTENT_TYPES = (
    '<?xml version="1.0"?>'
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
    '<Override PartName="/word/document.xml" '
    f'ContentType="{validation._MAIN_DOCUMENT_CONTENT_TYPE}"/>'
    "</Types>"
).encode()
ROOT_RELS = (
    '<?xml version="1.0"?>'
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
    '<Relationship Id="rId1" '
    f'Type="{validation._OFFICE_DOCUMENT_RELATIONSHIP}" '
    'Target="word/document.xml"/>'
    "</Relationships>"
).encode()
DOCUMENT = (
    '<?xml version="1.0"?>'
    '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
    "<w:body><w:p><w:r><w:t>Safe</w:t></w:r></w:p></w:body></w:document>"
).encode()


def docx(extra: dict[str, bytes] | None = None) -> bytes:
    parts = {
        "[Content_Types].xml": CONTENT_TYPES,
        "_rels/.rels": ROOT_RELS,
        "word/document.xml": DOCUMENT,
        **(extra or {}),
    }
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        for name, content in parts.items():
            package.writestr(name, content)
    return output.getvalue()


class Scanner:
    def __init__(
        self,
        verdict: str = "CLEAN",
        signature_updated_at: datetime | None = NOW,
        raises: Exception | None = None,
    ):
        self.verdict = verdict
        self.signature_updated_at = signature_updated_at
        self.raises = raises
        self.calls = 0
        self.timeout_seconds = 0

    def scan(self, content: bytes, *, timeout_seconds: int) -> MalwareScanResult:
        self.calls += 1
        self.timeout_seconds = timeout_seconds
        if self.raises:
            raise self.raises
        return MalwareScanResult(
            verdict=self.verdict,  # type: ignore[arg-type]
            scanner="clamav-instream",
            signature_updated_at=self.signature_updated_at,
            reference="scan:test",
        )


class Store:
    def __init__(self):
        self.results = []

    def save(self, result):
        self.results.append(result)


def command(content: bytes) -> IngestionSourceCommand:
    return IngestionSourceCommand(
        tenant_id="tenant:1",
        workflow_id="workflow:1",
        source_document_version_id="source:1",
        correlation_id="correlation:1",
        idempotency_key="ingest:1",
        actor_tenant_id="tenant:1",
        actor_role="teacher",
        files=(
            SourceFileMetadata(
                filename="exam.docx",
                declared_mime_type=DOCX_MIME,
                expected_byte_size=len(content),
                private_object_reference="tenants/1/source.docx",
            ),
        ),
    )


def validate(
    content: bytes,
    *,
    source_command: IngestionSourceCommand | None = None,
    scanner: Scanner | None = None,
):
    result_store = Store()
    malware_scanner = scanner or Scanner()
    result = validate_and_record(
        source_command or command(content),
        (content[index : index + 97] for index in range(0, len(content), 97)),
        malware_scanner,
        result_store,
        now=NOW,
    )
    assert result_store.results == [result]
    return result, malware_scanner


def assert_blocked(content: bytes, reason: str, **kwargs):
    result, scanner = validate(content, **kwargs)
    assert result.status == "BLOCKED"
    assert result.reason_code == reason
    return result, scanner


def test_di_004_accepts_one_authorized_docx_and_records_hash() -> None:
    content = docx()
    result, scanner = validate(content)
    assert result.status == "VALID"
    assert result.detected_mime_type == DOCX_MIME
    assert result.byte_size == len(content)
    assert result.content_hash == hashlib.sha256(content).hexdigest()
    assert result.malware_verdict == "CLEAN"
    assert scanner.calls == 1
    assert scanner.timeout_seconds == 10


@pytest.mark.parametrize(
    ("change", "reason"),
    [
        ({"files": ()}, "SOURCE_FILE_COUNT_INVALID"),
        (
            {
                "files": (
                    SourceFileMetadata("a.docx", DOCX_MIME, 1, "private/a"),
                    SourceFileMetadata("b.docx", DOCX_MIME, 1, "private/b"),
                )
            },
            "SOURCE_FILE_COUNT_INVALID",
        ),
        (
            {"files": (SourceFileMetadata("exam.pdf", DOCX_MIME, 1, "private/a"),)},
            "SOURCE_EXTENSION_INVALID",
        ),
        (
            {
                "files": (
                    SourceFileMetadata("exam.docx", "application/zip", 1, "private/a"),
                )
            },
            "SOURCE_DECLARED_TYPE_INVALID",
        ),
    ],
)
def test_di_004_rejects_file_count_extension_and_declared_type(change, reason) -> None:
    content = docx()
    source_command = replace(command(content), **change)
    with pytest.raises(SourceValidationError, match=reason):
        validate_and_record(source_command, [content], Scanner(), Store(), now=NOW)


def test_di_004_rejects_unauthorized_or_cross_tenant_before_scan() -> None:
    content = docx()
    scanner = Scanner()
    for source_command in (
        replace(command(content), actor_role="tenant-admin"),
        replace(command(content), actor_tenant_id="tenant:other"),
    ):
        with pytest.raises(SourceValidationError, match="ACCESS_DENIED"):
            validate_and_record(source_command, [content], scanner, Store(), now=NOW)
    assert scanner.calls == 0


def test_di_004_enforces_inclusive_source_size_and_metadata_match(
    monkeypatch,
) -> None:
    monkeypatch.setattr(validation, "_validate_package", lambda _content: DOCX_MIME)
    exact = b"x" * MAX_SOURCE_BYTES
    result, _ = validate(exact)
    assert result.status == "VALID"
    oversized = exact + b"x"
    source_command = command(exact)
    blocked, scanner = assert_blocked(
        oversized, "SOURCE_SIZE_INVALID", source_command=source_command
    )
    assert blocked.byte_size == MAX_SOURCE_BYTES + 1
    assert scanner.calls == 0
    mismatch, _ = assert_blocked(
        exact, "SOURCE_SIZE_MISMATCH", source_command=command(b"x")
    )
    assert mismatch.byte_size == MAX_SOURCE_BYTES


@pytest.mark.parametrize(
    ("verdict", "signature_time", "reason"),
    [
        ("INFECTED", NOW, "MALWARE_DETECTED"),
        ("UNKNOWN", NOW, "MALWARE_SCAN_FAILED_CLOSED"),
        ("UNAVAILABLE", NOW, "MALWARE_SCAN_FAILED_CLOSED"),
        ("TIMEOUT", NOW, "MALWARE_SCAN_FAILED_CLOSED"),
        ("ERROR", NOW, "MALWARE_SCAN_FAILED_CLOSED"),
        (
            "CLEAN",
            NOW - timedelta(hours=24, microseconds=1),
            "MALWARE_SCAN_FAILED_CLOSED",
        ),
        ("CLEAN", None, "MALWARE_SCAN_FAILED_CLOSED"),
    ],
)
def test_di_004_malware_gate_fails_closed(verdict, signature_time, reason) -> None:
    assert_blocked(
        docx(),
        reason,
        scanner=Scanner(verdict=verdict, signature_updated_at=signature_time),
    )


def test_di_004_scanner_exception_fails_closed_and_is_recorded() -> None:
    result, _ = assert_blocked(
        docx(),
        "MALWARE_SCAN_FAILED_CLOSED",
        scanner=Scanner(raises=TimeoutError()),
    )
    assert result.issue_code == "SECURITY_VALIDATION_FAILED"


@pytest.mark.parametrize(
    ("content", "reason"),
    [
        (b"not-a-zip", "SOURCE_DETECTED_TYPE_INVALID"),
        (docx({"../escape.xml": b"<x/>"}), "ARCHIVE_PATH_INVALID"),
        (docx({"nested.zip": b"PK\x03\x04unsafe"}), "NESTED_ARCHIVE_REJECTED"),
        (docx({"word/vbaProject.bin": b"macro"}), "ACTIVE_CONTENT_REJECTED"),
        (
            docx(
                {
                    "word/document.xml": b'<!DOCTYPE x [<!ENTITY e SYSTEM "file:///x">]><x>&e;</x>'
                }
            ),
            "XML_ACTIVE_CONTENT_REJECTED",
        ),
    ],
)
def test_di_004_rejects_disguised_and_active_packages(content, reason) -> None:
    assert_blocked(content, reason)


def test_di_004_rejects_missing_parts_and_external_relationships() -> None:
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as package:
        package.writestr("[Content_Types].xml", CONTENT_TYPES)
        package.writestr("_rels/.rels", ROOT_RELS)
    assert_blocked(output.getvalue(), "PACKAGE_REQUIRED_PART_MISSING")
    external = (
        '<?xml version="1.0"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" '
        f'Type="{validation._OFFICE_DOCUMENT_RELATIONSHIP}" '
        'Target="https://example.invalid/document.xml" TargetMode="External"/>'
        "</Relationships>"
    ).encode()
    assert_blocked(
        docx({"_rels/.rels": external}),
        "PACKAGE_MAIN_RELATIONSHIP_MISSING",
    )


def test_di_004_enforces_exact_security_profile_boundaries(monkeypatch) -> None:
    assert validation.MAX_ZIP_ENTRIES == 2_000
    assert validation.MAX_EXPANDED_BYTES == 100 * 1024 * 1024
    assert validation.MAX_COMPRESSION_RATIO == 100
    assert MAX_INTERNAL_PATH == 512
    assert validation.MAX_XML_PART_BYTES == 20 * 1024 * 1024
    assert validation.MAX_XML_DEPTH == 64
    assert validation.MAX_XML_NODES_PER_PART == 250_000
    assert validation.MAX_XML_NODES_PER_PACKAGE == 1_000_000
    assert MAX_BINARY_ASSET_BYTES == 10 * 1024 * 1024
    assert validation.MAX_SCAN_BYTES == 12 * 1024 * 1024

    monkeypatch.setattr(validation, "MAX_ZIP_ENTRIES", 4)
    assert validate(docx({"safe.xml": b"<x/>"}))[0].status == "VALID"
    assert_blocked(
        docx({"safe.xml": b"<x/>", "extra.xml": b"<x/>"}),
        "ARCHIVE_ENTRY_LIMIT_EXCEEDED",
    )
    monkeypatch.setattr(validation, "MAX_ZIP_ENTRIES", 2_000)

    valid_path = "a" * (MAX_INTERNAL_PATH - 4) + ".xml"
    assert validate(docx({valid_path: b"<x/>"}))[0].status == "VALID"
    invalid_path = "a" * (MAX_INTERNAL_PATH - 3) + ".xml"
    assert_blocked(docx({invalid_path: b"<x/>"}), "ARCHIVE_PATH_INVALID")

    monkeypatch.setattr(validation, "MAX_XML_DEPTH", 3)
    assert validation._inspect_xml(b"<a><b><c/></b></a>") == 3
    with pytest.raises(SourceValidationError, match="XML_DEPTH_EXCEEDED"):
        validation._inspect_xml(b"<a><b><c><d/></c></b></a>")

    monkeypatch.setattr(validation, "MAX_XML_NODES_PER_PART", 3)
    assert validation._inspect_xml(b"<a><b/><c/></a>") == 3
    with pytest.raises(SourceValidationError, match="XML_NODE_LIMIT_EXCEEDED"):
        validation._inspect_xml(b"<a><b/><c/><d/></a>")


def test_di_004_enforces_archive_xml_and_asset_limits_inclusively(
    monkeypatch,
) -> None:
    content = docx(
        {
            "safe.xml": b"<a><b/><c/></a>",
            "word/media/image.bin": bytes(range(256)) * 2,
        }
    )
    with zipfile.ZipFile(io.BytesIO(content)) as package:
        entries = package.infolist()
        expanded = sum(entry.file_size for entry in entries)
        largest_xml = max(
            entry.file_size
            for entry in entries
            if entry.filename.lower().endswith((".xml", ".rels"))
        )
        total_nodes = sum(
            validation._inspect_xml(package.read(entry))
            for entry in entries
            if entry.filename.lower().endswith((".xml", ".rels"))
        )

    monkeypatch.setattr(validation, "MAX_EXPANDED_BYTES", expanded)
    assert validate(content)[0].status == "VALID"
    monkeypatch.setattr(validation, "MAX_EXPANDED_BYTES", expanded - 1)
    assert_blocked(content, "ARCHIVE_EXPANDED_SIZE_EXCEEDED")
    monkeypatch.setattr(validation, "MAX_EXPANDED_BYTES", 100 * 1024 * 1024)

    monkeypatch.setattr(validation, "MAX_XML_PART_BYTES", largest_xml)
    assert validate(content)[0].status == "VALID"
    monkeypatch.setattr(validation, "MAX_XML_PART_BYTES", largest_xml - 1)
    assert_blocked(content, "XML_PART_SIZE_EXCEEDED")
    monkeypatch.setattr(validation, "MAX_XML_PART_BYTES", 20 * 1024 * 1024)

    monkeypatch.setattr(validation, "MAX_XML_NODES_PER_PACKAGE", total_nodes)
    assert validate(content)[0].status == "VALID"
    monkeypatch.setattr(validation, "MAX_XML_NODES_PER_PACKAGE", total_nodes - 1)
    assert_blocked(content, "XML_PACKAGE_NODE_LIMIT_EXCEEDED")
    monkeypatch.setattr(validation, "MAX_XML_NODES_PER_PACKAGE", 1_000_000)

    monkeypatch.setattr(validation, "MAX_BINARY_ASSET_BYTES", 512)
    assert validate(content)[0].status == "VALID"
    monkeypatch.setattr(validation, "MAX_BINARY_ASSET_BYTES", 511)
    assert_blocked(content, "ASSET_SIZE_EXCEEDED")


def test_di_004_rejects_encrypted_and_truncated_archives() -> None:
    encrypted = bytearray(docx())
    local = encrypted.find(b"PK\x03\x04")
    central = encrypted.find(b"PK\x01\x02")
    assert local >= 0 and central >= 0
    encrypted[local + 6 : local + 8] = (
        int.from_bytes(encrypted[local + 6 : local + 8], "little") | 1
    ).to_bytes(2, "little")
    encrypted[central + 8 : central + 10] = (
        int.from_bytes(encrypted[central + 8 : central + 10], "little") | 1
    ).to_bytes(2, "little")
    assert_blocked(bytes(encrypted), "ARCHIVE_ENCRYPTED")
    assert_blocked(docx()[:-20], "ARCHIVE_CORRUPT")


def test_di_004_rejects_compression_bombs_macros_and_symlinks() -> None:
    assert_blocked(
        docx({"word/media/repeated.bin": b"x" * 100_000}),
        "ARCHIVE_COMPRESSION_RATIO_EXCEEDED",
    )
    macro_types = CONTENT_TYPES.replace(
        validation._MAIN_DOCUMENT_CONTENT_TYPE.encode(),
        b"application/vnd.ms-word.document.macroEnabled.main+xml",
    )
    assert_blocked(
        docx({"[Content_Types].xml": macro_types}),
        "MACRO_ENABLED_PACKAGE_REJECTED",
    )

    output = io.BytesIO()
    with zipfile.ZipFile(output, "w") as package:
        package.writestr("[Content_Types].xml", CONTENT_TYPES)
        package.writestr("_rels/.rels", ROOT_RELS)
        package.writestr("word/document.xml", DOCUMENT)
        link = zipfile.ZipInfo("word/media/link")
        link.create_system = 3
        link.external_attr = 0o120777 << 16
        package.writestr(link, b"target")
    assert_blocked(output.getvalue(), "ARCHIVE_SYMLINK_REJECTED")


@pytest.mark.parametrize(
    "content_types",
    [
        (
            '<Types xmlns="urn:not-opc">'
            '<Override PartName="/word/document.xml" '
            f'ContentType="{validation._MAIN_DOCUMENT_CONTENT_TYPE}"/>'
            "</Types>"
        ),
        (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            f'<Default Extension="xml" ContentType="{validation._MAIN_DOCUMENT_CONTENT_TYPE}"/>'
            "</Types>"
        ),
        (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/word/document.xml" ContentType="application/xml"/>'
            "</Types>"
        ),
        (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Override PartName="/word/document.xml" '
            f'ContentType="{validation._MAIN_DOCUMENT_CONTENT_TYPE}"/>'
            '<Override PartName="/word/document.xml" '
            f'ContentType="{validation._MAIN_DOCUMENT_CONTENT_TYPE}"/>'
            "</Types>"
        ),
        (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            f"<!-- {validation._MAIN_DOCUMENT_CONTENT_TYPE} -->"
            "</Types>"
        ),
    ],
)
def test_di_004_rejects_invalid_or_spoofed_opc_content_types(
    content_types: str,
) -> None:
    assert_blocked(
        docx({"[Content_Types].xml": content_types.encode()}),
        "PACKAGE_MAIN_CONTENT_TYPE_INVALID",
    )
    assert_blocked(
        docx({"[Content_Types].xml": b"<Types"}),
        "XML_MALFORMED",
    )
