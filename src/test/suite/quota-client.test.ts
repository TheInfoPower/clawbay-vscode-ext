import * as assert from "assert";
import { getTokenFormatGuidance } from "../../auth/token-format";
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

const makeTokenStore = (token: string | undefined) => ({
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

  test("accepts numeric fields provided as strings", () => {
    const payload = makePayload();
    payload.usage.fiveHour.percentUsed = "12.5" as unknown as number;
    payload.usage.weekly.costUsdLimit = "100" as unknown as number;

    const parsed = parseQuotaApiResponse(payload);
    assert.equal(parsed.usage.fiveHour.percentUsed, 12.5);
    assert.equal(parsed.usage.weekly.costUsdLimit, 100);
  });

  test("normalizes wrapped data payload shape", () => {
    const wrapped = {
      data: {
        observed_at: "2025-01-01T00:00:00.000Z",
        usage: {
          fiveHour: {
            window_start: "2025-01-01T00:00:00.000Z",
            window_end: "2025-01-01T05:00:00.000Z",
            seconds_until_reset: "123",
            request_count: "42",
            estimated_cost_usd_used: "1.25",
            cost_usd_limit: "10",
            cost_usd_remaining: "8.75",
            percent_used: "12.5",
            limit_reached: false,
          },
          weekly: {
            window_start: "2025-01-01T00:00:00.000Z",
            window_end: "2025-01-08T00:00:00.000Z",
            seconds_until_reset: "999",
            request_count: "420",
            estimated_cost_usd_used: "12.5",
            cost_usd_limit: "100",
            cost_usd_remaining: "87.5",
            percent_used: "12.5",
            limit_reached: false,
          },
        },
      },
    };

    const parsed = parseQuotaApiResponse(wrapped);
    assert.equal(parsed.observedAt, "2025-01-01T00:00:00.000Z");
    assert.equal(parsed.usage.fiveHour.requestCount, 42);
    assert.equal(parsed.usage.weekly.percentUsed, 12.5);
  });

  test("normalizes rate_limit window payload shape", () => {
    const payload = {
      plan_type: "pro",
      rate_limit: {
        allowed: true,
        limit_reached: false,
        primary_window: {
          used_percent: 14,
          limit_window_seconds: 18000,
          reset_after_seconds: 16731,
          reset_at: 1776492000,
        },
        secondary_window: {
          used_percent: 34,
          limit_window_seconds: 604800,
          reset_after_seconds: 167931,
          reset_at: 1776643200,
        },
      },
      credits: {
        has_credits: false,
        unlimited: false,
        balance: null,
      },
      additional_rate_limits: [],
    };

    const parsed = parseQuotaApiResponse(payload);
    assert.equal(parsed.anyLimitReached, false);
    assert.equal(parsed.usage.fiveHour.percentUsed, 14);
    assert.equal(parsed.usage.weekly.percentUsed, 34);
    assert.equal(parsed.usage.fiveHour.costUsdLimit, 100);
    assert.equal(parsed.usage.weekly.costUsdRemaining, 66);
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
      await (client as unknown as { fetchQuota: (context: { correlationId: string }) => Promise<unknown> })
        .fetchQuota({ correlationId: "test-auth" });
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
      await (client as unknown as { fetchQuota: (context: { correlationId: string }) => Promise<unknown> })
        .fetchQuota({ correlationId: "test-transport" });
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
      await (client as unknown as { fetchQuota: (context: { correlationId: string }) => Promise<unknown> })
        .fetchQuota({ correlationId: "test-schema" });
      assert.fail("Expected fetchQuota to throw");
    } catch (error) {
      assert.ok(error instanceof QuotaClientError);
      assert.equal(error.type, "schema");
    }
  });

  test("maps error envelope in 200 payload to auth snapshot", async () => {
    globalThis.fetch = async () =>
      ({
        ok: true,
        status: 200,
        json: async () => ({
          error: "invalid api key",
          code: "invalid_api_key",
        }),
      }) as unknown as Response;

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("ca_v1.token"),
      retryDelaysMs: [0],
    });

    const snapshot = await client.getQuotaSnapshot({ correlationId: "test-error-envelope" });
    assert.equal(snapshot.state, "unauthenticated");
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
      retryDelaysMs: [0, 0, 0],
    });
    const snapshot = await client.getQuotaSnapshot({ correlationId: "test-retry" });

    assert.equal(snapshot.state, "authenticated-with-quota");
    assert.equal(attempts, 3);
  });

  test("times out and surfaces transport error", async () => {
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            const error = new Error("aborted");
            (error as { name?: string }).name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      });

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("token"),
      retryDelaysMs: [0],
      timeoutMs: 5,
    });

    try {
      await (client as unknown as { fetchQuota: (context: { correlationId: string }) => Promise<unknown> })
        .fetchQuota({ correlationId: "test-timeout" });
      assert.fail("Expected fetchQuota to throw");
    } catch (error) {
      assert.ok(error instanceof QuotaClientError);
      assert.equal(error.type, "transport");
    }
  });

  test("stops retries immediately when aborted before fetch", async () => {
    const controller = new AbortController();
    controller.abort();
    let attempts = 0;

    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      attempts += 1;
      if (init?.signal?.aborted) {
        const error = new Error("aborted");
        (error as { name?: string }).name = "AbortError";
        throw error;
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
      retryDelaysMs: [0, 0, 0],
    });

    const snapshot = await client.getQuotaSnapshot({
      correlationId: "test-abort-pre",
      signal: controller.signal,
    });

    assert.equal(snapshot.state, "transient-failure");
    assert.equal(attempts, 0);
  });

  test("stops retries when aborted immediately after invocation", async () => {
    const controller = new AbortController();
    let attempts = 0;
    let resolveToken: ((token: string) => void) | undefined;
    const tokenReady = new Promise<string>((resolve) => {
      resolveToken = resolve;
    });

    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      attempts += 1;
      if (init?.signal?.aborted) {
        const error = new Error("aborted");
        (error as { name?: string }).name = "AbortError";
        throw error;
      }
      return {
        ok: true,
        status: 200,
        json: async () => makePayload(),
      } as unknown as Response;
    };

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: {
        getToken: async () => tokenReady,
      },
      retryDelaysMs: [0, 0, 0],
    });

    const snapshotPromise = client.getQuotaSnapshot({
      correlationId: "test-abort-post",
      signal: controller.signal,
    });

    controller.abort();
    if (!resolveToken) {
      throw new Error("Token resolver not initialized");
    }
    resolveToken("token");

    const snapshot = await snapshotPromise;
    assert.equal(snapshot.state, "transient-failure");
    assert.equal(attempts, 0);
  });

  test("stops retries after aborting an in-flight fetch", async () => {
    const controller = new AbortController();
    let attempts = 0;
    let resolveStarted: (() => void) | null = null;
    const fetchStarted = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });

    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      attempts += 1;
      resolveStarted?.();
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          "abort",
          () => {
            const error = new Error("aborted");
            (error as { name?: string }).name = "AbortError";
            reject(error);
          },
          { once: true }
        );
      });
    };

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("token"),
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 50,
    });

    const snapshotPromise = client.getQuotaSnapshot({
      correlationId: "test-abort-inflight",
      signal: controller.signal,
    });

    await fetchStarted;
    controller.abort();

    const snapshot = await snapshotPromise;
    assert.equal(snapshot.state, "transient-failure");
    assert.equal(attempts, 1);
  });

  test("recovers after timeout retries", async () => {
    let attempts = 0;
    globalThis.fetch = async (_input: string | URL | Request, init?: RequestInit) => {
      attempts += 1;
      if (attempts < 3) {
        return new Promise((_resolve, reject) => {
          init?.signal?.addEventListener(
            "abort",
            () => {
              const error = new Error("aborted");
              (error as { name?: string }).name = "AbortError";
              reject(error);
            },
            { once: true }
          );
        });
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
      retryDelaysMs: [0, 0, 0],
      timeoutMs: 5,
    });

    const snapshot = await client.getQuotaSnapshot({ correlationId: "test-recovery" });

    assert.equal(snapshot.state, "authenticated-with-quota");
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

    await (client as unknown as { fetchQuota: (context: { correlationId: string }) => Promise<unknown> })
      .fetchQuota({ correlationId: "test-endpoint" });
    assert.equal(requestedUrl, "https://custom.example.com/quota");
  });
});

