import * as vscode from "vscode";
import { TOKEN_SECRET_KEY } from "../config/settings";

export interface SecretStore {
  getToken(): Thenable<string | undefined>;
  setToken(token: string): Thenable<void>;
  clearToken(): Thenable<void>;
}

export class VscodeSecretStore implements SecretStore {
  public constructor(private readonly secrets: vscode.SecretStorage) {}

  public getToken(): Thenable<string | undefined> {
    return this.secrets.get(TOKEN_SECRET_KEY);
  }

  public setToken(token: string): Thenable<void> {
    return this.secrets.store(TOKEN_SECRET_KEY, token);
  }

  public clearToken(): Thenable<void> {
    return this.secrets.delete(TOKEN_SECRET_KEY);
  }
}
