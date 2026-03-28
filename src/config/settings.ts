import * as vscode from "vscode";
import { isTokenSource, type TokenSource } from "../quota/token-source";

export const EXTENSION_NAMESPACE = "clawbayQuota";
export const REFRESH_COMMAND_ID = "clawbayQuota.refresh";
export const LOGIN_COMMAND_ID = "clawbayQuota.login";
export const LOGOUT_COMMAND_ID = "clawbayQuota.logout";
export const SET_TOKEN_COMMAND_ID = "clawbayQuota.setToken";
export const CLEAR_TOKEN_COMMAND_ID = "clawbayQuota.clearToken";
export const AUTH_STATUS_COMMAND_ID = "clawbayQuota.authStatus";
export const TOKEN_SECRET_KEY = "clawbayQuota.apiToken";
const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;
const DEFAULT_API_BASE_URL = "https://theclawbay.com/api/codex-auth/v1";
const DEFAULT_TOKEN_ENV_VAR = "CLAWBAY_API_TOKEN";

function trimToUndefined(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function normalizeQuotaEndpoint(baseOrEndpoint: string): string {
  const trimmed = baseOrEndpoint.trim().replace(/\/+$/, "");
  if (trimmed.endsWith("/quota")) {
    return trimmed;
  }

  return `${trimmed}/quota`;
}

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

export function getQuotaApiEndpoint(): string {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  const configured = trimToUndefined(config.get<string>("apiBaseUrl"));
  const envOverride = trimToUndefined(process.env.CLAWBAY_API_BASE_URL);
  const base = configured ?? envOverride ?? DEFAULT_API_BASE_URL;
  return normalizeQuotaEndpoint(base);
}

export function getTokenSource(): TokenSource {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  const configured = config.get<string>("tokenSource", "secretStorage");
  return isTokenSource(configured) ? configured : "secretStorage";
}

export function getSettingsToken(): string | undefined {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  return trimToUndefined(config.get<string>("apiToken"));
}

export function getTokenEnvVarName(): string {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  const configured = trimToUndefined(config.get<string>("apiTokenEnvVar"));
  return configured ?? DEFAULT_TOKEN_ENV_VAR;
}

export function getEnvToken(tokenEnvVarName: string): string | undefined {
  return trimToUndefined(process.env[tokenEnvVarName]);
}
