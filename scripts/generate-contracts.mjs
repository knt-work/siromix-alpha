import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
const root = resolve(import.meta.dirname, "..");
const source = JSON.parse(
  readFileSync(
    resolve(root, "packages/contracts/schemas/envelope-1.0.json"),
    "utf8",
  ),
);
const output = resolve(root, "packages/contracts/generated/manifest.json");
const generated =
  JSON.stringify(
    {
      source: source.$id,
      schemaVersion: source.properties.schemaVersion.const,
    },
    null,
    2,
  ) + "\n";
if (process.argv.includes("--check")) {
  if (!existsSync(output) || readFileSync(output, "utf8") !== generated)
    throw new Error("CONTRACT_DRIFT");
} else writeFileSync(output, generated);
