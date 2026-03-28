import * as assert from "assert";
import { createQuotaClient, QuotaClientError } from "../../quota/client";
import { parseQuotaApiResponse } from "../../quota/model";
import { createTokenProvider } from "../../quota/token-provider";

const makePayload = () => ({
  observedAt: "2025-01-01T00:00:00.000Z",
  anyLimitReached: false,
  fiveHourLimitReached: false,
  weeklyLimitReached: false,
  usage: {
    fiveHour: {
      windowStart: "2025-01-01T00:00:00.000Z",
      windowEnd: "2025-01-01T05:00:00.000Z",
      secondsUntilReset: 123,
      requestCount: 42,
      estimatedCostUsdUsed: 1.25,
      costUsdLimit: 10,
      costUsdRemaining: 8.75,
      percentUsed: 12.5,
      limitReached: false,
    },
    weekly: {
      windowStart: "2025-01-01T00:00:00.000Z",
      windowEnd: "2025-01-08T00:00:00.000Z",
      secondsUntilReset: 999,
      requestCount: 420,
      estimatedCostUsdUsed: 12.5,
      costUsdLimit: 100,
      costUsdRemaining: 87.5,
      percentUsed: 12.5,
      limitReached: false,
    },
  },
});

const makeSecretStore = (token: string | undefined) => ({
  getToken: async () => token,
  setToken: async () => undefined,
  clearToken: async () => undefined,
});

const makeTokenProvider = (token: string | undefined) => ({
  getToken: async () => token,
});

suite("Quota API parsing", () => {
  test("accepts a valid payload", () => {
    const parsed = parseQuotaApiResponse(makePayload());
    assert.equal(parsed.usage.fiveHour.requestCount, 42);
  });

  test("rejects invalid payloads", () => {
    const bad = makePayload();
    // @ts-expect-error - invalid schema for test
    bad.usage.fiveHour.requestCount = "nope";
    assert.throws(() => parseQuotaApiResponse(bad));
  });
});

suite("Quota client error mapping", () => {
  const originalFetch = globalThis.fetch;

  suiteTeardown(() => {
    globalThis.fetch = originalFetch;
  });

  test("throws auth error when token missing", async () => {
    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider(undefined),
    });

    try {
      await (client as unknown as { fetchQuota: () => Promise<unknown> }).fetchQuota();
      assert.fail("Expected fetchQuota to throw");
    } catch (error) {
      assert.ok(error instanceof QuotaClientError);
      assert.equal(error.type, "auth");
    }
  });

  test("throws transport error on non-200 response", async () => {
    globalThis.fetch = async () =>
      ({
        ok: false,
        status: 500,
      }) as Response;

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("token"),
    });

    try {
      await (client as unknown as { fetchQuota: () => Promise<unknown> }).fetchQuota();
      assert.fail("Expected fetchQuota to throw");
    } catch (error) {
      assert.ok(error instanceof QuotaClientError);
      assert.equal(error.type, "transport");
    }
  });

  test("throws schema error on invalid json", async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error("bad json");
        },
      }) as unknown as Response;

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("token"),
    });

    try {
      await (client as unknown as { fetchQuota: () => Promise<unknown> }).fetchQuota();
      assert.fail("Expected fetchQuota to throw");
    } catch (error) {
      assert.ok(error instanceof QuotaClientError);
      assert.equal(error.type, "schema");
    }
  });

  test("retries transport failures before succeeding", async () => {
    let attempts = 0;
    globalThis.fetch = async () => {
      attempts += 1;
      if (attempts < 3) {
        return {
          ok: false,
          status: 502,
        } as Response;
      }

      return {
        ok: true,
        status: 200,
        json: async () => makePayload(),
      } as unknown as Response;
    };

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("token"),
    });
    const snapshot = await client.getQuotaSnapshot();

    assert.equal(snapshot.state, "ok");
    assert.equal(attempts, 3);
  });

  test("uses custom endpoint when configured", async () => {
    let requestedUrl: string | undefined;
    globalThis.fetch = async (input: string | URL | Request) => {
      requestedUrl = typeof input === "string" ? input : input.toString();
      return {
        ok: true,
        status: 200,
        json: async () => makePayload(),
      } as unknown as Response;
    };

    const client = createQuotaClient({
      apiEndpoint: "https://custom.example.com/quota",
      tokenProvider: makeTokenProvider("token"),
    });

    await (client as unknown as { fetchQuota: () => Promise<unknown> }).fetchQuota();
    assert.equal(requestedUrl, "https://custom.example.com/quota");
  });
});

suite("Token source selection", () => {
  test("prefers settings token over environment when configured", async () => {
    const provider = createTokenProvider({
      secretStore: makeSecretStore("secret-token"),
      tokenSource: "settings",
      getSettingsToken: () => "settings-token",
      getEnvToken: () => "env-token",
    });

    assert.equal(await provider.getToken(), "settings-token");
  });

  test("does not fallback to settings/env when secret storage is selected", async () => {
    const provider = createTokenProvider({
      secretStore: makeSecretStore(undefined),
      tokenSource: "secretStorage",
      getSettingsToken: () => "settings-token",
      getEnvToken: () => "env-token",
    });

    assert.equal(await provider.getToken(), undefined);
  });
});
