export type QuotaState = "loading" | "unauthenticated" | "ok" | "limited" | "error";

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
    updatedAtIso: new Date().toISOString()
  };
}
