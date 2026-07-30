const prohibitedKeys =
  /password|secret|token|authorization|cookie|signed.?url|object.?key|prompt|answer|question|content|bytes/i;
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
