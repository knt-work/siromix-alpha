"""Schema-conformance-tested DOCX ingestion bindings for the document worker.

The authoritative schemas and shared fixture manifest live in
packages/docx-ingestion-contracts. Root contracts:check verifies this reader.
"""

from datetime import datetime
from math import isfinite
from typing import Annotated, Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    field_validator,
    model_validator,
)


OpaqueId = Annotated[
    str,
    StringConstraints(
        min_length=1,
        max_length=128,
        pattern=r"^[A-Za-z0-9][A-Za-z0-9._:-]*$",
    ),
]
Version = Annotated[
    str,
    StringConstraints(pattern=r"^[0-9]+\.[0-9]+(?:\.[0-9]+)?$"),
]
Sha256 = Annotated[str, StringConstraints(pattern=r"^[a-f0-9]{64}$")]
PrivateReference = Annotated[str, StringConstraints(min_length=1, max_length=512)]
Timestamp = Annotated[
    str,
    StringConstraints(
        pattern=(
            r"^[0-9]{4}-[0-9]{2}-[0-9]{2}T"
            r"[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\.[0-9]+)?"
            r"(?:Z|[+-][0-9]{2}:[0-9]{2})$"
        )
    ),
]
SchemaVersion = Literal["1.0"]
TerminalStatus = Literal["SUCCEEDED", "SUCCEEDED_WITH_WARNINGS"]
IngestionStatus = Literal[
    "RECEIVED",
    "VALIDATING_SOURCE",
    "HASHING_SOURCE",
    "CHECKING_REUSE",
    "PARSING_PACKAGE",
    "TRANSFORMING_CANONICAL",
    "EXTRACTING_ASSETS",
    "VALIDATING_CANONICAL",
    "PERSISTING_RESULT",
    "FAILED_RETRYABLE",
    "CANCELLED",
    "UNDO_REQUESTED",
    "RESUMING",
    "SUCCEEDED",
    "SUCCEEDED_WITH_WARNINGS",
    "FAILED_PERMANENT",
]


def validate_private_reference(value: str) -> str:
    lowered = value.lower()
    if (
        value.startswith("/")
        or (
            len(value) >= 3
            and value[0].isalpha()
            and value[1] == ":"
            and value[2] in "\\/"
        )
        or "http://" in lowered
        or "https://" in lowered
        or "?token=" in lowered
        or "&token=" in lowered
        or "?signature=" in lowered
        or "&signature=" in lowered
    ):
        raise ValueError(
            "private references must not expose paths, URLs, or credentials"
        )
    return value


def validate_timezone_aware(value: str) -> str:
    parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if parsed.tzinfo is None or parsed.utcoffset() is None:
        raise ValueError("timestamp must include a timezone offset")
    return value


class ContractModel(BaseModel):
    model_config = ConfigDict(extra="forbid", populate_by_name=True, strict=True)


class SourceLocator(ContractModel):
    part: Annotated[str, StringConstraints(min_length=1, max_length=256)]
    path: Annotated[str, StringConstraints(min_length=1, max_length=512)]


class InlineContent(ContractModel):
    type: Literal["text"]
    text: str


class CommonBlock(ContractModel):
    block_id: OpaqueId = Field(alias="blockId")
    ordinal: int = Field(ge=0)
    parent_block_id: OpaqueId | None = Field(default=None, alias="parentBlockId")
    source_locator: SourceLocator = Field(alias="sourceLocator")
    relationship_ids: list[OpaqueId] = Field(alias="relationshipIds")
    issue_ids: list[OpaqueId] = Field(alias="issueIds")
    validation_status: Literal["VALID", "WARNING", "BLOCKED"] = Field(
        alias="validationStatus"
    )


class HeadingBlock(CommonBlock):
    type: Literal["heading"]
    level: int = Field(ge=1, le=9)
    inline_content: list[InlineContent] = Field(alias="inlineContent")


class ParagraphBlock(CommonBlock):
    type: Literal["paragraph"]
    inline_content: list[InlineContent] = Field(alias="inlineContent")
    semantics: Literal["BODY", "CAPTION", "LABEL", "NOTE"]


