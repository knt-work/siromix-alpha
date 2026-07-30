import { resolve } from "node:path";
import { loadManifest, verifyCompatibility } from "./deployment-contract.mjs";

const manifest = loadManifest(
  process.env.ARTIFACT_MANIFEST ??
    resolve(import.meta.dirname, "../artifacts/manifest.json"),
);
const runtime = {
  commit: process.env.SOURCE_COMMIT,
  configVersion: process.env.CONFIG_VERSION,
  requiredConfigVersion: process.env.REQUIRED_CONFIG_VERSION,
  migrationCompatibility: process.env.MIGRATION_COMPATIBILITY_VERSION,
  contractVersion: process.env.CONTRACT_VERSION,
  taskQueues: {
    typescript: process.env.TEMPORAL_TYPESCRIPT_TASK_QUEUE,
    python: process.env.TEMPORAL_PYTHON_TASK_QUEUE,
  },
};

if (process.argv[2] !== "verify") {
  console.error(JSON.stringify({ code: "DEPLOYMENT_COMMAND_UNSUPPORTED" }));
  process.exit(2);
}
try {
  console.log(JSON.stringify(verifyCompatibility(manifest, runtime)));
} catch (error) {
  console.error(JSON.stringify({ code: error.code, message: error.message }));
  process.exit(1);
}
