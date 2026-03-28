import { makeSnapshot, parseQuotaApiResponse, type QuotaApiResponse, type QuotaSnapshot } from "./model";
import type { TokenProvider } from "./token-provider";
const RETRY_DELAYS_MS = [0, 250, 750];

export type QuotaClientErrorType = "auth" | "transport" | "schema";

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
  getQuotaSnapshot(): Promise<QuotaSnapshot>;
}

function fmtUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}

function fmtHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function buildSnapshot(data: QuotaApiResponse): QuotaSnapshot {
  const { fiveHour, weekly } = data.usage;
  const state = data.anyLimitReached ? "limited" : "ok";

  const label = `Clawbay: 5h ${fiveHour.percentUsed.toFixed(1)}%  ·  wk ${weekly.percentUsed.toFixed(1)}%`;

  const detail = [
    `5-hour:  ${fmtUsd(fiveHour.estimatedCostUsdUsed)} / ${fmtUsd(fiveHour.costUsdLimit)} (${fiveHour.percentUsed.toFixed(1)}%)  —  resets in ${fmtHms(fiveHour.secondsUntilReset)}`,
    `Weekly:  ${fmtUsd(weekly.estimatedCostUsdUsed)} / ${fmtUsd(weekly.costUsdLimit)} (${weekly.percentUsed.toFixed(1)}%)  —  resets in ${fmtHms(weekly.secondsUntilReset)}`,
    data.anyLimitReached ? "⚠ A limit has been reached." : "",
  ]
    .filter(Boolean)
    .join("\n");

  return { state, label, detail, updatedAtIso: data.observedAt };
}

class ClawbayQuotaClient implements QuotaClient {
  public constructor(
    private readonly apiEndpoint: string,
    private readonly tokenProvider: TokenProvider
  ) {}

  public async getQuotaSnapshot(): Promise<QuotaSnapshot> {
    try {
      const data = await this.fetchQuotaWithRetry();
      return buildSnapshot(data);
    } catch (error) {
      if (error instanceof QuotaClientError) {
        switch (error.type) {
          case "auth":
            return makeSnapshot(
              "unauthenticated",
              "Clawbay: auth required",
              "Token missing or rejected (401/403). Click to update your API token."
            );
          case "schema":
            return makeSnapshot(
              "error",
              "Clawbay: schema error",
              "API response did not match the expected schema."
            );
          case "transport":
          default:
            return makeSnapshot(
              "error",
              "Clawbay: error",
              "API request failed due to a network or server issue."
            );
        }
      }

      return makeSnapshot(
        "error",
        "Clawbay: error",
        "Unexpected local error while parsing quota response."
      );
    }
  }

  private async fetchQuotaWithRetry(): Promise<QuotaApiResponse> {
    let lastError: unknown;

    for (let attempt = 0; attempt < RETRY_DELAYS_MS.length; attempt += 1) {
      const delayMs = RETRY_DELAYS_MS[attempt];
      if (delayMs > 0) {
        const jitter = Math.floor(Math.random() * 120);
        await new Promise((resolve) => setTimeout(resolve, delayMs + jitter));
      }

      try {
        return await this.fetchQuota();
      } catch (error) {
        if (!(error instanceof QuotaClientError) || error.type !== "transport") {
          throw error;
        }
        lastError = error;
      }
    }

    throw lastError ?? new QuotaClientError("transport", "Network error");
  }

  private async fetchQuota(): Promise<QuotaApiResponse> {
    const token = await this.tokenProvider.getToken();
    if (!token) {
      throw new QuotaClientError("auth", "Missing token");
    }

    let response: Response;
    try {
      response = await fetch(this.apiEndpoint, {
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (error) {
      throw new QuotaClientError("transport", "Network error", error);
    }

    if (response.status === 401 || response.status === 403) {
      throw new QuotaClientError("auth", "Token rejected");
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
}

export function createQuotaClient(options: QuotaClientOptions): QuotaClient {
  return new ClawbayQuotaClient(options.apiEndpoint, options.tokenProvider);
}
