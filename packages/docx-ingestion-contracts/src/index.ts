import { z } from "zod";

export const CANONICAL_DOCUMENT_SCHEMA_VERSION = "1.0" as const;
export const INGESTION_ISSUE_CODES = [
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
] as const;
type IngestionIssueCode = (typeof INGESTION_ISSUE_CODES)[number];

export const INGESTION_ISSUE_POLICY_BY_CODE = {
  SOURCE_VALIDATION_FAILED: [
    "SOURCE",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  SECURITY_VALIDATION_FAILED: [
    "SECURITY",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  CANONICAL_SCHEMA_INVALID: [
    "SCHEMA",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "CONTACT_SUPPORT",
  ],
  MEANINGFUL_CONTENT_ABSENT: [
    "CONTENT",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  SEMANTIC_ORDER_LOST: [
    "STRUCTURE",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  REQUIRED_IMAGE_MISSING: [
    "ASSET",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  REQUIRED_TABLE_INVALID: [
    "STRUCTURE",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  FORMULA_CONVERSION_FAILED: [
    "FORMULA",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  REQUIRED_SHAPE_UNSUPPORTED: [
    "SHAPE",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  REQUIRED_RELATIONSHIP_BROKEN: [
    "RELATIONSHIP",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  MEANING_AFFECTING_CONTENT_LOSS: [
    "CONTENT",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "REPLACE_DOCX",
  ],
  SEVERITY_AMBIGUOUS: [
    "CONTENT",
    "BLOCKING_ERROR",
    "NOT_RETRYABLE",
    true,
    false,
    "COMMITTED_STAGES_PRESERVED",
    "CONTACT_SUPPORT",
  ],
  PRESENTATION_ONLY_CONTENT_LOSS: [
    "CONTENT",
    "WARNING",
    "NOT_RETRYABLE",
    false,
    true,
    "ALL_VALID_WORK_PRESERVED",
    "REVIEW_WARNING",
  ],
  DECORATIVE_SHAPE_LOSS: [
    "SHAPE",
    "WARNING",
    "NOT_RETRYABLE",
    false,
    true,
    "ALL_VALID_WORK_PRESERVED",
    "REVIEW_WARNING",
  ],
} as const satisfies Record<
  IngestionIssueCode,
  readonly [string, string, string, boolean, boolean, string, string]
>;
export const SUPPORTED_CANONICAL_DOCUMENT_SCHEMA_VERSIONS = [
  CANONICAL_DOCUMENT_SCHEMA_VERSION,
] as const;

const opaqueIdSchema = z
  .string()
  .min(1)
  .max(128)
  .regex(/^[A-Za-z0-9][A-Za-z0-9._:-]*$/);
const versionSchema = z.string().regex(/^[0-9]+\.[0-9]+(?:\.[0-9]+)?$/);
const sha256Schema = z.string().regex(/^[a-f0-9]{64}$/);
const timestampSchema = z.iso.datetime({ offset: true });
const privateReferenceSchema = z
  .string()
  .min(1)
  .max(512)
  .regex(
    /^(?![A-Za-z]:[\\/])(?!\/)(?!.*(?:https?:\/\/|[?&](?:token|signature)=)).+$/i,
  );

export const ingestionStatusSchema = z.enum([
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
]);

export const canonicalTerminalStatusSchema = z.enum([
  "SUCCEEDED",
  "SUCCEEDED_WITH_WARNINGS",
]);

export const sourceLocatorSchema = z
  .object({
    part: z.string().min(1).max(256),
    path: z.string().min(1).max(512),
  })
  .strict();

export const inlineContentSchema = z
  .object({
    type: z.literal("text"),
    text: z.string(),
  })
  .strict();

export const canonicalRelationshipSchema = z
  .object({
    relationshipId: opaqueIdSchema,
    type: z.enum([
      "CONTAINS",
      "PRECEDES",
      "FOLLOWS",
      "CAPTION_OF",
      "LABELS",
      "PLACED_WITH",
      "GROUPS",
      "CONNECTS_FROM",
      "CONNECTS_TO",
    ]),
    sourceBlockId: opaqueIdSchema,
    targetBlockId: opaqueIdSchema.optional(),
    targetAssetId: opaqueIdSchema.optional(),
  })
  .strict()
  .refine(
    (value) =>
      Number(value.targetBlockId !== undefined) +
        Number(value.targetAssetId !== undefined) ===
      1,
    "A relationship must target exactly one block or asset",
  );

export const ingestionIssueSchema = z
  .object({
    issueId: opaqueIdSchema,
    code: z.enum(INGESTION_ISSUE_CODES),
    severity: z.enum(["BLOCKING_ERROR", "WARNING"]),
    category: z.enum([
      "SOURCE",
      "SECURITY",
      "STRUCTURE",
      "CONTENT",
      "FORMULA",
      "SHAPE",
      "ASSET",
      "RELATIONSHIP",
      "SCHEMA",
    ]),
    safeSummary: z.string().min(1).max(500),
    sourceLocator: sourceLocatorSchema.optional(),
    affectedBlockId: opaqueIdSchema.optional(),
    affectedAssetId: opaqueIdSchema.optional(),
    downstreamPermitted: z.boolean(),
    retryability: z.enum(["NOT_RETRYABLE", "RETRYABLE"]),
    terminal: z.boolean(),
    preservedWork: z.enum([
      "COMMITTED_STAGES_PRESERVED",
      "ALL_VALID_WORK_PRESERVED",
    ]),
    recommendedAction: z.enum([
      "REPLACE_DOCX",
      "RETRY",
      "CONTACT_SUPPORT",
      "REVIEW_WARNING",
    ]),
    parserVersion: versionSchema,
    schemaVersion: z.literal(CANONICAL_DOCUMENT_SCHEMA_VERSION),
    canonicalizationConfigVersion: versionSchema,
  })
  .strict()
  .superRefine((value, context) => {
    const expected = INGESTION_ISSUE_POLICY_BY_CODE[value.code];
    const actual = [
      value.category,
      value.severity,
      value.retryability,
      value.terminal,
      value.downstreamPermitted,
      value.preservedWork,
      value.recommendedAction,
    ] as const;
    const fields = [
      "category",
      "severity",
      "retryability",
      "terminal",
      "downstreamPermitted",
      "preservedWork",
      "recommendedAction",
    ] as const;
    fields.forEach((field, index) => {
      if (actual[index] !== expected[index]) {
        context.addIssue({
          code: "custom",
          message: `Issue code conflicts with its stable ${field} policy`,
          path: [field],
        });
      }
    });
    if (value.severity === "BLOCKING_ERROR" && value.downstreamPermitted) {
      context.addIssue({
        code: "custom",
        message: "Blocking errors cannot permit downstream processing",
        path: ["downstreamPermitted"],
      });
    }
    if (value.severity === "WARNING" && !value.downstreamPermitted) {
      context.addIssue({
        code: "custom",
        message: "Warnings must permit downstream processing",
        path: ["downstreamPermitted"],
      });
    }
  });

export const canonicalAssetSchema = z
  .object({
    assetId: opaqueIdSchema,
    tenantId: opaqueIdSchema,
    contentHash: sha256Schema,
    physicalContentKey: privateReferenceSchema,
    mediaType: z.string().regex(/^[a-z0-9.+-]+\/[a-z0-9.+-]+$/i),
    byteSize: z.number().int().nonnegative(),
    widthPixels: z.number().int().positive().optional(),
    heightPixels: z.number().int().positive().optional(),
    privateObjectKey: privateReferenceSchema,
    validationStatus: z.enum(["VALID", "WARNING", "BLOCKED"]),
    sourceRelationshipLocator: z.string().min(1).max(512),
    retentionState: z.enum([
      "ACTIVE",
      "RECOVERABLE_DELETION",
      "DELETION_PENDING",
      "DELETED",
    ]),
    legalHold: z.boolean(),
    referenceCount: z.number().int().nonnegative(),
  })
  .strict();

const commonBlockFields = {
  blockId: opaqueIdSchema,
  ordinal: z.number().int().nonnegative(),
  parentBlockId: opaqueIdSchema.optional(),
  sourceLocator: sourceLocatorSchema,
  relationshipIds: z.array(opaqueIdSchema),
  issueIds: z.array(opaqueIdSchema),
  validationStatus: z.enum(["VALID", "WARNING", "BLOCKED"]),
};

const headingBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("heading"),
    level: z.number().int().min(1).max(9),
    inlineContent: z.array(inlineContentSchema),
  })
  .strict();

const paragraphBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("paragraph"),
    inlineContent: z.array(inlineContentSchema),
    semantics: z.enum(["BODY", "CAPTION", "LABEL", "NOTE"]),
  })
  .strict();

const listBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("list"),
    listType: z.enum(["ORDERED", "UNORDERED"]),
    nestingLevel: z.number().int().nonnegative(),
    itemBlockIds: z.array(opaqueIdSchema).min(1),
  })
  .strict();

const listItemBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("listItem"),
    inlineContent: z.array(inlineContentSchema),
    childBlockIds: z.array(opaqueIdSchema),
  })
  .strict();

const tableBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("table"),
    rowBlockIds: z.array(opaqueIdSchema).min(1),
    readingOrder: z.array(opaqueIdSchema).min(1),
  })
  .strict();

const tableRowBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("tableRow"),
    cellBlockIds: z.array(opaqueIdSchema).min(1),
  })
  .strict();

const tableCellBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("tableCell"),
    rowSpan: z.number().int().positive(),
    columnSpan: z.number().int().positive(),
    childBlockIds: z.array(opaqueIdSchema),
  })
  .strict();

const imageBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("image"),
    assetId: opaqueIdSchema,
    alternativeText: z.string().max(2_000).optional(),
    description: z.string().max(4_000).optional(),
    placement: z.enum(["INLINE", "FLOATING"]),
  })
  .strict();

const formulaBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("formula"),
    presentationMathMl: z.string().min(1),
    normalizedLinear: z.string().min(1).optional(),
    normalizedLatex: z.string().min(1).optional(),
    privateOmmlSourceReference: privateReferenceSchema,
    conversionStatus: z.enum([
      "CONVERTED",
      "CONVERTED_WITH_WARNING",
      "BLOCKED",
    ]),
  })
  .strict();

const shapeBlockSchema = z
  .object({
    ...commonBlockFields,
    type: z.literal("shape"),
    shapeFamily: z.enum([
      "TEXT_BOX",
      "SIMPLE_SHAPE",
      "LINE",
      "ARROW",
      "CONNECTOR",
      "PICTURE",
      "GROUP",
      "CANVAS",
    ]),
    inlineContent: z.array(inlineContentSchema),
    relatedAssetIds: z.array(opaqueIdSchema),
    placementRelationshipIds: z.array(opaqueIdSchema),
  })
  .strict();

