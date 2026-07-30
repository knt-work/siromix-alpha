import { createHash } from "node:crypto";
import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

export function inspectMigrations(directory, expectedChecksums = undefined) {
  const names = readdirSync(directory, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
  if (
    names.some((name) => !/^\d{12,14}_[a-z0-9_]+$/.test(name)) ||
    names.some((name, index) => index > 0 && name <= names[index - 1])
  )
    throw new Error("MIGRATION_ORDER_INVALID");

  const migrations = names.map((name) => {
    const sql = readFileSync(resolve(directory, name, "migration.sql"), "utf8");
    if (/\bDROP\s+(?:TABLE|COLUMN|TYPE)\b|\bTRUNCATE\b/i.test(sql))
      throw new Error("DESTRUCTIVE_MIGRATION_REJECTED");
    return {
      name,
      checksum: createHash("sha256").update(sql).digest("hex"),
      expandCompatible: true,
    };
  });
  if (expectedChecksums)
    for (const migration of migrations)
      if (expectedChecksums[migration.name] !== migration.checksum)
        throw new Error("MIGRATION_CHECKSUM_CHANGED");
  return Object.freeze(migrations);
}
