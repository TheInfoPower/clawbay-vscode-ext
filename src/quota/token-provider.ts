import type { TokenStore } from "../auth/token-store";

export interface TokenProvider {
  getToken(): Promise<string | undefined>;
}

interface TokenProviderOptions {
  tokenStore: TokenStore;
}

class SettingsTokenProvider implements TokenProvider {
  public constructor(private readonly tokenStore: TokenStore) {}

  public getToken(): Promise<string | undefined> {
    return Promise.resolve(this.tokenStore.getToken());
  }
}

export function createTokenProvider(options: TokenProviderOptions): TokenProvider {
  return new SettingsTokenProvider(options.tokenStore);
}