export const canonicalBlockSchema = z.discriminatedUnion("type", [
  headingBlockSchema,
  paragraphBlockSchema,
  listBlockSchema,
  listItemBlockSchema,
  tableBlockSchema,
  tableRowBlockSchema,
  tableCellBlockSchema,
  imageBlockSchema,
  formulaBlockSchema,
  shapeBlockSchema,
]);

export const ingestionAttemptContractSchema = z
  .object({
    attemptId: opaqueIdSchema,
    sequence: z.number().int().positive(),
    sourceDocumentVersionId: opaqueIdSchema,
    idempotencyKey: z.string().min(1).max(200),
    correlationId: opaqueIdSchema,
    parserIdentity: z.string().min(1).max(128),
    parserVersion: versionSchema,
    schemaVersion: z.literal(CANONICAL_DOCUMENT_SCHEMA_VERSION),
    canonicalizationConfigVersion: versionSchema,
    status: ingestionStatusSchema,
    stageTimestamps: z.partialRecord(ingestionStatusSchema, timestampSchema),
    retryClassification: z
      .enum(["NOT_APPLICABLE", "TRANSIENT", "PERMANENT"])
      .optional(),
    cancellationEventId: opaqueIdSchema.optional(),
    resumedFromAttemptId: opaqueIdSchema.optional(),
    outcomeCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,63}$/)
      .optional(),
    workerIdentity: z.string().min(1).max(128),
    workerVersion: versionSchema,
    reuseDecision: z.enum(["NOT_CHECKED", "REUSED", "REPROCESS"]),
    metrics: z.record(
      z.string().regex(/^[a-z][a-zA-Z0-9]*$/),
      z.number().finite().nonnegative(),
    ),
  })
  .strict();

