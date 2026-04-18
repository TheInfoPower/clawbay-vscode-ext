## Why

The extension currently loses login state across sessions/workspace changes for users, and older packaged builds surface fragile local placeholder-rendering errors. We need stable authentication persistence tied to user-level VS Code settings so users remain logged in and can move across repositories without re-entering their API key.

## What Changes

- Add global user-setting token persistence under `clawbayQuota.apiToken` and make it the primary auth source.
- Add one-time migration on activation from legacy SecretStorage token to user settings.
- Update auth/token provider flow to read/write/clear user settings, while preserving command behavior (`Login`, `Set Token`, `Logout`).
- Prefer resilient startup/refresh behavior that avoids legacy placeholder-rendering failure patterns.
- Update tests and docs to reflect the new storage model and migration behavior.

## Capabilities

### New Capabilities
- `user-settings-token-persistence`: Persist Clawbay API token in global VS Code user settings with migration from legacy secret storage.

### Modified Capabilities
- None.

## Impact

- Affected code: auth storage wiring, token provider, activation/migration path, sign-in/sign-out flows, tests, docs, and extension configuration schema.
- API/system impact: adds a new extension setting key (`clawbayQuota.apiToken`) and changes token persistence backend from SecretStorage to settings.
- Compatibility: includes backward-compatible migration for existing users with tokens in SecretStorage.
