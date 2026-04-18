const REDACTED_VALUE = "[REDACTED]";
const SENSITIVE_KEY_FRAGMENTS = ["token", "authorization", "secret", "password", "apikey", "api_key", "bearer"];

type LogProperties = Record<string, unknown>;

type JsonValue = string | number | boolean | null | JsonValue[] | { [key: string]: JsonValue };

const JWT_PATTERN = /^[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+\\.[A-Za-z0-9_-]+$/;

function createId(prefix: string): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

export function createCorrelationId(): string {
  return createId("corr");
}

function createEventId(): string {
  return createId("evt");
}

function extractCorrelationId(properties?: LogProperties): string | undefined {
  if (!properties) {
    return undefined;
  }
  const correlationId = properties.correlationId;
  return typeof correlationId === "string" && correlationId.trim() !== "" ? correlationId : undefined;
}

function isSensitiveKey(key: string): boolean {
  const normalized = key.toLowerCase();
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => normalized.includes(fragment));
}

function redactValue(value: unknown): JsonValue {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed === "") {
      return value;
    }
    if (trimmed.toLowerCase().startsWith("bearer ")) {
      return REDACTED_VALUE;
    }
    if (trimmed.length >= 20 && JWT_PATTERN.test(trimmed)) {
      return REDACTED_VALUE;
    }
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map((entry) => redactValue(entry));
  }

  if (typeof value === "object") {
    return redactProperties(value as LogProperties);
  }

  return REDACTED_VALUE;
}

function redactProperties(properties: LogProperties): JsonValue {
  const entries: Record<string, JsonValue> = {};
  for (const [key, value] of Object.entries(properties)) {
    entries[key] = isSensitiveKey(key) ? REDACTED_VALUE : redactValue(value);
  }
  return entries;
}

export function logEvent(name: string, properties?: LogProperties): void {
  const eventId = createEventId();
  const correlationId = extractCorrelationId(properties);
  const payload = {
    id: eventId,
    correlationId,
    name,
    at: new Date().toISOString(),
    properties: properties ? redactProperties(properties) : undefined,
  };

  console.info(`[clawbay] ${JSON.stringify(payload)}`);
}
