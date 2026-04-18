import { logEvent } from "../telemetry/logging";

export interface RetryContext {
  onRetry: () => Promise<void>;
}

export function createRetryHandler(context: RetryContext): () => Promise<void> {
  return async (): Promise<void> => {
    logEvent("quota.retry.requested");
    await context.onRetry();
  };
}
