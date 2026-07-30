const prohibitedKeys =
  /password|secret|token|authorization|cookie|signed.?url|object.?key|prompt|answer|question|content|bytes/i;
const prohibitedValues =
  /(?:bearer\s+\S+|https?:\/\/\S+[?&](?:token|signature|x-amz-signature)=\S+|-----BEGIN [A-Z ]*PRIVATE KEY-----|sk-(?:proj-)?[A-Za-z0-9_-]{12,})/i;
export function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [
        key,
        prohibitedKeys.test(key) ? "[REDACTED]" : redact(item),
      ]),
    );
  }
  if (typeof value === "string" && prohibitedValues.test(value))
    return "[REDACTED]";
  return value;
}
export type TraceContext = Readonly<{
  correlationId: string;
  causationId: string;
  traceparent?: string;
}>;
export function safeError(code: string, correlationId: string) {
  return { code, correlationId };
}

export const sharedBoundaries = [
  "http",
  "temporal",
  "database-outbox",
  "storage",
  "provider",
] as const;
export type SharedBoundary = (typeof sharedBoundaries)[number];
export type TraceCarrier = TraceContext &
  Readonly<{ visited: readonly SharedBoundary[] }>;

export function createTraceCarrier(context: TraceContext): TraceCarrier {
  if (!context.correlationId || !context.causationId)
    throw new Error("TRACE_CONTEXT_REQUIRED");
  return { ...context, visited: [] };
}

export function propagateTrace(
  carrier: TraceCarrier,
  boundary: SharedBoundary,
): TraceCarrier {
  if (!sharedBoundaries.includes(boundary))
    throw new Error("TRACE_BOUNDARY_UNSUPPORTED");
  return { ...carrier, visited: [...carrier.visited, boundary] };
}
