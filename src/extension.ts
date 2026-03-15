import * as vscode from "vscode";
import { VscodeSecretStore } from "./auth/secret-store";
import { REFRESH_COMMAND_ID, SET_TOKEN_COMMAND_ID, getStatusBarAlignment } from "./config/settings";
import { createQuotaClient } from "./quota/client";
import { QuotaStatusBar } from "./ui/status-bar";

export function activate(context: vscode.ExtensionContext): void {
  const secretStore = new VscodeSecretStore(context.secrets);
  const quotaClient = createQuotaClient(secretStore);
  const statusBar = new QuotaStatusBar(REFRESH_COMMAND_ID, getStatusBarAlignment());

  const refresh = async (): Promise<void> => {
    statusBar.renderLoading();
    try {
      const snapshot = await quotaClient.getQuotaSnapshot();
      statusBar.renderSnapshot(snapshot, SET_TOKEN_COMMAND_ID);
    } catch {
      statusBar.renderError("Unexpected local error while rendering quota placeholder.");
    }
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
    if (token.trim() === "") {
      await secretStore.clearToken();
    } else {
      await secretStore.setToken(token.trim());
    }
    await refresh();
  };

  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand(REFRESH_COMMAND_ID, refresh));
  context.subscriptions.push(vscode.commands.registerCommand(SET_TOKEN_COMMAND_ID, setToken));

  void refresh();
}

export function deactivate(): void {
  // No-op for scaffold.
}
