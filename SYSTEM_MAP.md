# SYSTEM MAP: clawbay-vscode-ext

Date: 2026-04-18

## Tech Stack
- Language: TypeScript (extension source in `src/`, compiled to `out/`).
- Runtime: VS Code Extension Host (`package.json`).
- Testing: Mocha via `@vscode/test-electron`.
- Packaging: `vsce`.
- Validation: Zod schemas for API responses (`src/quota/model.ts`).

## Directory Structure
- `src/` - extension source code (commands, auth, quota client, UI).
- `src/auth/` - auth manager, token store, token format, migration helpers.
- `src/quota/` - quota client, model parsing, token provider/source.
- `src/test/suite/` - extension + client + auth/token migration tests.
- `docs/` - release checklist.
- `out/` - compiled JS output (main entry: `out/extension.js`).

## Entry Points
- Extension activation: `activate()` in `src/extension.ts`.
- Command registration + wiring: `src/extension.ts` and `src/config/settings.ts`.

## Architecture Pattern
- Layered extension flow: activation -> command handlers -> refresh scheduler -> quota client -> status bar UI.
- Auth pipeline now prioritizes settings-backed token store with one-time legacy SecretStorage migration.
- Data flow: refresh event triggers quota fetch -> `QuotaClient` parses response -> `QuotaStatusBar` renders status.

## Key Conventions
- Config and command IDs centralized in `src/config/settings.ts`.
- API response shape enforced via Zod schemas in `src/quota/model.ts`.
- Auth/token operations isolated under `src/auth/` and consumed via token provider/source abstraction.

## Recent Changes Since 2026-04-01
- Implemented legacy token migration to a settings-backed token store (`src/auth/migration.ts`, `src/auth/token-store.ts`).
- Added token format validation helpers and token source/provider modules (`src/auth/token-format.ts`, `src/quota/token-source.ts`, `src/quota/token-provider.ts`).
- Updated command handlers and refresh flow to use the new token management path.
- Added/updated tests for auth manager, command handlers, quota client, extension activation, and token migration.

## External Dependencies
- Clawbay Quota API endpoint configured via setting/env (`src/config/settings.ts`).
- VS Code APIs for settings + SecretStorage compatibility path.

## Complexity Hotspots
1. Token-source resolution and migration sequencing across settings + legacy SecretStorage paths.
2. Quota client retry/timeout/error normalization behavior.
3. Refresh scheduling with in-flight/debounce coordination.

## Risk Areas
1. Token migration regressions can cause auth-required UI loops after upgrade.
2. API schema drift can surface as `schema` errors in client parsing.
3. Refresh interval `0` intentionally disables auto-refresh; UX then depends on manual refresh.

## Testing Status
- Mocha suites cover extension activation, command handlers, quota client, auth manager, and token migration (`src/test/suite`).
