import * as assert from "assert";
import { migrateLegacySecretTokenToSettings } from "../../auth/migration";

const makeTokenStore = (token: string | undefined) => {
  let currentToken = token;
  return {
    getToken: async () => currentToken,
    setToken: async (nextToken: string) => {
      currentToken = nextToken;
    },
    clearToken: async () => {
      currentToken = undefined;
    },
  };
};

const makeSecretStore = (token: string | undefined) => {
  let currentToken = token;
  return {
    getToken: async () => currentToken,
    setToken: async (_nextToken: string) => undefined,
    clearToken: async () => {
      currentToken = undefined;
    },
  };
};

suite("Legacy token migration", () => {
  test("migrates secret token when settings token is missing", async () => {
    const tokenStore = makeTokenStore(undefined);
    const secretStore = makeSecretStore("sk-proj-legacy");

    const result = await migrateLegacySecretTokenToSettings({
      tokenStore,
      secretStore,
    });

    assert.equal(result, "migrated");
    assert.equal(await tokenStore.getToken(), "sk-proj-legacy");
    assert.equal(await secretStore.getToken(), undefined);
  });

  test("keeps settings token and clears legacy secret when both exist", async () => {
    const tokenStore = makeTokenStore("sk-proj-settings");
    const secretStore = makeSecretStore("sk-proj-legacy");

    const result = await migrateLegacySecretTokenToSettings({
      tokenStore,
      secretStore,
    });

    assert.equal(result, "cleared-legacy");
    assert.equal(await tokenStore.getToken(), "sk-proj-settings");
    assert.equal(await secretStore.getToken(), undefined);
  });

  test("does nothing when no legacy token exists", async () => {
    const tokenStore = makeTokenStore(undefined);
    const secretStore = makeSecretStore(undefined);

    const result = await migrateLegacySecretTokenToSettings({
      tokenStore,
      secretStore,
    });

    assert.equal(result, "noop");
    assert.equal(await tokenStore.getToken(), undefined);
    assert.equal(await secretStore.getToken(), undefined);
  });
});
