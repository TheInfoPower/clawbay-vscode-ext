import * as vscode from "vscode";
import { AuthManager } from "./auth/auth-manager";
import { migrateLegacySecretTokenToSettings } from "./auth/migration";
import { VscodeSecretStore } from "./auth/secret-store";
import { VscodeSettingsTokenStore } from "./auth/token-store";
import { createRefreshHandler } from "./commands/refresh";
import { createRetryHandler } from "./commands/retry";
import { createSignInHandler } from "./commands/sign-in";
import { createSignOutHandler } from "./commands/sign-out";
import {
  AUTH_STATUS_COMMAND_ID,
  CLEAR_TOKEN_COMMAND_ID,
  LOGIN_COMMAND_ID,
  LOGOUT_COMMAND_ID,
  REFRESH_COMMAND_ID,
  RETRY_COMMAND_ID,
  SET_TOKEN_COMMAND_ID,
  getQuotaApiEndpoint,
  getStatusBarAlignment,
} from "./config/settings";
import { createQuotaClient } from "./quota/client";
import { createTokenProvider } from "./quota/token-provider";
import { createRefreshScheduler } from "./refresh/scheduler";
import { logEvent } from "./telemetry/logging";
import { QuotaStatusBar } from "./ui/status-bar";

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const secretStore = new VscodeSecretStore(context.secrets);
  const tokenStore = new VscodeSettingsTokenStore();
  const migrationResult = await migrateLegacySecretTokenToSettings({
    tokenStore,
    secretStore,
  });
  logEvent("auth.legacy_migration.checked", { result: migrationResult });

  const authManager = new AuthManager(tokenStore);
  const tokenProvider = createTokenProvider({ tokenStore });
  const quotaClient = createQuotaClient({
    apiEndpoint: getQuotaApiEndpoint(),
    tokenProvider,
  });
  const statusBar = new QuotaStatusBar(REFRESH_COMMAND_ID, getStatusBarAlignment());
  statusBar.renderPlaceholder();

  const refreshHandler = createRefreshHandler({
    statusBar,
    mode: "live",
    quotaClient,
    onSnapshot: (snapshot) => {
      statusBar.renderSnapshot(snapshot, {
        unauthenticatedCommandId: SET_TOKEN_COMMAND_ID,
        retryCommandId: RETRY_COMMAND_ID,
      });
    },
    onError: () => {
      statusBar.renderError("Unable to refresh quota right now.");
    },
  });

  const refreshScheduler = createRefreshScheduler({
    onRefresh: refreshHandler,
    debounceMs: 250,
  });

  const refresh = (): Promise<void> => refreshScheduler.requestRefresh("manual");

  const signIn = createSignInHandler({
    authManager,
    onAfterSignIn: refresh,
  });

  const signOut = createSignOutHandler({
    authManager,
    onAfterSignOut: refresh,
  });

  const retry = createRetryHandler({ onRetry: refresh });

  const showAuthStatus = async (): Promise<void> => {
    const status = await authManager.getStatus();
    logEvent("auth.status.checked", { status });
    if (status === "authenticated") {
      await vscode.window.showInformationMessage("Clawbay API token is stored.");
    } else {
      await vscode.window.showWarningMessage("Clawbay API token is not set.");
    }
  };

  context.subscriptions.push(statusBar);
  context.subscriptions.push(vscode.commands.registerCommand(REFRESH_COMMAND_ID, refresh));
  context.subscriptions.push(vscode.commands.registerCommand(RETRY_COMMAND_ID, retry));
  context.subscriptions.push(vscode.commands.registerCommand(SET_TOKEN_COMMAND_ID, signIn));
  context.subscriptions.push(vscode.commands.registerCommand(CLEAR_TOKEN_COMMAND_ID, signOut));
  context.subscriptions.push(vscode.commands.registerCommand(AUTH_STATUS_COMMAND_ID, showAuthStatus));
  context.subscriptions.push(vscode.commands.registerCommand(LOGIN_COMMAND_ID, signIn));
  context.subscriptions.push(vscode.commands.registerCommand(LOGOUT_COMMAND_ID, signOut));

  context.subscriptions.push({ dispose: () => refreshScheduler.dispose() });
  void refreshScheduler.requestRefresh("activation");
}

export function deactivate(): void {
  // No-op for scaffold.
}
