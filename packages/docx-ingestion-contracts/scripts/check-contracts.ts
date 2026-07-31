import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

import {
  canonicalDocumentSchema,
  INGESTION_ISSUE_CODES,
  INGESTION_ISSUE_POLICY_BY_CODE,
  ingestionAttemptContractSchema,
  ingestionHandoffSchema,
} from "../src/index.js";

type ContractName =
  | "canonicalDocument"
  | "ingestionAttempt"
  | "ingestionHandoff";
type Mutation = {
  op: "set" | "delete";
  path: string;
  value?: unknown;
};
type ConformanceCase = {
  name: string;
  contract: ContractName;
  file: string;
  valid: boolean;
  mutations?: Mutation[];
};

const packageRoot = resolve(import.meta.dirname, "..");
const repositoryRoot = resolve(packageRoot, "..", "..");
const fixturesDirectory = resolve(packageRoot, "fixtures");
const schemasDirectory = resolve(packageRoot, "schemas");
const readJson = (path: string): unknown =>
  JSON.parse(readFileSync(path, "utf8"));

const canonicalSchema = readJson(
  resolve(schemasDirectory, "canonical-document-1.0.json"),
);
const attemptSchema = readJson(
  resolve(schemasDirectory, "ingestion-attempt-1.0.json"),
);
const handoffSchema = readJson(
  resolve(schemasDirectory, "ingestion-handoff-1.0.json"),
);
const issueTaxonomy = readJson(
  resolve(packageRoot, "compatibility", "issue-taxonomy-1.0.json"),
) as {
  version: string;
  unknownCodePolicy: string;
  ambiguousSeverityPolicy: string;
  entries: Array<{
    code: string;
    category: string;
    severity: "BLOCKING_ERROR" | "WARNING";
    retryability: string;
    terminal: boolean;
    downstreamPermitted: boolean;
    preservedWork: string;
    recommendedAction: string;
    safeSummary: string;
  }>;
};
const schemaIssueCodes = (
  canonicalSchema as {
    $defs: { issue: { properties: { code: { enum: string[] } } } };
  }
).$defs.issue.properties.code.enum;
const taxonomyCodes = issueTaxonomy.entries.map((entry) => entry.code);
if (
  issueTaxonomy.version !== "1.0" ||
  issueTaxonomy.unknownCodePolicy !== "REJECT" ||
  issueTaxonomy.ambiguousSeverityPolicy !== "BLOCKING_ERROR" ||
  new Set(taxonomyCodes).size !== taxonomyCodes.length ||
  JSON.stringify(taxonomyCodes) !== JSON.stringify(INGESTION_ISSUE_CODES) ||
  JSON.stringify(taxonomyCodes) !== JSON.stringify(schemaIssueCodes)
) {
  throw new Error("ISSUE_TAXONOMY_DRIFT");
}
for (const entry of issueTaxonomy.entries) {
  const catalogTuple = [
    entry.category,
    entry.severity,
    entry.retryability,
    entry.terminal,
    entry.downstreamPermitted,
    entry.preservedWork,
    entry.recommendedAction,
  ];
  const readerTuple =
    INGESTION_ISSUE_POLICY_BY_CODE[
      entry.code as keyof typeof INGESTION_ISSUE_POLICY_BY_CODE
    ];
  if (JSON.stringify(catalogTuple) !== JSON.stringify(readerTuple))
    throw new Error(`ISSUE_TAXONOMY_POLICY:${entry.code}`);
}
const ajv = new Ajv2020({ allErrors: true, strict: true });
addFormats(ajv);
ajv.addSchema(canonicalSchema);
ajv.addSchema(attemptSchema);
ajv.addSchema(handoffSchema);

const jsonValidators = {
  canonicalDocument: ajv.getSchema(
    "urn:siromix:docx-ingestion:canonical-document:1.0",
  ),
  ingestionAttempt: ajv.getSchema(
    "urn:siromix:docx-ingestion:ingestion-attempt:1.0",
  ),
  ingestionHandoff: ajv.getSchema(
    "urn:siromix:docx-ingestion:ingestion-handoff:1.0",
  ),
};
const zodValidators = {
  canonicalDocument: canonicalDocumentSchema,
  ingestionAttempt: ingestionAttemptContractSchema,
  ingestionHandoff: ingestionHandoffSchema,
};

