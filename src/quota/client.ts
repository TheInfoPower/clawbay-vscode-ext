import type { SecretStore } from "../auth/secret-store";
import { makeSnapshot, type QuotaSnapshot } from "./model";

export interface QuotaClient {
  getQuotaSnapshot(): Promise<QuotaSnapshot>;
}

class StubQuotaClient implements QuotaClient {
  public constructor(private readonly secretStore: SecretStore) {}

  public async getQuotaSnapshot(): Promise<QuotaSnapshot> {
    const token = await this.secretStore.getToken();

    if (!token) {
      return makeSnapshot(
        "unauthenticated",
        "Clawbay: auth required",
        "Token not configured. API contract integration is pending."
      );
    }

    return makeSnapshot(
      "stubbed",
      "Clawbay: quota pending",
      "Connected token found. Live quota API contract is not wired yet."
    );
  }
}

export function createQuotaClient(secretStore: SecretStore): QuotaClient {
  return new StubQuotaClient(secretStore);
}
