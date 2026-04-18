import { z } from "zod";

export type QuotaState =
  | "loading"
  | "unauthenticated"
  | "authenticated-with-quota"
  | "rate-limited"
  | "transient-failure";

const UsageWindowSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  secondsUntilReset: z.coerce.number(),
  requestCount: z.coerce.number(),
  estimatedCostUsdUsed: z.coerce.number(),
  costUsdLimit: z.coerce.number(),
  costUsdRemaining: z.coerce.number(),
  percentUsed: z.coerce.number(),
  limitReached: z.boolean(),
});

const QuotaApiResponseSchema = z.object({
  observedAt: z.string(),
  anyLimitReached: z.boolean(),
  fiveHourLimitReached: z.boolean(),
  weeklyLimitReached: z.boolean(),
  usage: z.object({
    fiveHour: UsageWindowSchema,
    weekly: UsageWindowSchema,
  }),
});

export type UsageWindow = z.infer<typeof UsageWindowSchema>;
export type QuotaApiResponse = z.infer<typeof QuotaApiResponseSchema>;

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
    return QuotaApiResponseSchema.parse(payload);
  } catch {
    return QuotaApiResponseSchema.parse(normalizeQuotaPayload(payload));
  }
}

export { QuotaApiResponseSchema, UsageWindowSchema };

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

  const fiveHourPercent = toNumber(primary["used_percent"]);
  const weeklyPercent = toNumber(secondary["used_percent"]);
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
    window["estimatedCostUsdUsed"] ?? window["estimated_cost_usd_used"] ?? window["costUsedUsd"]
  );
  const costLimit = toNumber(
    window["costUsdLimit"] ?? window["cost_usd_limit"] ?? window["limitUsd"]
  );
  const costRemaining = toNumber(
    window["costUsdRemaining"] ??
      window["cost_usd_remaining"] ??
      (Number.isFinite(costLimit) && Number.isFinite(costUsed)
        ? (costLimit as number) - (costUsed as number)
        : undefined)
  );
  const percentUsed = toNumber(
    window["percentUsed"] ??
      window["percent_used"] ??
      (Number.isFinite(costLimit) && Number.isFinite(costUsed) && (costLimit as number) > 0
        ? ((costUsed as number) / (costLimit as number)) * 100
        : 0)
  );

  return {
    windowStart: toStringOrNow(window["windowStart"] ?? window["window_start"]),
    windowEnd: toStringOrNow(window["windowEnd"] ?? window["window_end"]),
    secondsUntilReset: toNumber(window["secondsUntilReset"] ?? window["seconds_until_reset"]),
    requestCount: toNumber(window["requestCount"] ?? window["request_count"] ?? 0),
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

function toNumber(value: unknown): number {
  const num = typeof value === "string" ? Number(value) : (value as number);
  return Number.isFinite(num) ? num : 0;
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
  const unix = toNumber(value);
  if (unix > 0) {
    return new Date(unix * 1000).toISOString();
  }
  return new Date().toISOString();
}

function windowStartFromReset(window: Record<string, unknown>): string {
  const endIso = isoFromUnixOrNow(window["reset_at"]);
  const limitSeconds = toNumber(window["limit_window_seconds"]);
  const endMs = new Date(endIso).getTime();
  if (!Number.isFinite(endMs) || limitSeconds <= 0) {
    return new Date().toISOString();
  }
  return new Date(endMs - limitSeconds * 1000).toISOString();
}
