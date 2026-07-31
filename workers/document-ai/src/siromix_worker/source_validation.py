"""Secure pre-parser validation for DOCX ingestion (DI-004)."""

from __future__ import annotations

import hashlib
import io
import re
import zipfile
from dataclasses import dataclass
from datetime import UTC, datetime, timedelta
from pathlib import PurePosixPath
from typing import Iterable, Literal, NoReturn, Protocol
from xml.etree import ElementTree
from xml.parsers import expat


DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
MAX_SOURCE_BYTES = 10 * 1024 * 1024
MAX_SCAN_BYTES = 12 * 1024 * 1024
MAX_ZIP_ENTRIES = 2_000
MAX_EXPANDED_BYTES = 100 * 1024 * 1024
MAX_COMPRESSION_RATIO = 100
MAX_INTERNAL_PATH = 512
MAX_XML_PART_BYTES = 20 * 1024 * 1024
MAX_XML_DEPTH = 64
MAX_XML_NODES_PER_PART = 250_000
MAX_XML_NODES_PER_PACKAGE = 1_000_000
MAX_BINARY_ASSET_BYTES = 10 * 1024 * 1024
MAX_SIGNATURE_AGE = timedelta(hours=24)

_REQUIRED_PARTS = frozenset({"[Content_Types].xml", "_rels/.rels", "word/document.xml"})
_ACTIVE_PREFIXES = ("word/activex/", "word/embeddings/", "customui/")
_ARCHIVE_SUFFIXES = (".zip", ".7z", ".rar", ".tar", ".gz", ".bz2", ".xz")
_MACRO_MARKERS = ("macroenabled", "vbaproject", "vbadata")
_RELATIONSHIP_NS = "http://schemas.openxmlformats.org/package/2006/relationships"
_CONTENT_TYPES_NS = "http://schemas.openxmlformats.org/package/2006/content-types"
_OFFICE_DOCUMENT_RELATIONSHIP = (
    "http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument"
)
_MAIN_DOCUMENT_CONTENT_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"
)


class SourceValidationError(ValueError):
    def __init__(self, issue_code: str, reason_code: str):
        super().__init__(reason_code)
        self.issue_code = issue_code
        self.reason_code = reason_code


@dataclass(frozen=True)
class SourceFileMetadata:
    filename: str
    declared_mime_type: str
    expected_byte_size: int
    private_object_reference: str


@dataclass(frozen=True)
class IngestionSourceCommand:
    tenant_id: str
    workflow_id: str
    source_document_version_id: str
    correlation_id: str
    idempotency_key: str
    actor_tenant_id: str
    actor_role: Literal["teacher", "tenant-admin", "platform-support"]
    files: tuple[SourceFileMetadata, ...]


@dataclass(frozen=True)
class MalwareScanResult:
    verdict: Literal["CLEAN", "INFECTED", "UNKNOWN", "UNAVAILABLE", "TIMEOUT", "ERROR"]
    scanner: str
    signature_updated_at: datetime | None
    reference: str


class MalwareScanner(Protocol):
    def scan(self, content: bytes, *, timeout_seconds: int) -> MalwareScanResult: ...


@dataclass(frozen=True)
class SourceValidationResult:
    source_document_version_id: str
    tenant_id: str
    workflow_id: str
    correlation_id: str
    private_object_reference: str
    original_filename: str
    declared_mime_type: str
    status: Literal["VALID", "BLOCKED"]
    issue_code: str | None
    reason_code: str | None
    detected_mime_type: str | None
    byte_size: int
    content_hash: str
    malware_verdict: str | None
    malware_reference: str | None
    validated_at: datetime


class ValidationResultStore(Protocol):
    def save(self, result: SourceValidationResult) -> None: ...


def _reject(reason_code: str, *, security: bool = False) -> NoReturn:
    raise SourceValidationError(
        "SECURITY_VALIDATION_FAILED" if security else "SOURCE_VALIDATION_FAILED",
        reason_code,
    )


