import * as vscode from "vscode";

export const EXTENSION_NAMESPACE = "clawbayQuota";
export const REFRESH_COMMAND_ID = "clawbayQuota.refresh";
export const SET_TOKEN_COMMAND_ID = "clawbayQuota.setToken";
export const TOKEN_SECRET_KEY = "clawbayQuota.apiToken";

export function getStatusBarAlignment(): vscode.StatusBarAlignment {
  const alignment = vscode.workspace
    .getConfiguration(EXTENSION_NAMESPACE)
    .get<string>("statusBarAlignment", "left");

  return alignment === "right"
    ? vscode.StatusBarAlignment.Right
    : vscode.StatusBarAlignment.Left;
}
