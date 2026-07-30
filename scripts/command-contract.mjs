const requiredCommands = [
  "bootstrap",
  "dev",
  "stop",
  "health",
  "doctor",
  "db:migrate",
  "test",
  "test:frontend",
  "test:e2e",
  "test:integration",
  "build",
  "reset:test",
];

export function verifyCommandContract(scripts) {
  const missing = requiredCommands.filter((name) => !scripts[name]);
  if (missing.length)
    throw new Error(`COMMAND_CONTRACT_MISSING:${missing.join(",")}`);
  for (const [name, command] of Object.entries(scripts))
    if (
      requiredCommands.includes(name) &&
      (/[;&|]\s*(?:rm|del|rmdir)\b/i.test(command) ||
        /(?:^|\s)(?:bash|wsl)(?:\s|$)/i.test(command))
    )
      throw new Error(`COMMAND_NOT_CROSS_PLATFORM:${name}`);
  return Object.freeze({
    platforms: ["windows-powershell", "ci-linux"],
    commands: [...requiredCommands],
  });
}