suite("Token source selection", () => {
  test("reads token from settings-backed store", async () => {
    const provider = createTokenProvider({
      tokenStore: makeTokenStore(undefined),
    });

    assert.equal(await provider.getToken(), undefined);
  });

  test("returns stored token when present", async () => {
    const provider = createTokenProvider({
      tokenStore: makeTokenStore("secret-token"),
    });

    assert.equal(await provider.getToken(), "secret-token");
  });
});

suite("Token format guidance", () => {
  test("allows Clawbay ca keys", () => {
    const guidance = getTokenFormatGuidance("ca_v1.abc123");
    assert.equal(guidance, undefined);
  });

  test("allows sk keys", () => {
    const guidance = getTokenFormatGuidance("sk-proj-abc123");
    assert.equal(guidance, undefined);
  });

  test("does not block ca token format before fetch", async () => {
    let attemptedFetch = false;
    globalThis.fetch = async () => {
      attemptedFetch = true;
      return {
        ok: true,
        status: 200,
        json: async () => makePayload(),
      } as unknown as Response;
    };

    const client = createQuotaClient({
      apiEndpoint: "https://example.com/quota",
      tokenProvider: makeTokenProvider("ca_v1.bad"),
      retryDelaysMs: [0],
    });

    const snapshot = await client.getQuotaSnapshot({ correlationId: "test-token-format" });
    assert.equal(snapshot.state, "authenticated-with-quota");
    assert.equal(attemptedFetch, true);
  });
});
