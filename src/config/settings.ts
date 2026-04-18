import * as vscode from "vscode";

export const EXTENSION_NAMESPACE = "clawbayQuota";
export const REFRESH_COMMAND_ID = "clawbayQuota.refresh";
export const RETRY_COMMAND_ID = "clawbayQuota.retry";
export const LOGIN_COMMAND_ID = "clawbayQuota.login";
export const LOGOUT_COMMAND_ID = "clawbayQuota.logout";
export const SET_TOKEN_COMMAND_ID = "clawbayQuota.setToken";
export const CLEAR_TOKEN_COMMAND_ID = "clawbayQuota.clearToken";
export const AUTH_STATUS_COMMAND_ID = "clawbayQuota.authStatus";
export const TOKEN_SECRET_KEY = "clawbayQuota.apiToken";
export const API_TOKEN_SETTING_KEY = "apiToken";
const DEFAULT_REFRESH_INTERVAL_MINUTES = 5;
const DEFAULT_API_BASE_URL = "https://theclawbay.com/api/codex-auth/v1";

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

function ensureLegacyCodexFormat(endpoint: string): string {
  try {
    const parsed = new URL(endpoint);
    if (parsed.pathname.endsWith("/api/codex-auth/v1/quota") && !parsed.searchParams.has("format")) {
      parsed.searchParams.set("format", "legacy_codex");
    }
    return parsed.toString();
  } catch {
    return endpoint;
  }
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
  const endpoint = normalizeQuotaEndpoint(base);
  return ensureLegacyCodexFormat(endpoint);
}

export function getConfiguredApiToken(): string | undefined {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  const inspected = config.inspect<string>(API_TOKEN_SETTING_KEY);
  return trimToUndefined(inspected?.globalValue);
}

export function setConfiguredApiToken(token: string): Thenable<void> {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  return config.update(API_TOKEN_SETTING_KEY, token.trim(), vscode.ConfigurationTarget.Global);
}

export function clearConfiguredApiToken(): Thenable<void> {
  const config = vscode.workspace.getConfiguration(EXTENSION_NAMESPACE);
  return config.update(API_TOKEN_SETTING_KEY, undefined, vscode.ConfigurationTarget.Global);
}
