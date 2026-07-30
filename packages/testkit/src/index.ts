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

export type FailurePoint =
  | "before-start"
  | "during-side-effect"
  | "before-commit"
  | "after-commit-before-ack"
  | "during-retry"
  | "during-shutdown";

export async function exerciseFailureMatrix(
  operation: (point: FailurePoint) => Promise<void>,
): Promise<Readonly<Record<FailurePoint, string>>> {
  const points: readonly FailurePoint[] = [
    "before-start",
    "during-side-effect",
    "before-commit",
    "after-commit-before-ack",
    "during-retry",
    "during-shutdown",
  ];
  const outcomes = {} as Record<FailurePoint, string>;
  for (const point of points) {
    try {
      await operation(point);
      outcomes[point] = "converged";
    } catch (error) {
      outcomes[point] =
        error instanceof Error && /^[A-Z][A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "UNCLASSIFIED_FAILURE";
    }
  }
  return Object.freeze(outcomes);
}

export class RegistrationCatalog {
  readonly #registrations = new Map<string, ReadonlySet<string>>();

  register(owner: string, name: string): void {
    if (!/^[a-z][a-z0-9-]+$/.test(owner) || !/^[a-z][a-z0-9.-]+$/.test(name))
      throw new Error("REGISTRATION_INVALID");
    const current = this.#registrations.get(owner) ?? new Set<string>();
    this.#registrations.set(owner, new Set([...current, name]));
  }

  snapshot(owner: string): readonly string[] {
    return [...(this.#registrations.get(owner) ?? [])].sort();
  }
}
