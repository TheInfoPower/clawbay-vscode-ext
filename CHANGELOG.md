# Changelog

## 0.0.5

- Accepted Clawbay `ca_*` tokens in login/token validation.
- Fixed quota parsing for current Clawbay `rate_limit` response shape (`primary_window`/`secondary_window`).
- Improved error mapping to surface server auth/rate-limit envelopes instead of generic unexpected-response failures.
- Kept codex-auth default endpoint and legacy format compatibility for reliable quota reads.

## 0.0.4

- Switched token persistence to global user settings (`clawbayQuota.apiToken`) to stay logged in across sessions and repository changes.
- Added one-time migration from legacy SecretStorage token to user settings at activation.
- Kept login/logout/token commands and status behavior intact with updated storage backend.

## 0.0.3

- Added status bar quota display with hover breakdown and refresh affordance.
- Added secure token storage via VS Code SecretStorage with login/logout commands.
- Added typed quota client with retry handling and explicit error states.
