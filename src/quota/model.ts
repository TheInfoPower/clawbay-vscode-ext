export type QuotaState = "loading" | "unauthenticated" | "stubbed" | "error";

export interface QuotaSnapshot {
  state: QuotaState;
  label: string;
  detail: string;
  updatedAtIso: string;
}

export function makeSnapshot(state: QuotaState, label: string, detail: string): QuotaSnapshot {
  return {
    state,
    label,
    detail,
    updatedAtIso: new Date().toISOString()
  };
}