export const canonicalProvenanceSchema = z
  .object({
    ingestionAttemptId: opaqueIdSchema,
    correlationId: opaqueIdSchema,
    createdAt: timestampSchema,
    priorCanonicalDocumentId: opaqueIdSchema.optional(),
    migrationReasonCode: z
      .string()
      .regex(/^[A-Z][A-Z0-9_]{2,63}$/)
      .optional(),
  })
  .strict();

export const canonicalDocumentSchema = z
  .object({
    schemaVersion: z.literal(CANONICAL_DOCUMENT_SCHEMA_VERSION),
    canonicalDocumentId: opaqueIdSchema,
    canonicalDocumentVersion: z.number().int().positive(),
    tenantId: opaqueIdSchema,
    workflowId: opaqueIdSchema,
    sourceDocumentVersionId: opaqueIdSchema,
    sourceContentHash: sha256Schema,
    parserIdentity: z.string().min(1).max(128),
    parserVersion: versionSchema,
    canonicalizationConfigVersion: versionSchema,
    status: canonicalTerminalStatusSchema,
    blocks: z.array(canonicalBlockSchema),
    assetReferences: z.array(canonicalAssetSchema),
    relationships: z.array(canonicalRelationshipSchema),
    issues: z.array(ingestionIssueSchema),
    provenance: canonicalProvenanceSchema,
    extensions: z
      .object({
        namespace: z.string().regex(/^[a-z][a-z0-9.-]+$/),
        version: versionSchema,
        values: z.record(
          z.string(),
          z.union([z.string(), z.number(), z.boolean()]),
        ),
      })
      .strict()
      .array()
      .optional(),
  })
  .strict();

export const ingestionHandoffSchema = z
  .object({
    handoffVersion: z.literal("1.0"),
    schemaVersion: z.literal(CANONICAL_DOCUMENT_SCHEMA_VERSION),
    canonicalDocumentId: opaqueIdSchema,
    canonicalDocumentVersion: z.number().int().positive(),
    tenantId: opaqueIdSchema,
    workflowId: opaqueIdSchema,
    status: canonicalTerminalStatusSchema,
    assetReferences: z.array(
      canonicalAssetSchema.pick({
        assetId: true,
        mediaType: true,
        byteSize: true,
        validationStatus: true,
      }),
    ),
    issues: z.array(ingestionIssueSchema),
    provenance: canonicalProvenanceSchema,
  })
  .strict();

export type IngestionStatus = z.infer<typeof ingestionStatusSchema>;
export type CanonicalDocument = z.infer<typeof canonicalDocumentSchema>;
export type CanonicalBlock = z.infer<typeof canonicalBlockSchema>;
export type CanonicalAsset = z.infer<typeof canonicalAssetSchema>;
export type IngestionIssue = z.infer<typeof ingestionIssueSchema>;
export type IngestionAttemptContract = z.infer<
  typeof ingestionAttemptContractSchema
>;
export type CanonicalProvenance = z.infer<typeof canonicalProvenanceSchema>;
export type IngestionHandoff = z.infer<typeof ingestionHandoffSchema>;

export function supportsCanonicalDocumentVersion(version: string): boolean {
  return SUPPORTED_CANONICAL_DOCUMENT_SCHEMA_VERSIONS.some(
    (supported) => supported === version,
  );
}

export function assertCanonicalDocumentVersion(
  version: string,
): asserts version is (typeof SUPPORTED_CANONICAL_DOCUMENT_SCHEMA_VERSIONS)[number] {
  if (!supportsCanonicalDocumentVersion(version)) {
    throw new Error(`UNSUPPORTED_CANONICAL_DOCUMENT_SCHEMA_VERSION:${version}`);
  }
}
