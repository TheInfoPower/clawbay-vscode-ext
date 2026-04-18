import { createCorrelationId, logEvent } from "../telemetry/logging";
import type { RefreshInvocationOptions } from "../commands/refresh";

export interface RefreshSchedulerOptions {
  onRefresh: (options?: RefreshInvocationOptions) => Promise<void>;
  debounceMs?: number;
}

export interface RefreshScheduler {
  requestRefresh: (reason: string) => Promise<void>;
  dispose: () => void;
}

const DEFAULT_DEBOUNCE_MS = 200;

export function createRefreshScheduler(options: RefreshSchedulerOptions): RefreshScheduler {
  const debounceMs = options.debounceMs ?? DEFAULT_DEBOUNCE_MS;
  let inFlight: Promise<void> | null = null;
  let inFlightController: AbortController | null = null;
  let timer: NodeJS.Timeout | null = null;
  let scheduled: Promise<void> | null = null;
  let scheduledResolve: (() => void) | null = null;
  let scheduledReject: ((error: unknown) => void) | null = null;

  const runRefresh = async (reason: string): Promise<void> => {
    if (inFlight) {
      return inFlight;
    }

    const correlationId = createCorrelationId();
    logEvent("quota.refresh.queued", { correlationId, reason });

    inFlightController = new AbortController();

    const promise = options
      .onRefresh({ correlationId, signal: inFlightController.signal })
      .catch((error) => {
        logEvent("quota.refresh.error", { correlationId, reason, error: String(error) });
        throw error;
      })
      .finally(() => {
        inFlight = null;
        inFlightController = null;
      });

    inFlight = promise;
    return promise;
  };

  const scheduleRefresh = (reason: string): Promise<void> => {
    if (scheduled) {
      return scheduled;
    }

    scheduled = new Promise<void>((resolve, reject) => {
      scheduledResolve = resolve;
      scheduledReject = reject;
    });

    timer = setTimeout(async () => {
      const resolve = scheduledResolve;
      const reject = scheduledReject;
      scheduled = null;
      scheduledResolve = null;
      scheduledReject = null;
      timer = null;

      try {
        await runRefresh(reason);
        resolve?.();
      } catch (error) {
        reject?.(error);
      }
    }, debounceMs);

    return scheduled;
  };

  return {
    requestRefresh: (reason: string): Promise<void> => {
      if (inFlight) {
        return inFlight;
      }
      if (debounceMs <= 0) {
        return runRefresh(reason);
      }
      return scheduleRefresh(reason);
    },
    dispose: () => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      if (inFlightController) {
        inFlightController.abort();
        inFlightController = null;
      }
      if (scheduledReject) {
        scheduledReject(new Error("Refresh scheduler disposed"));
      }
      scheduled = null;
      scheduledResolve = null;
      scheduledReject = null;
    },
  };
}
