import type { SecretStore } from "./secret-store";

export type AuthStatus = "authenticated" | "unauthenticated";

export class AuthManager {
  public constructor(private readonly secretStore: SecretStore) {}

  public async getStatus(): Promise<AuthStatus> {
    const token = await this.secretStore.getToken();
    return token && token.trim() !== "" ? "authenticated" : "unauthenticated";
  }

  public async setToken(token: string): Promise<void> {
    await this.secretStore.setToken(token);
  }

  public async clearToken(): Promise<void> {
    await this.secretStore.clearToken();
  }
}
