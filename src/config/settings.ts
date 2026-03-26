import * as vscode from "vscode";

export const EXTENSION_NAMESPACE = "clawbayQuota";
export const REFRESH_COMMAND_ID = "clawbayQuota.refresh";
export const LOGIN_COMMAND_ID = "clawbayQuota.login";
export const LOGOUT_COMMAND_ID = "clawbayQuota.logout";
export const TOKEN_SECRET_KEY = "clawbayQuota.apiToken";
const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;

export function getStatusBarAlignment(): vscode.StatusBarAlignment {
  const alignment = vscode.workspace
    .getConfiguration(EXTENSION_NAMESPACE)
    .get<string>("statusBarAlignment", "left");

  return alignment === "right"
    ? vscode.StatusBarAlignment.Right
    : vscode.StatusBarAlignment.Left;
}

export function getRefreshIntervalMs(): number {
  const value = vscode.workspace
    .getConfiguration(EXTENSION_NAMESPACE)
    .get<number>("refreshIntervalMinutes", DEFAULT_REFRESH_INTERVAL_MINUTES);

  if (value === undefined || !Number.isFinite(value) || value <= 0) {
    return 0;
  }

  return Math.round(value * 60 * 1000);
}
