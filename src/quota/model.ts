export type QuotaState =
  | "loading"
  | "unauthenticated"
  | "authenticated-with-quota"
  | "rate-limited"
  | "transient-failure";

export interface UsageWindow {
  windowStart: string;
  windowEnd: string;
  secondsUntilReset: number;
  requestCount: number;
  estimatedCostUsdUsed: number;
  costUsdLimit: number;
  costUsdRemaining: number;
  percentUsed: number;
  limitReached: boolean;
}

export interface QuotaApiResponse {
  observedAt: string;
  anyLimitReached: boolean;
  fiveHourLimitReached: boolean;
  weeklyLimitReached: boolean;
  usage: {
    fiveHour: UsageWindow;
    weekly: UsageWindow;
  };
}

export interface QuotaSnapshot {
  state: QuotaState;
  label: string;
  detail: string;
  updatedAtIso: string;
}

export function makeSnapshot(state: QuotaState, label: string, detail: string): QuotaSnapshot {
  return {
    state,
    label,
    detail,
    updatedAtIso: new Date().toISOString(),
  };
}

export function parseQuotaApiResponse(payload: unknown): QuotaApiResponse {
  try {
    return parseNormalizedPayload(payload);
  } catch {
    return parseNormalizedPayload(normalizeQuotaPayload(payload));
  }
}

function parseNormalizedPayload(payload: unknown): QuotaApiResponse {
  const record = asRecord(payload, "Invalid quota payload");
  const usageRecord = asRecord(record["usage"], "Invalid quota payload: usage must be an object");

  return {
    observedAt: asString(record["observedAt"], "Invalid quota payload: observedAt must be a string"),
    anyLimitReached: asBoolean(
      record["anyLimitReached"],
      "Invalid quota payload: anyLimitReached must be a boolean"
    ),
    fiveHourLimitReached: asBoolean(
      record["fiveHourLimitReached"],
      "Invalid quota payload: fiveHourLimitReached must be a boolean"
    ),
    weeklyLimitReached: asBoolean(
      record["weeklyLimitReached"],
      "Invalid quota payload: weeklyLimitReached must be a boolean"
    ),
    usage: {
      fiveHour: parseUsageWindow(usageRecord["fiveHour"], "fiveHour"),
      weekly: parseUsageWindow(usageRecord["weekly"], "weekly"),
    },
  };
}

function parseUsageWindow(value: unknown, windowName: string): UsageWindow {
  const record = asRecord(value, `Invalid quota payload: usage.${windowName} must be an object`);

  return {
    windowStart: asString(
      record["windowStart"],
      `Invalid quota payload: usage.${windowName}.windowStart must be a string`
    ),
    windowEnd: asString(
      record["windowEnd"],
      `Invalid quota payload: usage.${windowName}.windowEnd must be a string`
    ),
    secondsUntilReset: asNumber(
      record["secondsUntilReset"],
      `Invalid quota payload: usage.${windowName}.secondsUntilReset must be numeric`
    ),
    requestCount: asNumber(
      record["requestCount"],
      `Invalid quota payload: usage.${windowName}.requestCount must be numeric`
    ),
    estimatedCostUsdUsed: asNumber(
      record["estimatedCostUsdUsed"],
      `Invalid quota payload: usage.${windowName}.estimatedCostUsdUsed must be numeric`
    ),
    costUsdLimit: asNumber(
      record["costUsdLimit"],
      `Invalid quota payload: usage.${windowName}.costUsdLimit must be numeric`
    ),
    costUsdRemaining: asNumber(
      record["costUsdRemaining"],
      `Invalid quota payload: usage.${windowName}.costUsdRemaining must be numeric`
    ),
    percentUsed: asNumber(
      record["percentUsed"],
      `Invalid quota payload: usage.${windowName}.percentUsed must be numeric`
    ),
    limitReached: asBoolean(
      record["limitReached"],
      `Invalid quota payload: usage.${windowName}.limitReached must be a boolean`
    ),
  };
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object") {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new Error(message);
  }
  return value;
}

function asBoolean(value: unknown, message: string): boolean {
  if (typeof value !== "boolean") {
    throw new Error(message);
  }
  return value;
}

function asNumber(value: unknown, message: string): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  throw new Error(message);
}

function normalizeQuotaPayload(payload: unknown): unknown {
  if (!payload || typeof payload !== "object") {
    return payload;
  }

  const asRecord = payload as Record<string, unknown>;
  const root =
    typeof asRecord["data"] === "object" && asRecord["data"] !== null
      ? (asRecord["data"] as Record<string, unknown>)
      : asRecord;

  const usage = extractUsage(root);
  if (!usage && hasRateLimitWindows(root)) {
    return normalizeRateLimitShape(root);
  }
  if (!usage) {
    return payload;
  }

  const observedAt = toStringOrNow(root["observedAt"] ?? root["observed_at"]);
  const fiveHour = usage.fiveHour;
  const weekly = usage.weekly;
  const fiveHourLimitReached = toBoolean(
    root["fiveHourLimitReached"] ?? root["five_hour_limit_reached"] ?? fiveHour["limitReached"]
  );
  const weeklyLimitReached = toBoolean(
    root["weeklyLimitReached"] ?? root["weekly_limit_reached"] ?? weekly["limitReached"]
  );

  return {
    observedAt,
    anyLimitReached: toBoolean(
      root["anyLimitReached"] ??
        root["any_limit_reached"] ??
        (fiveHourLimitReached || weeklyLimitReached)
    ),
    fiveHourLimitReached,
    weeklyLimitReached,
    usage: {
      fiveHour: normalizeWindow(fiveHour),
      weekly: normalizeWindow(weekly),
    },
  };
}

