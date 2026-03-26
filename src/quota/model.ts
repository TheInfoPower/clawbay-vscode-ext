import { z } from "zod";

export type QuotaState = "loading" | "unauthenticated" | "ok" | "limited" | "error";

const UsageWindowSchema = z.object({
  windowStart: z.string(),
  windowEnd: z.string(),
  secondsUntilReset: z.number(),
  requestCount: z.number(),
  estimatedCostUsdUsed: z.number(),
  costUsdLimit: z.number(),
  costUsdRemaining: z.number(),
  percentUsed: z.number(),
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
  return QuotaApiResponseSchema.parse(payload);
}

export { QuotaApiResponseSchema, UsageWindowSchema };
