import type { TokenStore } from "./token-store";

export type AuthStatus = "authenticated" | "unauthenticated";

export class AuthManager {
  public constructor(private readonly tokenStore: TokenStore) {}

  public async getStatus(): Promise<AuthStatus> {
    const token = await this.tokenStore.getToken();
    return token && token.trim() !== "" ? "authenticated" : "unauthenticated";
  }

  public async setToken(token: string): Promise<void> {
    await this.tokenStore.setToken(token);
  }

  public async clearToken(): Promise<void> {
    await this.tokenStore.clearToken();
  }
}
