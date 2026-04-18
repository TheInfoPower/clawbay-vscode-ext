import * as vscode from "vscode";
import type { AuthManager } from "../auth/auth-manager";
import { getTokenFormatGuidance } from "../auth/token-format";
import { logEvent } from "../telemetry/logging";

export interface SignInContext {
  authManager: AuthManager;
  onAfterSignIn: () => Promise<void>;
}

export function createSignInHandler(context: SignInContext): () => Promise<void> {
  return async (): Promise<void> => {
    logEvent("auth.sign_in.prompted");
    const token = await vscode.window.showInputBox({
      title: "Clawbay API Token",
      prompt: "Paste your Clawbay API token",
      password: true,
      ignoreFocusOut: true,
    });

    if (token === undefined) {
      logEvent("auth.sign_in.cancelled");
      return;
    }

    const trimmed = token.trim();
    if (trimmed === "") {
      logEvent("auth.sign_in.empty");
      await vscode.window.showWarningMessage("API token cannot be empty.");
      return;
    }

    const formatGuidance = getTokenFormatGuidance(trimmed);
    if (formatGuidance) {
      logEvent("auth.sign_in.invalid_format");
      await vscode.window.showErrorMessage(formatGuidance);
      return;
    }

    await context.authManager.setToken(trimmed);
    logEvent("auth.sign_in.saved");
    await context.onAfterSignIn();
  };
}
