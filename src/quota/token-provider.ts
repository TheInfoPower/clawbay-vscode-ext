import type { SecretStore } from "../auth/secret-store";
import type { TokenSource } from "./token-source";

export interface TokenProvider {
  getToken(): Promise<string | undefined>;
}

interface TokenProviderOptions {
  secretStore: SecretStore;
  tokenSource: TokenSource;
  getSettingsToken: () => string | undefined;
  getEnvToken: () => string | undefined;
}

class SecretTokenProvider implements TokenProvider {
  public constructor(private readonly secretStore: SecretStore) {}

  public getToken(): Promise<string | undefined> {
    return Promise.resolve(this.secretStore.getToken());
  }
}

class SettingsTokenProvider implements TokenProvider {
  public constructor(
    private readonly getSettingsToken: () => string | undefined,
    private readonly getEnvToken: () => string | undefined
  ) {}

  public async getToken(): Promise<string | undefined> {
    return this.getSettingsToken() ?? this.getEnvToken();
  }
}

class EnvTokenProvider implements TokenProvider {
  public constructor(private readonly getEnvToken: () => string | undefined) {}

  public async getToken(): Promise<string | undefined> {
    return this.getEnvToken();
  }
}

export function createTokenProvider(options: TokenProviderOptions): TokenProvider {
  switch (options.tokenSource) {
    case "settings":
      return new SettingsTokenProvider(options.getSettingsToken, options.getEnvToken);
    case "environment":
      return new EnvTokenProvider(options.getEnvToken);
    case "secretStorage":
    default:
      return new SecretTokenProvider(options.secretStore);
  }
}