def _authorize(command: IngestionSourceCommand) -> SourceFileMetadata:
    if command.actor_tenant_id != command.tenant_id or command.actor_role != "teacher":
        raise SourceValidationError("SECURITY_VALIDATION_FAILED", "ACCESS_DENIED")
    if not all(
        (
            command.tenant_id,
            command.workflow_id,
            command.source_document_version_id,
            command.correlation_id,
            command.idempotency_key,
        )
    ):
        _reject("COMMAND_METADATA_INVALID")
    if len(command.files) != 1:
        _reject("SOURCE_FILE_COUNT_INVALID")
    source = command.files[0]
    if not source.private_object_reference:
        _reject("PRIVATE_OBJECT_REFERENCE_REQUIRED")
    if not source.filename.lower().endswith(".docx"):
        _reject("SOURCE_EXTENSION_INVALID")
    if source.declared_mime_type.lower() != DOCX_MIME:
        _reject("SOURCE_DECLARED_TYPE_INVALID")
    if source.expected_byte_size < 0 or source.expected_byte_size > MAX_SOURCE_BYTES:
        _reject("SOURCE_SIZE_INVALID")
    return source


def _read_source(chunks: Iterable[bytes]) -> tuple[bytes, str, bool]:
    content = bytearray()
    for chunk in chunks:
        if not isinstance(chunk, bytes):
            _reject("SOURCE_STREAM_INVALID")
        content.extend(chunk)
        if len(content) > MAX_SOURCE_BYTES:
            observed = bytes(content[: MAX_SOURCE_BYTES + 1])
            return observed, hashlib.sha256(observed).hexdigest(), True
    source = bytes(content)
    return source, hashlib.sha256(source).hexdigest(), False


def _safe_path(name: str) -> None:
    if not name or len(name) > MAX_INTERNAL_PATH or "\\" in name:
        _reject("ARCHIVE_PATH_INVALID", security=True)
    path = PurePosixPath(name)
    if path.is_absolute() or ".." in path.parts or re.match(r"^[A-Za-z]:", name):
        _reject("ARCHIVE_PATH_INVALID", security=True)


def _inspect_xml(data: bytes) -> int:
    if len(data) > MAX_XML_PART_BYTES:
        _reject("XML_PART_SIZE_EXCEEDED", security=True)
    lowered = data.lower()
    if b"<!doctype" in lowered or b"<!entity" in lowered or b"<xi:include" in lowered:
        _reject("XML_ACTIVE_CONTENT_REJECTED", security=True)
    parser = expat.ParserCreate(namespace_separator="}")
    depth = 0
    nodes = 0

    def start(name: str, _attributes: dict[str, str]) -> None:
        nonlocal depth, nodes
        depth += 1
        nodes += 1
        if depth > MAX_XML_DEPTH:
            _reject("XML_DEPTH_EXCEEDED", security=True)
        if nodes > MAX_XML_NODES_PER_PART:
            _reject("XML_NODE_LIMIT_EXCEEDED", security=True)
        if name == "http://www.w3.org/2001/XInclude}include":
            _reject("XML_ACTIVE_CONTENT_REJECTED", security=True)

    def end(_name: str) -> None:
        nonlocal depth
        depth -= 1

    def reject_declaration(*_args: object) -> None:
        _reject("XML_ACTIVE_CONTENT_REJECTED", security=True)

    parser.StartElementHandler = start
    parser.EndElementHandler = end
    parser.StartDoctypeDeclHandler = reject_declaration
    parser.EntityDeclHandler = reject_declaration
    parser.ExternalEntityRefHandler = lambda *_args: 0
    try:
        parser.Parse(data, True)
    except SourceValidationError:
        raise
    except expat.ExpatError:
        _reject("XML_MALFORMED")
    return nodes


