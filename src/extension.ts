import * as vscode from "vscode";
import { AuthManager } from "./auth/auth-manager";
import { VscodeSecretStore } from "./auth/secret-store";
import {
  AUTH_STATUS_COMMAND_ID,
  CLEAR_TOKEN_COMMAND_ID,
  LOGIN_COMMAND_ID,
  LOGOUT_COMMAND_ID,
  REFRESH_COMMAND_ID,
  SET_TOKEN_COMMAND_ID,
  getEnvToken,
  getQuotaApiEndpoint,
  getRefreshIntervalMs,
  getSettingsToken,
  getStatusBarAlignment,
  getTokenEnvVarName,
  getTokenSource,
} from "./config/settings";
import { createQuotaClient } from "./quota/client";
import { createTokenProvider } from "./quota/token-provider";
import { QuotaStatusBar } from "./ui/status-bar";

export function activate(context: vscode.ExtensionContext): void {
  const secretStore = new VscodeSecretStore(context.secrets);
  const authManager = new AuthManager(secretStore);
  const tokenProvider = createTokenProvider({
    secretStore,
    tokenSource: getTokenSource(),
    getSettingsToken,
    getEnvToken: () => getEnvToken(getTokenEnvVarName()),
  });
  const quotaClient = createQuotaClient({
    apiEndpoint: getQuotaApiEndpoint(),
    tokenProvider,
  });
  const statusBar = new QuotaStatusBar(REFRESH_COMMAND_ID, getStatusBarAlignment());
  const refreshIntervalMs = getRefreshIntervalMs();
  let refreshInFlight = false;
  let refreshQueued = false;

  const refresh = async (): Promise<void> => {
    if (refreshInFlight) {
      refreshQueued = true;
      return;
    }
    refreshInFlight = true;
    do {
      refreshQueued = false;
      statusBar.renderLoading();
      try {
        const snapshot = await quotaClient.getQuotaSnapshot();
        statusBar.renderSnapshot(snapshot, SET_TOKEN_COMMAND_ID);
      } catch {
        statusBar.renderError("Unexpected local error while rendering quota placeholder.");
      }
    } while (refreshQueued);
    refreshInFlight = false;
  };

  const setToken = async (): Promise<void> => {
    const token = await vscode.window.showInputBox({
      title: "Clawbay API Token",
      prompt: "Paste your Clawbay API token",
      password: true,
      ignoreFocusOut: true,
    });
    if (token === undefined) {
      return; // user cancelled
    }
    const trimmed = token.trim();
    if (trimmed === "") {
      await vscode.window.showWarningMessage("API token cannot be empty.");
      return;
    }
    await authManager.setToken(trimmed);
    await refresh();
  };

  const clearToken = async (): Promise<void> => {
    await authManager.clearToken();
    await vscode.window.showInformationMessage("Clawbay API token cleared.");
    await refresh();
  };

  const showAuthStatus = async (): Promise<void> => {
    const status = await authManager.getStatus();
    if (status === "authenticated") {
      await vscode.window.showInformationMessage("Clawbay API token is stored.");
    } else {
      await vscode.window.showWarningMessage("Clawbay API token is not set.");
    }
  };

  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand(REFRESH_COMMAND_ID, refresh));
  context.subscriptions.push(vscode.commands.registerCommand(SET_TOKEN_COMMAND_ID, setToken));
  context.subscriptions.push(vscode.commands.registerCommand(CLEAR_TOKEN_COMMAND_ID, clearToken));
  context.subscriptions.push(vscode.commands.registerCommand(AUTH_STATUS_COMMAND_ID, showAuthStatus));
  context.subscriptions.push(vscode.commands.registerCommand(LOGIN_COMMAND_ID, setToken));
  context.subscriptions.push(vscode.commands.registerCommand(LOGOUT_COMMAND_ID, clearToken));

  void refresh();

  if (refreshIntervalMs > 0) {
    const refreshTimer = setInterval(() => void refresh(), refreshIntervalMs);
    context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });
  }
}

export function deactivate(): void {
  // No-op for scaffold.
}
