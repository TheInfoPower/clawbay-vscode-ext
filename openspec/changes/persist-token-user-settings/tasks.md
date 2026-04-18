## 1. Configuration and Storage Wiring

- [x] 1.1 Add `clawbayQuota.apiToken` to extension configuration contributions in `package.json` with clear description of global persistence behavior.
- [x] 1.2 Add settings helpers in `src/config/settings.ts` to read, write, and clear the token via `ConfigurationTarget.Global`.
- [x] 1.3 Replace SecretStorage-backed token reads/writes in auth wiring with settings-backed storage usage.

## 2. Migration and Runtime Behavior

- [x] 2.1 Implement one-time activation migration from legacy SecretStorage token to global settings token.
- [x] 2.2 Enforce migration precedence: settings token wins when both settings and legacy secret tokens exist.
- [x] 2.3 Ensure login/set-token/logout/auth-status command handlers keep current UX while operating on settings-backed token persistence.

## 3. Verification and Docs

- [x] 3.1 Update tests to cover settings token reads/writes, migration behavior, and sign-out clearing.
- [x] 3.2 Update README and changelog language from SecretStorage-only persistence to user-settings persistence + migration.
- [x] 3.3 Build, run test suite, and package a fresh VSIX to validate the release artifact path.
