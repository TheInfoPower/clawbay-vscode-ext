import * as vscode from "vscode";
import type { AuthManager } from "../auth/auth-manager";
import { logEvent } from "../telemetry/logging";

export interface SignOutContext {
  authManager: AuthManager;
  onAfterSignOut: () => Promise<void>;
}

export function createSignOutHandler(context: SignOutContext): () => Promise<void> {
  return async (): Promise<void> => {
    await context.authManager.clearToken();
    logEvent("auth.sign_out.completed");
    await vscode.window.showInformationMessage("Clawbay API token cleared.");
    await context.onAfterSignOut();
  };
}
