import type { SecretStore } from "./secret-store";
import type { TokenStore } from "./token-store";

export type LegacyTokenMigrationResult = "migrated" | "cleared-legacy" | "noop";

interface LegacyTokenMigrationOptions {
  tokenStore: TokenStore;
  secretStore: SecretStore;
}

export async function migrateLegacySecretTokenToSettings(
  options: LegacyTokenMigrationOptions
): Promise<LegacyTokenMigrationResult> {
  const configuredToken = await options.tokenStore.getToken();
  const legacyToken = await options.secretStore.getToken();
  const normalizedLegacyToken = legacyToken?.trim();

  if (!normalizedLegacyToken) {
    return "noop";
  }

  if (configuredToken) {
    await options.secretStore.clearToken();
    return "cleared-legacy";
  }

  await options.tokenStore.setToken(normalizedLegacyToken);
  await options.secretStore.clearToken();
  return "migrated";
}
