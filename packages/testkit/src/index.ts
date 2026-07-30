export class FixedClock {
  constructor(
    private readonly instant = new Date("2026-01-01T00:00:00.000Z"),
  ) {}
  now(): Date {
    return new Date(this.instant);
  }
}
let sequence = 0;
export function deterministicUuidV7(): string {
  sequence += 1;
  return `019b76da-a800-7000-8000-${sequence.toString().padStart(12, "0")}`;
}
export function isolatedResource(runId: string, workerId: string): string {
  if (!/^[a-z0-9-]+$/.test(runId + workerId))
    throw new Error("TEST_RESOURCE_INVALID");
  return `test-${runId}-${workerId}`;
}