class ListBlock(CommonBlock):
    type: Literal["list"]
    list_type: Literal["ORDERED", "UNORDERED"] = Field(alias="listType")
    nesting_level: int = Field(alias="nestingLevel", ge=0)
    item_block_ids: list[OpaqueId] = Field(alias="itemBlockIds", min_length=1)


class ListItemBlock(CommonBlock):
    type: Literal["listItem"]
    inline_content: list[InlineContent] = Field(alias="inlineContent")
    child_block_ids: list[OpaqueId] = Field(alias="childBlockIds")


class TableBlock(CommonBlock):
    type: Literal["table"]
    row_block_ids: list[OpaqueId] = Field(alias="rowBlockIds", min_length=1)
    reading_order: list[OpaqueId] = Field(alias="readingOrder", min_length=1)


class TableRowBlock(CommonBlock):
    type: Literal["tableRow"]
    cell_block_ids: list[OpaqueId] = Field(alias="cellBlockIds", min_length=1)


class TableCellBlock(CommonBlock):
    type: Literal["tableCell"]
    row_span: int = Field(alias="rowSpan", ge=1)
    column_span: int = Field(alias="columnSpan", ge=1)
    child_block_ids: list[OpaqueId] = Field(alias="childBlockIds")


class ImageBlock(CommonBlock):
    type: Literal["image"]
    asset_id: OpaqueId = Field(alias="assetId")
    alternative_text: str | None = Field(
        default=None, alias="alternativeText", max_length=2_000
    )
    description: str | None = Field(default=None, max_length=4_000)
    placement: Literal["INLINE", "FLOATING"]


class FormulaBlock(CommonBlock):
    type: Literal["formula"]
    presentation_math_ml: Annotated[str, StringConstraints(min_length=1)] = Field(
        alias="presentationMathMl"
    )
    normalized_linear: Annotated[str, StringConstraints(min_length=1)] | None = Field(
        default=None, alias="normalizedLinear"
    )
    normalized_latex: Annotated[str, StringConstraints(min_length=1)] | None = Field(
        default=None, alias="normalizedLatex"
    )
    private_omml_source_reference: PrivateReference = Field(
        alias="privateOmmlSourceReference"
    )
    conversion_status: Literal["CONVERTED", "CONVERTED_WITH_WARNING", "BLOCKED"] = (
        Field(alias="conversionStatus")
    )

    @field_validator("private_omml_source_reference")
    @classmethod
    def private_omml_reference(cls, value: str) -> str:
        return validate_private_reference(value)


class ShapeBlock(CommonBlock):
    type: Literal["shape"]
    shape_family: Literal[
        "TEXT_BOX",
        "SIMPLE_SHAPE",
        "LINE",
        "ARROW",
        "CONNECTOR",
        "PICTURE",
        "GROUP",
        "CANVAS",
    ] = Field(alias="shapeFamily")
    inline_content: list[InlineContent] = Field(alias="inlineContent")
    related_asset_ids: list[OpaqueId] = Field(alias="relatedAssetIds")
    placement_relationship_ids: list[OpaqueId] = Field(alias="placementRelationshipIds")


CanonicalBlock = Annotated[
    HeadingBlock
    | ParagraphBlock
    | ListBlock
    | ListItemBlock
    | TableBlock
    | TableRowBlock
    | TableCellBlock
    | ImageBlock
    | FormulaBlock
    | ShapeBlock,
    Field(discriminator="type"),
]


class CanonicalRelationship(ContractModel):
    relationship_id: OpaqueId = Field(alias="relationshipId")
    type: Literal[
        "CONTAINS",
        "PRECEDES",
        "FOLLOWS",
        "CAPTION_OF",
        "LABELS",
        "PLACED_WITH",
        "GROUPS",
        "CONNECTS_FROM",
        "CONNECTS_TO",
    ]
    source_block_id: OpaqueId = Field(alias="sourceBlockId")
    target_block_id: OpaqueId | None = Field(default=None, alias="targetBlockId")
    target_asset_id: OpaqueId | None = Field(default=None, alias="targetAssetId")

    @model_validator(mode="after")
    def exactly_one_target(self) -> "CanonicalRelationship":
        if (self.target_block_id is None) == (self.target_asset_id is None):
            raise ValueError("relationship must target exactly one block or asset")
        return self


