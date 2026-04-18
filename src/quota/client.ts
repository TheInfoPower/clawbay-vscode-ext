import { makeSnapshot, parseQuotaApiResponse, type QuotaApiResponse, type QuotaSnapshot } from "./model";
import { getTokenFormatGuidance } from "../auth/token-format";
import type { TokenProvider } from "./token-provider";
const DEFAULT_RETRY_DELAYS_MS = [0, 250, 750];
const DEFAULT_TIMEOUT_MS = 8_000;

export type QuotaClientErrorType = "auth" | "rate-limited" | "transport" | "schema";

export interface QuotaClientRequestContext {
  correlationId: string;
  signal?: AbortSignal;
}

export class QuotaClientError extends Error {
  public constructor(
    public readonly type: QuotaClientErrorType,
    message: string,
    public readonly cause?: unknown
  ) {
    super(message);
  }
}

export interface QuotaClient {
  getQuotaSnapshot(context: QuotaClientRequestContext): Promise<QuotaSnapshot>;
}

function extractServerError(payload: unknown): { code?: string; message?: string } | undefined {
  if (!payload || typeof payload !== "object") {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  const code =
    typeof record["code"] === "string"
      ? record["code"]
      : typeof (record["theclawbayError"] as Record<string, unknown> | undefined)?.["code"] ===
            "string"
        ? String((record["theclawbayError"] as Record<string, unknown>)["code"])
        : undefined;
  const message =
    typeof record["error"] === "string"
      ? record["error"]
      : typeof (record["theclawbayError"] as Record<string, unknown> | undefined)?.["userMessage"] ===
            "string"
        ? String((record["theclawbayError"] as Record<string, unknown>)["userMessage"])
        : undefined;
  if (!code && !message) {
    return undefined;
  }
  return { code, message };
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function fmtHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function waitForDelay(delayMs: number, signal?: AbortSignal): Promise<void> {
  if (delayMs <= 0) {
    return Promise.resolve();
  }
  if (!signal) {
    return new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  if (signal.aborted) {
    return Promise.reject(new QuotaClientError("transport", "Request aborted"));
  }

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", onAbort);
      resolve();
    }, delayMs);

    const onAbort = () => {
      clearTimeout(timeout);
      signal.removeEventListener("abort", onAbort);
      reject(new QuotaClientError("transport", "Request aborted"));
    };

    signal.addEventListener("abort", onAbort, { once: true });
  });
}

function throwIfAborted(signal?: AbortSignal, cause?: unknown): void {
  if (signal?.aborted) {
    throw new QuotaClientError("transport", "Request aborted", cause);
  }
}

function mergeSignals(primary: AbortSignal, secondary?: AbortSignal): AbortSignal {
  if (!secondary) {
    return primary;
  }
  if (typeof AbortSignal !== "undefined" && "any" in AbortSignal) {
    return AbortSignal.any([primary, secondary]);
  }
  const controller = new AbortController();
  const onAbort = () => controller.abort();
  primary.addEventListener("abort", onAbort, { once: true });
  secondary.addEventListener("abort", onAbort, { once: true });
  return controller.signal;
}

function buildSnapshot(data: QuotaApiResponse): QuotaSnapshot {
  const { fiveHour, weekly } = data.usage;
  const state = data.anyLimitReached ? "rate-limited" : "authenticated-with-quota";

  const label =
    state === "rate-limited"
      ? "Clawbay: limit reached"
      : `Clawbay: 5h ${fiveHour.percentUsed.toFixed(1)}%  ·  wk ${weekly.percentUsed.toFixed(1)}%`;

  const detail = [
    `5-hour:  ${fmtUsd(fiveHour.estimatedCostUsdUsed)} / ${fmtUsd(fiveHour.costUsdLimit)} (${fiveHour.percentUsed.toFixed(1)}%)  —  resets in ${fmtHms(fiveHour.secondsUntilReset)}`,
    `Weekly:  ${fmtUsd(weekly.estimatedCostUsdUsed)} / ${fmtUsd(weekly.costUsdLimit)} (${weekly.percentUsed.toFixed(1)}%)  —  resets in ${fmtHms(weekly.secondsUntilReset)}`,
    data.anyLimitReached
      ? "Limit reached. Usage will resume after reset; check again later."
      : "Quota available.",
  ]
    .filter(Boolean)
    .join("\n");

  return { state, label, detail, updatedAtIso: data.observedAt };
}

class ClawbayQuotaClient implements QuotaClient {
  public constructor(
    private readonly apiEndpoint: string,
    private readonly tokenProvider: TokenProvider,
    private readonly retryDelaysMs: number[],
    private readonly timeoutMs: number
  ) {}

