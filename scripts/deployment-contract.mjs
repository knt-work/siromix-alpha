import { readFileSync } from "node:fs";

export class DeploymentError extends Error {
  constructor(code, detail) {
    super(`${code}: ${detail}`);
    this.code = code;
  }
}

export function verifyCompatibility(manifest, runtime) {
  requireEqual(
    "ARTIFACT_COMMIT_MISMATCH",
    manifest.source.commit,
    runtime.commit,
  );
  requireEqual(
    "CONFIG_VERSION_MISMATCH",
    runtime.requiredConfigVersion,
    runtime.configVersion,
  );
  requireEqual(
    "SCHEMA_VERSION_MISMATCH",
    manifest.compatibility.migration,
    runtime.migrationCompatibility,
  );
  requireEqual(
    "CONTRACT_VERSION_MISMATCH",
    manifest.compatibility.contracts,
    runtime.contractVersion,
  );
  for (const [worker, queue] of Object.entries(
    manifest.compatibility.taskQueues,
  ))
    requireEqual("TASK_QUEUE_MISMATCH", queue, runtime.taskQueues?.[worker]);
  for (const image of manifest.images) {
    if (!/^sha256:[a-f0-9]{64}$/.test(image.digest))
      throw new DeploymentError("IMAGE_NOT_CONTENT_ADDRESSED", image.name);
    if (!image.reference.endsWith(`@${image.digest}`))
      throw new DeploymentError("IMAGE_DIGEST_MISMATCH", image.name);
  }
  return { compatible: true };
}

export async function rollout(manifest, runtime, adapter) {
  verifyCompatibility(manifest, runtime);
  const applied = [];
  try {
    await adapter.applyExpandMigration(manifest.bundles[0]);
    applied.push("expand-migration");
    for (const component of ["api", "document-ai-worker", "web"]) {
      const image = manifest.images.find(
        (candidate) => candidate.name === component,
      );
      if (!image) throw new DeploymentError("ARTIFACT_MISSING", component);
      await adapter.deploy(component, image.reference);
      applied.push(component);
      await adapter.verifyHealth(component, {
        commit: manifest.source.commit,
        contracts: manifest.compatibility.contracts,
      });
    }
    await adapter.enableTraffic();
    applied.push("traffic");
    await adapter.deferCleanupMigrations();
    applied.push("cleanup-deferred");
    return { status: "healthy", applied };
  } catch (cause) {
    throw new DeploymentError(
      "ROLLOUT_HEALTH_FAILED",
      `${cause.code ?? cause.message}; applied=${applied.join(",")}`,
    );
  }
}

export async function rollbackApplication(previousManifest, adapter) {
  for (const component of ["api", "document-ai-worker", "web"]) {
    const image = previousManifest.images.find(
      (candidate) => candidate.name === component,
    );
    if (!image)
      throw new DeploymentError("ROLLBACK_ARTIFACT_MISSING", component);
    await adapter.deploy(component, image.reference);
    await adapter.verifyHealth(component, {
      commit: previousManifest.source.commit,
      contracts: previousManifest.compatibility.contracts,
    });
  }
  await adapter.enableTraffic();
  return {
    status: "application-rolled-back",
    databaseAction: "preserved-no-down-migration",
  };
}

export async function forwardCorrect(correctiveManifest, runtime, adapter) {
  verifyCompatibility(correctiveManifest, runtime);
  await adapter.applyForwardCorrection(correctiveManifest.bundles[0]);
  return rollout(correctiveManifest, runtime, adapter);
}

export function loadManifest(path) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function requireEqual(code, expected, actual) {
  if (expected !== actual)
    throw new DeploymentError(code, `expected=${expected}; actual=${actual}`);
}