function hasRateLimitWindows(root: Record<string, unknown>): boolean {
  const rateLimit = root["rate_limit"];
  if (!rateLimit || typeof rateLimit !== "object") {
    return false;
  }
  const rl = rateLimit as Record<string, unknown>;
  return Boolean(
    (rl["primary_window"] && typeof rl["primary_window"] === "object") ||
      (rl["secondary_window"] && typeof rl["secondary_window"] === "object")
  );
}

function normalizeRateLimitShape(root: Record<string, unknown>): unknown {
  const rateLimit = root["rate_limit"] as Record<string, unknown>;
  const primary = (rateLimit["primary_window"] as Record<string, unknown>) ?? {};
  const secondary = (rateLimit["secondary_window"] as Record<string, unknown>) ?? {};

  const fiveHourPercent = toNumber(primary["used_percent"], 0);
  const weeklyPercent = toNumber(secondary["used_percent"], 0);
  const fiveHourLimitReached = toBoolean(primary["limit_reached"] ?? rateLimit["limit_reached"]);
  const weeklyLimitReached = toBoolean(secondary["limit_reached"] ?? false);

  return {
    observedAt: new Date().toISOString(),
    anyLimitReached: toBoolean(rateLimit["limit_reached"] ?? (fiveHourLimitReached || weeklyLimitReached)),
    fiveHourLimitReached,
    weeklyLimitReached,
    usage: {
      fiveHour: normalizeWindow({
        windowStart: windowStartFromReset(primary),
        windowEnd: isoFromUnixOrNow(primary["reset_at"]),
        secondsUntilReset: primary["reset_after_seconds"],
        requestCount: 0,
        estimatedCostUsdUsed: fiveHourPercent,
        costUsdLimit: 100,
        costUsdRemaining: 100 - fiveHourPercent,
        percentUsed: fiveHourPercent,
        limitReached: fiveHourLimitReached,
      }),
      weekly: normalizeWindow({
        windowStart: windowStartFromReset(secondary),
        windowEnd: isoFromUnixOrNow(secondary["reset_at"]),
        secondsUntilReset: secondary["reset_after_seconds"],
        requestCount: 0,
        estimatedCostUsdUsed: weeklyPercent,
        costUsdLimit: 100,
        costUsdRemaining: 100 - weeklyPercent,
        percentUsed: weeklyPercent,
        limitReached: weeklyLimitReached,
      }),
    },
  };
}

function extractUsage(root: Record<string, unknown>):
  | { fiveHour: Record<string, unknown>; weekly: Record<string, unknown> }
  | undefined {
  if (
    root["usage"] &&
    typeof root["usage"] === "object" &&
    (root["usage"] as Record<string, unknown>)["fiveHour"] &&
    (root["usage"] as Record<string, unknown>)["weekly"]
  ) {
    const usage = root["usage"] as Record<string, unknown>;
    return {
      fiveHour: usage["fiveHour"] as Record<string, unknown>,
      weekly: usage["weekly"] as Record<string, unknown>,
    };
  }

  if (root["fiveHour"] && root["weekly"]) {
    return {
      fiveHour: root["fiveHour"] as Record<string, unknown>,
      weekly: root["weekly"] as Record<string, unknown>,
    };
  }

  if (root["five_hour"] && root["weekly"]) {
    return {
      fiveHour: root["five_hour"] as Record<string, unknown>,
      weekly: root["weekly"] as Record<string, unknown>,
    };
  }

  return undefined;
}

function normalizeWindow(window: Record<string, unknown>): Record<string, unknown> {
  const costUsed = toNumber(
    window["estimatedCostUsdUsed"] ?? window["estimated_cost_usd_used"] ?? window["costUsedUsd"],
    0
  );
  const costLimit = toNumber(window["costUsdLimit"] ?? window["cost_usd_limit"] ?? window["limitUsd"], 0);
  const costRemaining = toNumber(
    window["costUsdRemaining"] ??
      window["cost_usd_remaining"] ??
      (Number.isFinite(costLimit) && Number.isFinite(costUsed) ? costLimit - costUsed : undefined),
    0
  );
  const percentUsed = toNumber(
    window["percentUsed"] ??
      window["percent_used"] ??
      (Number.isFinite(costLimit) && Number.isFinite(costUsed) && costLimit > 0
        ? (costUsed / costLimit) * 100
        : 0),
    0
  );

  return {
    windowStart: toStringOrNow(window["windowStart"] ?? window["window_start"]),
    windowEnd: toStringOrNow(window["windowEnd"] ?? window["window_end"]),
    secondsUntilReset: toNumber(window["secondsUntilReset"] ?? window["seconds_until_reset"], 0),
    requestCount: toNumber(window["requestCount"] ?? window["request_count"] ?? 0, 0),
    estimatedCostUsdUsed: costUsed,
    costUsdLimit: costLimit,
    costUsdRemaining: costRemaining,
    percentUsed,
    limitReached: toBoolean(window["limitReached"] ?? window["limit_reached"] ?? false),
  };
}

function toStringOrNow(value: unknown): string {
  return typeof value === "string" && value.trim() !== "" ? value : new Date().toISOString();
}

function toNumber(value: unknown, fallback: number): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  if (typeof value === "number") {
    return value !== 0;
  }
  return false;
}

function isoFromUnixOrNow(value: unknown): string {
  const unix = toNumber(value, 0);
  if (unix > 0) {
    return new Date(unix * 1000).toISOString();
  }
  return new Date().toISOString();
}

function windowStartFromReset(window: Record<string, unknown>): string {
  const endIso = isoFromUnixOrNow(window["reset_at"]);
  const limitSeconds = toNumber(window["limit_window_seconds"], 0);
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(endMs) || limitSeconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(endMs - limitSeconds * 1000).toISOString();
}
