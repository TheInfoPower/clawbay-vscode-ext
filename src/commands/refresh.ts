import type { QuotaClient, QuotaClientRequestContext } from "../quota/client";
import type { QuotaSnapshot } from "../quota/model";
import type { QuotaStatusBar } from "../ui/status-bar";
import { createCorrelationId, logEvent } from "../telemetry/logging";

export interface RefreshContext {
  mode?: "placeholder" | "live";
  quotaClient?: QuotaClient;
  statusBar: QuotaStatusBar;
  onSnapshot?: (snapshot: QuotaSnapshot) => void;
  onLoading?: () => void;
  onError?: (error: unknown) => void;
}

export interface RefreshInvocationOptions {
  correlationId?: string;
  signal?: AbortSignal;
}

export function createRefreshHandler(
  context: RefreshContext
): (options?: RefreshInvocationOptions) => Promise<void> {
  return async (options?: RefreshInvocationOptions): Promise<void> => {
    const mode = context.mode ?? "live";
    const correlationId = options?.correlationId ?? createCorrelationId();

    if (mode === "placeholder") {
      context.statusBar.renderPlaceholder();
      logEvent("quota.refresh.placeholder", { correlationId });
      return;
    }

    if (!context.quotaClient) {
      const error = new Error("Quota client unavailable");
      context.statusBar.renderError("Quota client unavailable.");
      context.onError?.(error);
      logEvent("quota.refresh.failed", { error: error.message, correlationId });
      return;
    }

    context.onLoading?.();
    context.statusBar.renderLoading();
    logEvent("quota.refresh.started", { correlationId });

    try {
      const snapshot = await context.quotaClient.getQuotaSnapshot({
        correlationId,
        signal: options?.signal,
      } satisfies QuotaClientRequestContext);
      context.onSnapshot?.(snapshot);
      logEvent("quota.refresh.completed", { state: snapshot.state, correlationId });
    } catch (error) {
      context.onError?.(error);
      logEvent("quota.refresh.failed", { error: String(error), correlationId });
    }
  };
}
