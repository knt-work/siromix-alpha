import { Context } from "@temporalio/activity";

const deliveries = new Map<string, number>();

export async function foundationTypeScriptSmoke(input: {
  idempotencyKey: string;
  failuresBeforeSuccess?: number;
}) {
  const context = Context.current();
  context.heartbeat({ attempt: context.info.attempt });
  if (context.info.attempt <= (input.failuresBeforeSuccess ?? 0))
    throw new Error("INJECTED_RETRYABLE_ACTIVITY_FAILURE");
  const count = deliveries.get(input.idempotencyKey) ?? 0;
  deliveries.set(input.idempotencyKey, count + 1);
  return {
    ok: true as const,
    runtime: "typescript" as const,
    attempt: context.info.attempt,
    idempotencyKey: input.idempotencyKey,
  };
}

export async function foundationHeartbeatActivity(input: {
  iterations: number;
  intervalMs: number;
  stallAfterFirst?: boolean;
}) {
  const context = Context.current();
  for (let index = 0; index < input.iterations; index += 1) {
    context.heartbeat({ index });
    await new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        resolve,
        input.stallAfterFirst && index === 0
          ? input.intervalMs * 5
          : input.intervalMs,
      );
      context.cancellationSignal.addEventListener(
        "abort",
        () => {
          clearTimeout(timer);
          reject(new Error("ACTIVITY_CANCELLED"));
        },
        { once: true },
      );
    });
  }
  return { heartbeats: input.iterations };
}
