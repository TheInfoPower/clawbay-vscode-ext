# SYSTEM MAP: clawbay-vscode-ext

Date: 2026-04-01

## Tech Stack
- Language: TypeScript (extension source in `src/`, compiled to `out/`) (`package.json`:1-104).
- Runtime: VS Code Extension Host (`package.json`:13-22).
- Testing: Mocha via `@vscode/test-electron` (`package.json`:83-96).
- Packaging: `vsce` (`package.json`:79-87, 93).
- Validation: Zod schemas for API responses (`src/quota/model.ts`:1-56).

## Directory Structure
- `src/` — extension source code (commands, auth, quota client, UI).
- `out/` — compiled JS output (main entry: `out/extension.js`, `package.json`:22).
- `docs/` — release checklist (`docs/release-checklist.md`).
- `plans/` — planning artifacts.
- Root assets: `icon.png`, `icon.svg`.

## Entry Points
- Extension activation: `activate()` in `src/extension.ts`:25-91.
- Commands registration: `src/extension.ts`:80-87 with command IDs from `src/config/settings.ts`:4-10.

## Architecture Pattern
- Layered extension flow: activation → command handlers → refresh scheduler → quota client → status bar UI.
- Data flow: refresh event triggers quota fetch → `QuotaClient` parses response → `QuotaStatusBar` renders status.
  - Refresh handler: `src/commands/refresh.ts`:20-56.
  - Scheduler: `src/refresh/scheduler.ts`:16-105.
  - Quota client: `src/quota/client.ts`:106-205.
  - Status bar renderer: `src/ui/status-bar.ts`:4-80.

## Key Conventions
- Config/commands centralized in `src/config/settings.ts`:3-61.
- API response shape enforced via Zod schemas in `src/quota/model.ts`:10-56.
- Auth/token operations isolated in `src/auth/auth-manager.ts`:1-19 and `src/auth/secret-store.ts` (SecretStorage adapter).

## External Dependencies
- Clawbay Quota API endpoint configured via setting/env (`src/config/settings.ts`:55-60).
- VS Code SecretStorage for token persistence (`src/auth/secret-store.ts`).

## Complexity Hotspots
1. Quota client retry + abort handling (`src/quota/client.ts`:37-187).
2. Refresh scheduling with in-flight + debounce coordination (`src/refresh/scheduler.ts`:16-105).

## Risk Areas
1. API response schema drift could surface as `schema` errors (`src/quota/client.ts`:133-138, `src/quota/model.ts`:22-56).
2. Refresh interval set to 0 disables auto-refresh (intentional) — UI relies on manual refresh (`src/config/settings.ts`:43-52).

## Testing Status
- Extension command registration and quota client tests in `src/test/suite` (Mocha). (`package.json`:83-86).