def _validate_relationships(parts: dict[str, bytes]) -> None:
    try:
        root = ElementTree.fromstring(parts["_rels/.rels"])
    except ElementTree.ParseError:
        _reject("PACKAGE_RELATIONSHIPS_INVALID")
    relationships = list(root.findall(f"{{{_RELATIONSHIP_NS}}}Relationship"))
    if not any(
        relationship.attrib.get("Type") == _OFFICE_DOCUMENT_RELATIONSHIP
        and relationship.attrib.get("Target") == "word/document.xml"
        and relationship.attrib.get("TargetMode", "Internal") == "Internal"
        for relationship in relationships
    ):
        _reject("PACKAGE_MAIN_RELATIONSHIP_MISSING")
    for name, data in parts.items():
        if not name.endswith(".rels"):
            continue
        try:
            relation_root = ElementTree.fromstring(data)
        except ElementTree.ParseError:
            _reject("PACKAGE_RELATIONSHIPS_INVALID")
        for relationship in relation_root.findall(
            f"{{{_RELATIONSHIP_NS}}}Relationship"
        ):
            target = relationship.attrib.get("Target", "")
            if (
                relationship.attrib.get("TargetMode") == "External"
                or re.match(r"^[a-z][a-z0-9+.-]*:", target, re.IGNORECASE)
                or target.startswith(("/", "\\"))
                or ".." in PurePosixPath(target.replace("\\", "/")).parts
            ):
                _reject("EXTERNAL_RELATIONSHIP_REJECTED", security=True)


def _validate_content_types(data: bytes) -> None:
    try:
        root = ElementTree.fromstring(data)
    except ElementTree.ParseError:
        _reject("PACKAGE_MAIN_CONTENT_TYPE_INVALID")
    if root.tag != f"{{{_CONTENT_TYPES_NS}}}Types":
        _reject("PACKAGE_MAIN_CONTENT_TYPE_INVALID")
    main_overrides = [
        element
        for element in root
        if element.tag == f"{{{_CONTENT_TYPES_NS}}}Override"
        and element.attrib.get("PartName") == "/word/document.xml"
    ]
    if (
        len(main_overrides) != 1
        or main_overrides[0].attrib.get("ContentType") != _MAIN_DOCUMENT_CONTENT_TYPE
    ):
        _reject("PACKAGE_MAIN_CONTENT_TYPE_INVALID")


def _validate_package(content: bytes) -> str:
    if not content.startswith(b"PK\x03\x04"):
        _reject("SOURCE_DETECTED_TYPE_INVALID")
    try:
        with zipfile.ZipFile(io.BytesIO(content)) as package:
            entries = package.infolist()
            if len(entries) > MAX_ZIP_ENTRIES:
                _reject("ARCHIVE_ENTRY_LIMIT_EXCEEDED", security=True)
            total_expanded = 0
            total_compressed = 0
            names: set[str] = set()
            parts: dict[str, bytes] = {}
            xml_nodes = 0
            for entry in entries:
                _safe_path(entry.filename)
                if entry.filename in names:
                    _reject("ARCHIVE_DUPLICATE_ENTRY", security=True)
                names.add(entry.filename)
                if entry.flag_bits & 0x1:
                    _reject("ARCHIVE_ENCRYPTED", security=True)
                if (entry.external_attr >> 16) & 0o170000 == 0o120000:
                    _reject("ARCHIVE_SYMLINK_REJECTED", security=True)
                total_expanded += entry.file_size
                total_compressed += entry.compress_size
                if total_expanded > MAX_EXPANDED_BYTES:
                    _reject("ARCHIVE_EXPANDED_SIZE_EXCEEDED", security=True)
                if entry.file_size and (
                    entry.file_size / max(entry.compress_size, 1)
                    > MAX_COMPRESSION_RATIO
                ):
                    _reject("ARCHIVE_COMPRESSION_RATIO_EXCEEDED", security=True)
                lowered_name = entry.filename.lower()
                if lowered_name.endswith(_ARCHIVE_SUFFIXES):
                    _reject("NESTED_ARCHIVE_REJECTED", security=True)
                if lowered_name.startswith(_ACTIVE_PREFIXES) or any(
                    marker.lower() in lowered_name for marker in _MACRO_MARKERS
                ):
                    _reject("ACTIVE_CONTENT_REJECTED", security=True)
                if (
                    lowered_name.startswith("word/media/")
                    and entry.file_size > MAX_BINARY_ASSET_BYTES
                ):
                    _reject("ASSET_SIZE_EXCEEDED", security=True)
                if (
                    lowered_name.endswith((".xml", ".rels"))
                    and entry.file_size > MAX_XML_PART_BYTES
                ):
                    _reject("XML_PART_SIZE_EXCEEDED", security=True)
                data = package.read(entry)
                if data.startswith((b"PK\x03\x04", b"Rar!\x1a\x07", b"7z\xbc\xaf")):
                    _reject("NESTED_ARCHIVE_REJECTED", security=True)
                if lowered_name.endswith((".xml", ".rels")):
                    xml_nodes += _inspect_xml(data)
                    if xml_nodes > MAX_XML_NODES_PER_PACKAGE:
                        _reject("XML_PACKAGE_NODE_LIMIT_EXCEEDED", security=True)
                parts[entry.filename] = data
            if total_expanded and (
                total_expanded / max(total_compressed, 1) > MAX_COMPRESSION_RATIO
            ):
                _reject("ARCHIVE_COMPRESSION_RATIO_EXCEEDED", security=True)
    except SourceValidationError:
        raise
    except (zipfile.BadZipFile, EOFError, OSError, RuntimeError):
        _reject("ARCHIVE_CORRUPT")
    if not _REQUIRED_PARTS.issubset(parts):
        _reject("PACKAGE_REQUIRED_PART_MISSING")
    content_types = parts["[Content_Types].xml"]
    if any(
        marker.lower().encode() in content_types.lower() for marker in _MACRO_MARKERS
    ):
        _reject("MACRO_ENABLED_PACKAGE_REJECTED", security=True)
    _validate_content_types(content_types)
    _validate_relationships(parts)
    return DOCX_MIME