function mutate(source: unknown, mutations: Mutation[] = []): unknown {
  const value = structuredClone(source);
  for (const mutation of mutations) {
    const segments = mutation.path
      .split("/")
      .slice(1)
      .map((segment) => segment.replaceAll("~1", "/").replaceAll("~0", "~"));
    let parent = value as Record<string, unknown> | unknown[];
    for (const segment of segments.slice(0, -1)) {
      parent = (parent as Record<string, unknown>)[segment] as
        | Record<string, unknown>
        | unknown[];
    }
    const key = segments.at(-1);
    if (key === undefined)
      throw new Error(`INVALID_MUTATION_PATH:${mutation.path}`);
    if (mutation.op === "delete") {
      if (Array.isArray(parent)) parent.splice(Number(key), 1);
      else delete parent[key];
    } else if (Array.isArray(parent)) {
      parent[Number(key)] = mutation.value;
    } else {
      parent[key] = mutation.value;
    }
  }
  return value;
}

const manifest = readJson(
  resolve(fixturesDirectory, "conformance-cases.json"),
) as { schemaVersion: string; cases: ConformanceCase[] };
if (manifest.schemaVersion !== "1.0")
  throw new Error("UNSUPPORTED_CONFORMANCE_MANIFEST");

for (const testCase of manifest.cases) {
  const payload = mutate(
    readJson(resolve(fixturesDirectory, testCase.file)),
    testCase.mutations,
  );
  const jsonValidator = jsonValidators[testCase.contract];
  if (!jsonValidator)
    throw new Error(`MISSING_JSON_VALIDATOR:${testCase.contract}`);
  const jsonValid = jsonValidator(payload);
  const zodValid = zodValidators[testCase.contract].safeParse(payload).success;
  if (jsonValid !== testCase.valid)
    throw new Error(
      `JSON_SCHEMA_CONFORMANCE:${testCase.name}:${JSON.stringify(jsonValidator.errors)}`,
    );
  if (zodValid !== testCase.valid)
    throw new Error(`ZOD_CONFORMANCE:${testCase.name}`);
}

const taxonomyManifest = readJson(
  resolve(fixturesDirectory, "issue-taxonomy-conformance-cases.json"),
) as {
  taxonomyVersion: string;
  fields: Array<{ name: string; alternatives: unknown[] }>;
};
if (taxonomyManifest.taxonomyVersion !== issueTaxonomy.version)
  throw new Error("ISSUE_TAXONOMY_CONFORMANCE_VERSION");
const maximalDocument = readJson(
  resolve(fixturesDirectory, "canonical-document-1.0.maximal.valid.json"),
) as Record<string, unknown>;
const taxonomyCaseCount =
  issueTaxonomy.entries.length * taxonomyManifest.fields.length;
for (const entry of issueTaxonomy.entries) {
  const issue = {
    issueId: "issue:decorative-loss",
    ...entry,
    parserVersion: "1.0.0",
    schemaVersion: "1.0",
    canonicalizationConfigVersion: "1.0.0",
  };
  for (const field of taxonomyManifest.fields) {
    const invalidValue = field.alternatives.find(
      (candidate) => candidate !== issue[field.name as keyof typeof issue],
    );
    if (invalidValue === undefined)
      throw new Error(`ISSUE_TAXONOMY_ALTERNATIVE:${field.name}`);
    const payload = structuredClone(maximalDocument);
    payload.issues = [{ ...issue, [field.name]: invalidValue }];
    const jsonValid = jsonValidators.canonicalDocument?.(payload) ?? false;
    const zodValid = canonicalDocumentSchema.safeParse(payload).success;
    if (jsonValid)
      throw new Error(`JSON_SCHEMA_ISSUE_MAPPING:${entry.code}:${field.name}`);
    if (zodValid)
      throw new Error(`ZOD_ISSUE_MAPPING:${entry.code}:${field.name}`);
  }
}

const workerRoot = resolve(repositoryRoot, "workers", "document-ai");
const pythonScript = resolve(
  workerRoot,
  "src",
  "siromix_worker",
  "contract_conformance.py",
);
const windowsPython = resolve(workerRoot, ".venv", "Scripts", "python.exe");
const posixPython = resolve(workerRoot, ".venv", "bin", "python");
const pythonResult = existsSync(windowsPython)
  ? spawnSync(windowsPython, [pythonScript], {
      cwd: workerRoot,
      encoding: "utf8",
    })
  : existsSync(posixPython)
    ? spawnSync(posixPython, [pythonScript], {
        cwd: workerRoot,
        encoding: "utf8",
      })
    : spawnSync(
        "uv",
        ["run", "--frozen", "--project", workerRoot, "python", pythonScript],
        { cwd: repositoryRoot, encoding: "utf8" },
      );
if (pythonResult.status !== 0)
  throw new Error(
    `PYDANTIC_CONFORMANCE:${pythonResult.stderr || pythonResult.stdout}`,
  );

process.stdout.write(
  JSON.stringify({
    status: "passed",
    schemaVersion: manifest.schemaVersion,
    cases: manifest.cases.length + taxonomyCaseCount,
    readers: ["json-schema", "zod", "pydantic"],
  }) + "\n",
);
