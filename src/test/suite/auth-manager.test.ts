import * as assert from "assert";
import { AuthManager } from "../../auth/auth-manager";

const makeTokenStore = () => {
  let token: string | undefined;
  return {
    getToken: async () => token,
    setToken: async (nextToken: string) => {
      token = nextToken;
    },
    clearToken: async () => {
      token = undefined;
    },
  };
};

suite("Auth manager", () => {
  test("transitions between unauthenticated and authenticated states", async () => {
    const tokenStore = makeTokenStore();
    const manager = new AuthManager(tokenStore);

    assert.equal(await manager.getStatus(), "unauthenticated");
    await manager.setToken("sk-proj-123");
    assert.equal(await manager.getStatus(), "authenticated");
  });

  test("clearToken signs out and clears persisted token", async () => {
    const tokenStore = makeTokenStore();
    const manager = new AuthManager(tokenStore);

    await manager.setToken("sk-proj-123");
    assert.equal(await manager.getStatus(), "authenticated");

    await manager.clearToken();
    assert.equal(await manager.getStatus(), "unauthenticated");
  });
});