def validate_and_record(
    command: IngestionSourceCommand,
    chunks: Iterable[bytes],
    scanner: MalwareScanner,
    store: ValidationResultStore,
    *,
    now: datetime,
) -> SourceValidationResult:
    """Validate before parsing and persist exactly one safe validation result."""

    source = _authorize(command)
    content = b""
    content_hash = hashlib.sha256().hexdigest()
    malware: MalwareScanResult | None = None
    detected_type: str | None = None
    try:
        content, content_hash, oversized = _read_source(chunks)
        if oversized:
            _reject("SOURCE_SIZE_INVALID")
        if len(content) != source.expected_byte_size:
            _reject("SOURCE_SIZE_MISMATCH")
        if len(content) > MAX_SCAN_BYTES:
            _reject("MALWARE_STREAM_LIMIT_EXCEEDED", security=True)
        try:
            malware = scanner.scan(content, timeout_seconds=10)
        except Exception:
            _reject("MALWARE_SCAN_FAILED_CLOSED", security=True)
        if (
            malware.verdict != "CLEAN"
            or not malware.scanner
            or not malware.reference
            or malware.signature_updated_at is None
            or malware.signature_updated_at.tzinfo is None
            or now.astimezone(UTC) - malware.signature_updated_at.astimezone(UTC)
            > MAX_SIGNATURE_AGE
        ):
            _reject(
                "MALWARE_DETECTED"
                if malware.verdict == "INFECTED"
                else "MALWARE_SCAN_FAILED_CLOSED",
                security=True,
            )
        detected_type = _validate_package(content)
        result = SourceValidationResult(
            source_document_version_id=command.source_document_version_id,
            tenant_id=command.tenant_id,
            workflow_id=command.workflow_id,
            correlation_id=command.correlation_id,
            private_object_reference=source.private_object_reference,
            original_filename=source.filename,
            declared_mime_type=source.declared_mime_type,
            status="VALID",
            issue_code=None,
            reason_code=None,
            detected_mime_type=detected_type,
            byte_size=len(content),
            content_hash=content_hash,
            malware_verdict=malware.verdict,
            malware_reference=malware.reference,
            validated_at=now,
        )
    except SourceValidationError as error:
        result = SourceValidationResult(
            source_document_version_id=command.source_document_version_id,
            tenant_id=command.tenant_id,
            workflow_id=command.workflow_id,
            correlation_id=command.correlation_id,
            private_object_reference=source.private_object_reference,
            original_filename=source.filename,
            declared_mime_type=source.declared_mime_type,
            status="BLOCKED",
            issue_code=error.issue_code,
            reason_code=error.reason_code,
            detected_mime_type=detected_type,
            byte_size=len(content),
            content_hash=content_hash,
            malware_verdict=malware.verdict if malware else None,
            malware_reference=malware.reference if malware else None,
            validated_at=now,
        )
    store.save(result)
    return result
