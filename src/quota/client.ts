import type { SecretStore } from "../auth/secret-store";
import { makeSnapshot, type QuotaApiResponse, type QuotaSnapshot } from "./model";

const QUOTA_URL = "https://theclawbay.com/api/codex-auth/v1/quota";

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
  public constructor(private readonly secretStore: SecretStore) {}

  public async getQuotaSnapshot(): Promise<QuotaSnapshot> {
    const token = await this.secretStore.getToken();
    if (!token) {
      return makeSnapshot(
        "unauthenticated",
        "Clawbay: auth required",
        "Click to set your API token."
      );
    }

    const response = await fetch(QUOTA_URL, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.status === 401 || response.status === 403) {
      return makeSnapshot(
        "unauthenticated",
        "Clawbay: auth required",
        "Token rejected (401/403). Click to update your API token."
      );
    }

    if (!response.ok) {
      return makeSnapshot(
        "error",
        "Clawbay: error",
        `API request failed: HTTP ${response.status}`
      );
    }

    const data = (await response.json()) as QuotaApiResponse;
    return buildSnapshot(data);
  }
}

export function createQuotaClient(secretStore: SecretStore): QuotaClient {
  return new ClawbayQuotaClient(secretStore);
}