  public async getQuotaSnapshot(context: QuotaClientRequestContext): Promise<QuotaSnapshot> {
    try {
      const data = await this.fetchQuotaWithRetry(context);
      return buildSnapshot(data);
    } catch (error) {
      if (error instanceof QuotaClientError) {
        switch (error.type) {
          case "auth":
            // Preserve specific local validation guidance when available.
            if (error.message.startsWith("Invalid token format: ")) {
              return makeSnapshot(
                "unauthenticated",
                "Clawbay: auth required",
                error.message.replace("Invalid token format: ", "")
              );
            }
            return makeSnapshot(
              "unauthenticated",
              "Clawbay: auth required",
              "Token missing or rejected (401/403). Click to update your API token."
            );
          case "rate-limited":
            return makeSnapshot(
              "rate-limited",
              "Clawbay: rate limited",
              "Quota limit reached. Retry after the reset window."
            );
          case "schema":
            return makeSnapshot(
              "transient-failure",
              "Clawbay: unexpected response",
              "API response was unexpected. Retry in a moment."
            );
          case "transport":
          default:
            return makeSnapshot(
              "transient-failure",
              "Clawbay: retry",
              "Temporary error reaching Clawbay. Click to retry."
            );
        }
      }

      return makeSnapshot(
        "transient-failure",
        "Clawbay: retry",
        "Unexpected local error while parsing quota response."
      );
    }
  }

  private async fetchQuotaWithRetry(context: QuotaClientRequestContext): Promise<QuotaApiResponse> {
    let lastError: unknown;

    throwIfAborted(context.signal);

    for (let attempt = 0; attempt < this.retryDelaysMs.length; attempt += 1) {
      throwIfAborted(context.signal);
      const delayMs = this.retryDelaysMs[attempt];
      if (delayMs > 0) {
        const jitter = Math.floor(Math.random() * 120);
        await waitForDelay(delayMs + jitter, context.signal);
      }

      throwIfAborted(context.signal);

      try {
        return await this.fetchQuota(context);
      } catch (error) {
        if (error instanceof QuotaClientError && error.message === "Request aborted") {
          throw error;
        }
        throwIfAborted(context.signal, error);
        if (!(error instanceof QuotaClientError) || error.type !== "transport") {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError ?? new QuotaClientError("transport", "Network error");
  }

  private async fetchQuota(context: QuotaClientRequestContext): Promise<QuotaApiResponse> {
    const token = await this.tokenProvider.getToken();
    if (!token) {
      throw new QuotaClientError("auth", "Missing token");
    }
    const formatGuidance = getTokenFormatGuidance(token);
    if (formatGuidance) {
      throw new QuotaClientError("auth", `Invalid token format: ${formatGuidance}`);
    }
    throwIfAborted(context.signal);

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const signal = mergeSignals(controller.signal, context.signal);

    let response: Response;
    try {
      response = await fetch(this.apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
        signal,
      });
    } catch (error) {
      if ((error as { name?: string }).name === "AbortError") {
        if (context.signal?.aborted) {
          throw new QuotaClientError("transport", "Request aborted", error);
        }
        throw new QuotaClientError("transport", "Request timed out", error);
      }
      throw new QuotaClientError("transport", "Network error", error);
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 401 || response.status === 403) {
      throw new QuotaClientError("auth", "Token rejected");
    }

    if (response.status === 429) {
      throw new QuotaClientError("rate-limited", "Rate limited");
    }

    if (!response.ok) {
      throw new QuotaClientError("transport", `HTTP ${response.status}`);
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (error) {
      throw new QuotaClientError("schema", "Invalid JSON", error);
    }

    const serverError = extractServerError(payload);
    if (serverError) {
      const code = (serverError.code ?? "").toLowerCase();
      const message = serverError.message ?? "Unexpected error response";
      if (code === "invalid_api_key" || code === "missing_bearer_token") {
        throw new QuotaClientError("auth", message);
      }
      if (code === "weekly_cost_limit_reached" || code === "5h_cost_limit_reached") {
        throw new QuotaClientError("rate-limited", message);
      }
      throw new QuotaClientError("transport", message);
    }

    try {
      return parseQuotaApiResponse(payload);
    } catch (error) {
      throw new QuotaClientError("schema", "Schema validation failed", error);
    }
  }
}

export interface QuotaClientOptions {
  apiEndpoint: string;
  tokenProvider: TokenProvider;
  retryDelaysMs?: number[];
  timeoutMs?: number;
}

export function createQuotaClient(options: QuotaClientOptions): QuotaClient {
  return new ClawbayQuotaClient(
    options.apiEndpoint,
    options.tokenProvider,
    options.retryDelaysMs ?? DEFAULT_RETRY_DELAYS_MS,
    options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  );
}
