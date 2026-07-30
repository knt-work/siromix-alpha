import { createHash } from "node:crypto";
import { Buffer } from "node:buffer";
import { execFileSync } from "node:child_process";
import {
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { relative, resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const output = resolve(root, "artifacts");
const metadataOnly = process.argv.includes("--metadata-only");
const commit = exec("git", ["rev-parse", "HEAD"]).trim();
const dirty =
  exec("git", ["status", "--porcelain"], { allowFailure: true }).trim() !== "";
const shortCommit = commit.slice(0, 12);
const imageDefinitions = [
  { name: "web", dockerfile: "apps/web/Dockerfile" },
  { name: "api", dockerfile: "apps/api/Dockerfile" },
  { name: "document-ai-worker", dockerfile: "workers/document-ai/Dockerfile" },
];

rmSync(output, { recursive: true, force: true });
for (const directory of ["bundles", "buildkit", "images", "sbom", "scans"])
  mkdirSync(resolve(output, directory), { recursive: true });

const migrationBundle = createBundle(
  "migrations",
  ["packages/database/prisma/migrations"],
  { compatibilityVersion: "1" },
);
const contractBundle = createBundle(
  "contracts",
  [
    "packages/contracts/schemas",
    "packages/contracts/generated",
    "packages/contracts/openapi",
  ],
  { contractVersion: readContractVersion() },
);
const scanner = metadataOnly ? undefined : resolveScanner();

const images = metadataOnly
  ? []
  : imageDefinitions.map(({ name, dockerfile }) =>
      buildAndInspectImage(name, dockerfile),
    );
if (!metadataOnly) {
  for (const image of images) verifyImageHealth(image);
}

const manifest = {
  schemaVersion: "1.0",
  source: { commit, dirty },
  promotion: {
    eligible: !dirty,
    rule: "Promote these digest references unchanged; inject configuration externally.",
  },
  compatibility: {
    migration: migrationBundle.metadata.compatibilityVersion,
    contracts: contractBundle.metadata.contractVersion,
    taskQueues: {
      typescript: "foundation.typescript.v1",
      python: "foundation.python.v1",
    },
  },
  tooling: { scanner },
  images,
  bundles: [migrationBundle.subject, contractBundle.subject],
};
writeJson(resolve(output, "manifest.json"), manifest);

const provenance = {
  _type: "https://in-toto.io/Statement/v1",
  subject: [
    ...images.map((image) => ({
      name: image.reference,
      digest: { sha256: image.digest.replace("sha256:", "") },
    })),
    migrationBundle.subject,
    contractBundle.subject,
  ],
  predicateType: "https://slsa.dev/provenance/v1",
  predicate: {
    buildDefinition: {
      buildType: "https://siromix.local/build-types/platform-foundation/v1",
      externalParameters: { sourceCommit: commit },
      resolvedDependencies: [
        { uri: `git+local@${commit}`, digest: { gitCommit: commit } },
      ],
    },
    runDetails: {
      builder: { id: "https://docs.docker.com/build/metadata/attestations/" },
      metadata: { invocationId: `${commit}:${Date.now()}` },
    },
  },
};
writeJson(resolve(output, "provenance.intoto.json"), provenance);

console.log(
  JSON.stringify({
    status: "built",
    commit,
    dirty,
    images: images.map((image) => image.reference),
    bundles: manifest.bundles,
  }),
);

function buildAndInspectImage(name, dockerfile) {
  const tag = `siromix-${name}:sha-${shortCommit}`;
  const metadataPath = resolve(output, "buildkit", `${name}.json`);
  exec("docker", [
    "buildx",
    "build",
    "--load",
    "--pull",
    "--provenance=mode=max",
    "--sbom=true",
    "--metadata-file",
    metadataPath,
    "--build-arg",
    `SOURCE_COMMIT=${commit}`,
    "--label",
    `org.opencontainers.image.revision=${commit}`,
    "--label",
    "org.opencontainers.image.title=siromix-platform-foundation",
    "--tag",
    tag,
    "--file",
    dockerfile,
    ".",
  ]);
  const buildMetadata = JSON.parse(readFileSync(metadataPath, "utf8"));
  const inspect = JSON.parse(exec("docker", ["image", "inspect", tag]))[0];
  const digest =
    buildMetadata["containerimage.digest"] ??
    inspect.RepoDigests?.[0]?.split("@")[1] ??
    inspect.Id;
  const reference = `${tag}@${digest}`;
  const sbomPath = resolve(output, "sbom", `${name}.cdx.json`);
  exec("docker", [
    "scout",
    "sbom",
    `local://${tag}`,
    "--format",
    "cyclonedx",
    "--output",
    sbomPath,
  ]);
  const archivePath = resolve(output, "images", `${name}.tar`);
  exec("docker", ["save", "--output", archivePath, tag]);
  const scanPath = resolve(output, "scans", `${name}.sarif.json`);
  exec("docker", [
    "run",
    "--rm",
    "--volume",
    `${output}:/work:rw`,
    "--volume",
    "siromix-trivy-cache:/root/.cache/",
    scanner.reference,
    "image",
    "--scanners",
    "vuln",
    "--severity",
    "CRITICAL",
    "--ignore-unfixed",
    "--format",
    "sarif",
    "--output",
    `/work/scans/${name}.sarif.json`,
    "--input",
    `/work/images/${name}.tar`,
  ]);
  enforceSarif(scanPath, "CONTAINER_SCAN_FAILED");
  return {
    name,
    tag,
    digest,
    reference,
    platform: `${inspect.Os}/${inspect.Architecture}`,
    sbom: relative(root, sbomPath).replaceAll("\\", "/"),
    scan: relative(root, scanPath).replaceAll("\\", "/"),
    archive: relative(root, archivePath).replaceAll("\\", "/"),
  };
}

function resolveScanner() {
  const tag = "aquasec/trivy:0.66.0";
  exec("docker", ["pull", tag]);
  const inspect = JSON.parse(exec("docker", ["image", "inspect", tag]))[0];
  const reference = inspect.RepoDigests?.[0];
  if (!reference?.includes("@sha256:"))
    throw new Error("SCANNER_IMAGE_NOT_CONTENT_ADDRESSED");
  return { name: "trivy", version: "0.66.0", reference };
}

function verifyImageHealth(image) {
  const name = `siromix-smoke-${image.name}-${process.pid}`;
  const args = ["run", "--detach", "--rm", "--name", name];
  if (image.name === "document-ai-worker") {
    args.push(
      "--env",
      "SIROMIX_ENV=local",
      "--env",
      "TEMPORAL_ADDRESS=host.docker.internal:7233",
    );
  }
  args.push(image.tag);
  exec("docker", args);
  try {
    let status = "starting";
    for (let attempt = 0; attempt < 90; attempt += 1) {
      status = exec(
        "docker",
        ["inspect", "--format", "{{.State.Health.Status}}", name],
        { allowFailure: true },
      ).trim();
      if (status === "healthy") return;
      if (status === "unhealthy") break;
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1_000);
    }
    const logs = exec("docker", ["logs", name], { allowFailure: true }).slice(
      -2_000,
    );
    throw new Error(
      `IMAGE_HEALTH_VERIFICATION_FAILED: ${image.name}; status=${status}; logs=${logs}`,
    );
  } finally {
    exec("docker", ["rm", "--force", name], { allowFailure: true });
  }
}

function createBundle(name, directories, metadata) {
  const files = [];
  for (const directory of directories) {
    const absolute = resolve(root, directory);
    try {
      collect(absolute, files);
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  files.sort((a, b) => a.path.localeCompare(b.path));
  const bundle = {
    schemaVersion: "1.0",
    name,
    sourceCommit: commit,
    metadata,
    files,
  };
  const path = resolve(output, "bundles", `${name}.bundle.json`);
  const bytes = Buffer.from(`${JSON.stringify(bundle, null, 2)}\n`);
  writeFileSync(path, bytes);
  return {
    metadata,
    subject: {
      name: relative(root, path).replaceAll("\\", "/"),
      digest: { sha256: sha256(bytes) },
    },
  };
}

function collect(directory, files) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = resolve(directory, entry.name);
    if (entry.isDirectory()) collect(absolute, files);
    else {
      const bytes = readFileSync(absolute);
      files.push({
        path: relative(root, absolute).replaceAll("\\", "/"),
        bytes: statSync(absolute).size,
        sha256: sha256(bytes),
        contentBase64: bytes.toString("base64"),
      });
    }
  }
}

function readContractVersion() {
  const schema = JSON.parse(
    readFileSync(resolve(root, "packages/contracts/schemas/envelope-1.0.json")),
  );
  return schema.properties?.schemaVersion?.const ?? "1.0";
}

function enforceSarif(path, code) {
  const sarif = JSON.parse(readFileSync(path, "utf8"));
  const findings = (sarif.runs ?? []).flatMap((run) => run.results ?? []);
  if (findings.length) {
    console.error(JSON.stringify({ code, findings: findings.length, path }));
    process.exit(1);
  }
}

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

function exec(command, args, options = {}) {
  try {
    return execFileSync(command, args, {
      cwd: root,
      encoding: "utf8",
      stdio: options.allowFailure ? ["ignore", "pipe", "ignore"] : undefined,
    });
  } catch (error) {
    if (options.allowFailure) return "";
    throw error;
  }
}
