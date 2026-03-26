import * as vscode from "vscode";
import { VscodeSecretStore } from "./auth/secret-store";
import {
  LOGIN_COMMAND_ID,
  LOGOUT_COMMAND_ID,
  REFRESH_COMMAND_ID,
  getRefreshIntervalMs,
  getStatusBarAlignment,
} from "./config/settings";
import { createQuotaClient } from "./quota/client";
import { QuotaStatusBar } from "./ui/status-bar";

export function activate(context: vscode.ExtensionContext): void {
  const secretStore = new VscodeSecretStore(context.secrets);
  const quotaClient = createQuotaClient(secretStore);
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
        statusBar.renderSnapshot(snapshot, LOGIN_COMMAND_ID);
      } catch {
        statusBar.renderError("Unexpected local error while rendering quota placeholder.");
      }
    } while (refreshQueued);
    refreshInFlight = false;
  };

  const login = async (): Promise<void> => {
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
    await secretStore.setToken(trimmed);
    await refresh();
  };

  const logout = async (): Promise<void> => {
    await secretStore.clearToken();
    await vscode.window.showInformationMessage("Clawbay API token cleared.");
    await refresh();
  };

  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand(REFRESH_COMMAND_ID, refresh));
  context.subscriptions.push(vscode.commands.registerCommand(LOGIN_COMMAND_ID, login));
  context.subscriptions.push(vscode.commands.registerCommand(LOGOUT_COMMAND_ID, logout));

  void refresh();

  if (refreshIntervalMs > 0) {
    const refreshTimer = setInterval(() => void refresh(), refreshIntervalMs);
    context.subscriptions.push({ dispose: () => clearInterval(refreshTimer) });
  }
}

export function deactivate(): void {
  // No-op for scaffold.
}
