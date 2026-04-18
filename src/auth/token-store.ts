import {
  clearConfiguredApiToken,
  getConfiguredApiToken,
  setConfiguredApiToken,
} from "../config/settings";

export interface TokenStore {
  getToken(): Promise<string | undefined>;
  setToken(token: string): Promise<void>;
  clearToken(): Promise<void>;
}

export class VscodeSettingsTokenStore implements TokenStore {
  public async getToken(): Promise<string | undefined> {
    return getConfiguredApiToken();
  }

  public async setToken(token: string): Promise<void> {
    await setConfiguredApiToken(token);
  }

  public async clearToken(): Promise<void> {
    await clearConfiguredApiToken();
  }
}