class IngestionIssue(ContractModel):
    issue_id: OpaqueId = Field(alias="issueId")
    code: Literal[
        "SOURCE_VALIDATION_FAILED",
        "SECURITY_VALIDATION_FAILED",
        "CANONICAL_SCHEMA_INVALID",
        "MEANINGFUL_CONTENT_ABSENT",
        "SEMANTIC_ORDER_LOST",
        "REQUIRED_IMAGE_MISSING",
        "REQUIRED_TABLE_INVALID",
        "FORMULA_CONVERSION_FAILED",
        "REQUIRED_SHAPE_UNSUPPORTED",
        "REQUIRED_RELATIONSHIP_BROKEN",
        "MEANING_AFFECTING_CONTENT_LOSS",
        "SEVERITY_AMBIGUOUS",
        "PRESENTATION_ONLY_CONTENT_LOSS",
        "DECORATIVE_SHAPE_LOSS",
    ]
    severity: Literal["BLOCKING_ERROR", "WARNING"]
    category: Literal[
        "SOURCE",
        "SECURITY",
        "STRUCTURE",
        "CONTENT",
        "FORMULA",
        "SHAPE",
        "ASSET",
        "RELATIONSHIP",
        "SCHEMA",
    ]
    safe_summary: Annotated[str, StringConstraints(min_length=1, max_length=500)] = (
        Field(alias="safeSummary")
    )
    source_locator: SourceLocator | None = Field(default=None, alias="sourceLocator")
    affected_block_id: OpaqueId | None = Field(default=None, alias="affectedBlockId")
    affected_asset_id: OpaqueId | None = Field(default=None, alias="affectedAssetId")
    downstream_permitted: bool = Field(alias="downstreamPermitted")
    retryability: Literal["NOT_RETRYABLE", "RETRYABLE"]
    terminal: bool
    preserved_work: Literal[
        "COMMITTED_STAGES_PRESERVED", "ALL_VALID_WORK_PRESERVED"
    ] = Field(alias="preservedWork")
    recommended_action: Literal[
        "REPLACE_DOCX", "RETRY", "CONTACT_SUPPORT", "REVIEW_WARNING"
    ] = Field(alias="recommendedAction")
    parser_version: Version = Field(alias="parserVersion")
    schema_version: SchemaVersion = Field(alias="schemaVersion")
    canonicalization_config_version: Version = Field(
        alias="canonicalizationConfigVersion"
    )

    @model_validator(mode="after")
    def enforce_downstream_policy(self) -> "IngestionIssue":
        policies = {
            "SOURCE_VALIDATION_FAILED": ("SOURCE", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "SECURITY_VALIDATION_FAILED": ("SECURITY", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "CANONICAL_SCHEMA_INVALID": ("SCHEMA", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "CONTACT_SUPPORT"),
            "MEANINGFUL_CONTENT_ABSENT": ("CONTENT", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "SEMANTIC_ORDER_LOST": ("STRUCTURE", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "REQUIRED_IMAGE_MISSING": ("ASSET", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "REQUIRED_TABLE_INVALID": ("STRUCTURE", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "FORMULA_CONVERSION_FAILED": ("FORMULA", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "REQUIRED_SHAPE_UNSUPPORTED": ("SHAPE", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "REQUIRED_RELATIONSHIP_BROKEN": ("RELATIONSHIP", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "MEANING_AFFECTING_CONTENT_LOSS": ("CONTENT", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "REPLACE_DOCX"),
            "SEVERITY_AMBIGUOUS": ("CONTENT", "BLOCKING_ERROR", "NOT_RETRYABLE", True, False, "COMMITTED_STAGES_PRESERVED", "CONTACT_SUPPORT"),
            "PRESENTATION_ONLY_CONTENT_LOSS": ("CONTENT", "WARNING", "NOT_RETRYABLE", False, True, "ALL_VALID_WORK_PRESERVED", "REVIEW_WARNING"),
            "DECORATIVE_SHAPE_LOSS": ("SHAPE", "WARNING", "NOT_RETRYABLE", False, True, "ALL_VALID_WORK_PRESERVED", "REVIEW_WARNING"),
        }
        expected = policies[self.code]
        actual = (
            self.category,
            self.severity,
            self.retryability,
            self.terminal,
            self.downstream_permitted,
            self.preserved_work,
            self.recommended_action,
        )
        if actual != expected:
            raise ValueError("issue code conflicts with authoritative metadata")
        permitted = self.severity == "WARNING"
        if self.downstream_permitted is not permitted:
            raise ValueError("issue severity conflicts with downstream policy")
        return self


class CanonicalAsset(ContractModel):
    asset_id: OpaqueId = Field(alias="assetId")
    tenant_id: OpaqueId = Field(alias="tenantId")
    content_hash: Sha256 = Field(alias="contentHash")
    physical_content_key: PrivateReference = Field(alias="physicalContentKey")
    media_type: str = Field(alias="mediaType", pattern=r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
    byte_size: int = Field(alias="byteSize", ge=0)
    width_pixels: int | None = Field(default=None, alias="widthPixels", ge=1)
    height_pixels: int | None = Field(default=None, alias="heightPixels", ge=1)
    private_object_key: PrivateReference = Field(alias="privateObjectKey")
    validation_status: Literal["VALID", "WARNING", "BLOCKED"] = Field(
        alias="validationStatus"
    )
    source_relationship_locator: str = Field(
        alias="sourceRelationshipLocator", min_length=1, max_length=512
    )
    retention_state: Literal[
        "ACTIVE", "RECOVERABLE_DELETION", "DELETION_PENDING", "DELETED"
    ] = Field(alias="retentionState")
    legal_hold: bool = Field(alias="legalHold")
    reference_count: int = Field(alias="referenceCount", ge=0)

    @field_validator("physical_content_key", "private_object_key")
    @classmethod
    def private_references(cls, value: str) -> str:
        return validate_private_reference(value)


class CanonicalProvenance(ContractModel):
    ingestion_attempt_id: OpaqueId = Field(alias="ingestionAttemptId")
    correlation_id: OpaqueId = Field(alias="correlationId")
    created_at: Timestamp = Field(alias="createdAt")
    prior_canonical_document_id: OpaqueId | None = Field(
        default=None, alias="priorCanonicalDocumentId"
    )
    migration_reason_code: str | None = Field(
        default=None,
        alias="migrationReasonCode",
        pattern=r"^[A-Z][A-Z0-9_]{2,63}$",
    )

    @field_validator("created_at")
    @classmethod
    def timezone_aware_created_at(cls, value: str) -> str:
        return validate_timezone_aware(value)


class CanonicalExtension(ContractModel):
    namespace: str = Field(pattern=r"^[a-z][a-z0-9.-]+$")
    version: Version
    values: dict[str, str | int | float | bool]


class CanonicalDocument(ContractModel):
    schema_version: SchemaVersion = Field(alias="schemaVersion")
    canonical_document_id: OpaqueId = Field(alias="canonicalDocumentId")
    canonical_document_version: int = Field(alias="canonicalDocumentVersion", ge=1)
    tenant_id: OpaqueId = Field(alias="tenantId")
    workflow_id: OpaqueId = Field(alias="workflowId")
    source_document_version_id: OpaqueId = Field(alias="sourceDocumentVersionId")
    source_content_hash: Sha256 = Field(alias="sourceContentHash")
    parser_identity: str = Field(alias="parserIdentity", min_length=1, max_length=128)
    parser_version: Version = Field(alias="parserVersion")
    canonicalization_config_version: Version = Field(
        alias="canonicalizationConfigVersion"
    )
    status: TerminalStatus
    blocks: list[CanonicalBlock]
    asset_references: list[CanonicalAsset] = Field(alias="assetReferences")
    relationships: list[CanonicalRelationship]
    issues: list[IngestionIssue]
    provenance: CanonicalProvenance
    extensions: list[CanonicalExtension] | None = None


class IngestionAttemptContract(ContractModel):
    attempt_id: OpaqueId = Field(alias="attemptId")
    sequence: int = Field(ge=1)
    source_document_version_id: OpaqueId = Field(alias="sourceDocumentVersionId")
    idempotency_key: str = Field(alias="idempotencyKey", min_length=1, max_length=200)
    correlation_id: OpaqueId = Field(alias="correlationId")
    parser_identity: str = Field(alias="parserIdentity", min_length=1, max_length=128)
    parser_version: Version = Field(alias="parserVersion")
    schema_version: SchemaVersion = Field(alias="schemaVersion")
    canonicalization_config_version: Version = Field(
        alias="canonicalizationConfigVersion"
    )
    status: IngestionStatus
    stage_timestamps: dict[IngestionStatus, Timestamp] = Field(alias="stageTimestamps")
    retry_classification: Literal["NOT_APPLICABLE", "TRANSIENT", "PERMANENT"] | None = (
        Field(default=None, alias="retryClassification")
    )
    cancellation_event_id: OpaqueId | None = Field(
        default=None, alias="cancellationEventId"
    )
    resumed_from_attempt_id: OpaqueId | None = Field(
        default=None, alias="resumedFromAttemptId"
    )
    outcome_code: str | None = Field(
        default=None, alias="outcomeCode", pattern=r"^[A-Z][A-Z0-9_]{2,63}$"
    )
    worker_identity: str = Field(alias="workerIdentity", min_length=1, max_length=128)
    worker_version: Version = Field(alias="workerVersion")
    reuse_decision: Literal["NOT_CHECKED", "REUSED", "REPROCESS"] = Field(
        alias="reuseDecision"
    )
    metrics: dict[str, float]

    @field_validator("stage_timestamps")
    @classmethod
    def timezone_aware_stages(
        cls, value: dict[IngestionStatus, str]
    ) -> dict[IngestionStatus, str]:
        for timestamp in value.values():
            validate_timezone_aware(timestamp)
        return value

    @field_validator("metrics")
    @classmethod
    def valid_metrics(cls, value: dict[str, float]) -> dict[str, float]:
        for key, metric in value.items():
            if (
                not key
                or not ("a" <= key[0] <= "z")
                or not all(
                    character.isascii() and character.isalnum() for character in key
                )
            ):
                raise ValueError("invalid metric name")
            if not isfinite(metric) or metric < 0:
                raise ValueError("metric values must be non-negative")
        return value


class HandoffAssetReference(ContractModel):
    asset_id: OpaqueId = Field(alias="assetId")
    media_type: str = Field(alias="mediaType", pattern=r"^[a-z0-9.+-]+/[a-z0-9.+-]+$")
    byte_size: int = Field(alias="byteSize", ge=0)
    validation_status: Literal["VALID", "WARNING", "BLOCKED"] = Field(
        alias="validationStatus"
    )


class IngestionHandoff(ContractModel):
    handoff_version: Literal["1.0"] = Field(alias="handoffVersion")
    schema_version: SchemaVersion = Field(alias="schemaVersion")
    canonical_document_id: OpaqueId = Field(alias="canonicalDocumentId")
    canonical_document_version: int = Field(alias="canonicalDocumentVersion", ge=1)
    tenant_id: OpaqueId = Field(alias="tenantId")
    workflow_id: OpaqueId = Field(alias="workflowId")
    status: TerminalStatus
    asset_references: list[HandoffAssetReference] = Field(alias="assetReferences")
    issues: list[IngestionIssue]
    provenance: CanonicalProvenance


def supports_canonical_document_version(version: str) -> bool:
    return version == "1.0"
