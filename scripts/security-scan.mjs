import { readFileSync, readdirSync } from "node:fs";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const ignored = new Set([".git", ".next", ".venv", "dist", "node_modules"]);
const findings = [];
const patterns = [
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
  /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /(?:password|secret|token)\s*[:=]\s*["'][^"']{16,}["']/i,
];
function scan(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) scan(path);
    else if (entry.isFile() && !/\.(lock|png|jpg|ico)$/i.test(entry.name)) {
      const content = readFileSync(path, "utf8");
      const lines = content.split(/\r?\n/);
      for (const [index, line] of lines.entries()) {
        if (
          /local-only|synthetic|dummy-password|wrong-password|teacher-password|family-[a-z-]+|startsWith\(["']secret:/i.test(
            line,
          )
        )
          continue;
        if (patterns.some((pattern) => pattern.test(line)))
          findings.push({
            path: path.slice(root.length + 1),
            line: index + 1,
          });
      }
    }
  }
}
scan(root);
if (findings.length) {
  console.error(JSON.stringify({ code: "SECRET_SCAN_FAILED", findings }));
  process.exit(1);
}
console.log(JSON.stringify({ status: "passed", scannedRoot: "." }));
